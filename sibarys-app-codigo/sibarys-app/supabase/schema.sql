-- =====================================================================
-- Sibarys — Esquema de base de datos (Supabase / PostgreSQL) — EN ESPAÑOL
-- Ejecutar completo en: Supabase -> SQL Editor -> New query -> Run
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. PERFILES  (extiende auth.users con rol y nombre)
-- =====================================================================
create table if not exists public.perfiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text,
  rol             text not null default 'chofer' check (rol in ('chofer','admin')),
  activo          boolean not null default true,
  creado_en       timestamptz not null default now()
);

-- Crea automáticamente un perfil cuando se registra un usuario
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre_completo', new.email),
    coalesce(new.raw_user_meta_data->>'rol', 'chofer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_nuevo_usuario on auth.users;
create trigger trg_nuevo_usuario
  after insert on auth.users
  for each row execute function public.manejar_nuevo_usuario();

-- Helper: ¿el usuario actual es admin?
create or replace function public.es_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'admin'
  );
$$;

-- =====================================================================
-- 2. TIPOS DE COMBUSTIBLE  (catálogo: Súper 95, Súper 97, Grid 93, Diésel, GNC…)
-- =====================================================================
create table if not exists public.tipos_combustible (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null unique,          -- ej. "Nafta Súper 95"
  octanaje   int,                            -- ej. 95, 97 (opcional)
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

-- =====================================================================
-- 3. PRECIOS DE COMBUSTIBLE  (historial de tarifas por fecha)
--    Cada fila = precio de un tipo a partir de 'vigente_desde'.
--    El precio actual es el de mayor 'vigente_desde' <= hoy.
-- =====================================================================
create table if not exists public.precios_combustible (
  id                   uuid primary key default gen_random_uuid(),
  tipo_combustible_id  uuid not null references public.tipos_combustible(id) on delete cascade,
  precio               numeric(10,2) not null check (precio >= 0),
  vigente_desde        date not null default current_date,
  creado_por           uuid references public.perfiles(id),
  creado_en            timestamptz not null default now(),
  unique (tipo_combustible_id, vigente_desde)
);

create index if not exists idx_precios_tipo_fecha
  on public.precios_combustible(tipo_combustible_id, vigente_desde desc);

-- Vista: precio vigente (más reciente) por tipo de combustible
create or replace view public.precios_vigentes as
select distinct on (pc.tipo_combustible_id)
  pc.tipo_combustible_id,
  tc.nombre as tipo_nombre,
  pc.precio,
  pc.vigente_desde
from public.precios_combustible pc
join public.tipos_combustible tc on tc.id = pc.tipo_combustible_id
where pc.vigente_desde <= current_date
order by pc.tipo_combustible_id, pc.vigente_desde desc;
alter view public.precios_vigentes set (security_invoker = on);

-- =====================================================================
-- 4. VEHICULOS  (flota)
-- =====================================================================
create table if not exists public.vehiculos (
  id         uuid primary key default gen_random_uuid(),
  patente    text not null unique,
  nombre     text not null,                 -- alias, ej. "Onix Joy 1"
  marca      text,
  modelo     text,
  anio       int,
  activo     boolean not null default true,
  creado_en  timestamptz not null default now()
);

-- 4.b Combustibles que puede usar cada vehículo (muchos a muchos)
create table if not exists public.vehiculo_combustibles (
  id                   uuid primary key default gen_random_uuid(),
  vehiculo_id          uuid not null references public.vehiculos(id) on delete cascade,
  tipo_combustible_id  uuid not null references public.tipos_combustible(id) on delete cascade,
  unique (vehiculo_id, tipo_combustible_id)
);

-- =====================================================================
-- 5. ASIGNACIONES  (qué chofer maneja qué vehículo)
-- =====================================================================
create table if not exists public.asignaciones (
  id           uuid primary key default gen_random_uuid(),
  vehiculo_id  uuid not null references public.vehiculos(id) on delete cascade,
  chofer_id    uuid not null references public.perfiles(id) on delete cascade,
  asignado_en  timestamptz not null default now(),
  activo       boolean not null default true
);

-- Un vehículo no puede asignarse dos veces al mismo chofer de forma activa
create unique index if not exists uq_asignacion_activa
  on public.asignaciones(vehiculo_id, chofer_id)
  where activo;

create index if not exists idx_asignaciones_chofer on public.asignaciones(chofer_id) where activo;

-- =====================================================================
-- 6. CARGAS  (cada carga de combustible: odómetro + litros)
-- =====================================================================
create table if not exists public.cargas (
  id                   uuid primary key default gen_random_uuid(),
  vehiculo_id          uuid not null references public.vehiculos(id) on delete cascade,
  chofer_id            uuid not null references public.perfiles(id) on delete restrict,
  tipo_combustible_id  uuid references public.tipos_combustible(id) on delete set null,
  registrado_en        timestamptz not null default now(),
  odometro_km          numeric(10,1) not null check (odometro_km >= 0),
  litros               numeric(8,2)  not null check (litros > 0),
  precio_litro         numeric(10,2),
  costo_total          numeric(12,2),
  tanque_lleno         boolean not null default true,
  estacion             text,
  notas                text,
  creado_en            timestamptz not null default now()
);

create index if not exists idx_cargas_vehiculo on public.cargas(vehiculo_id, odometro_km);
create index if not exists idx_cargas_chofer    on public.cargas(chofer_id);
create index if not exists idx_cargas_fecha      on public.cargas(registrado_en);

-- Completa costo_total si vino precio y no vino total
create or replace function public.calcular_costo_total()
returns trigger language plpgsql as $$
begin
  if new.costo_total is null and new.precio_litro is not null then
    new.costo_total := round(new.precio_litro * new.litros, 2);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_costo_total on public.cargas;
create trigger trg_costo_total
  before insert or update on public.cargas
  for each row execute function public.calcular_costo_total();

-- =====================================================================
-- 7. VISTA DE CONSUMO  (tanque a tanque)
-- =====================================================================
create or replace view public.consumo as
select
  c.id,
  c.vehiculo_id,
  v.patente,
  v.nombre        as vehiculo_nombre,
  c.chofer_id,
  p.nombre_completo as chofer_nombre,
  c.tipo_combustible_id,
  tc.nombre       as combustible_nombre,
  c.registrado_en,
  c.odometro_km,
  c.litros,
  c.precio_litro,
  c.costo_total,
  c.tanque_lleno,
  c.estacion,
  lag(c.odometro_km) over w as odometro_anterior,
  (c.odometro_km - lag(c.odometro_km) over w) as distancia_km,
  case
    when (c.odometro_km - lag(c.odometro_km) over w) > 0 and c.litros > 0
    then round((c.odometro_km - lag(c.odometro_km) over w) / c.litros, 2)
  end as km_por_litro,
  case
    when (c.odometro_km - lag(c.odometro_km) over w) > 0 and c.litros > 0
    then round(100 * c.litros / (c.odometro_km - lag(c.odometro_km) over w), 2)
  end as litros_por_100km
from public.cargas c
join public.vehiculos v on v.id = c.vehiculo_id
left join public.perfiles p on p.id = c.chofer_id
left join public.tipos_combustible tc on tc.id = c.tipo_combustible_id
window w as (partition by c.vehiculo_id order by c.odometro_km, c.registrado_en);
alter view public.consumo set (security_invoker = on);

-- =====================================================================
-- 8. ROW LEVEL SECURITY
-- =====================================================================
alter table public.perfiles              enable row level security;
alter table public.tipos_combustible     enable row level security;
alter table public.precios_combustible   enable row level security;
alter table public.vehiculos             enable row level security;
alter table public.vehiculo_combustibles enable row level security;
alter table public.asignaciones          enable row level security;
alter table public.cargas                enable row level security;

-- ---- perfiles ----
drop policy if exists perfiles_select on public.perfiles;
create policy perfiles_select on public.perfiles
  for select using (id = auth.uid() or public.es_admin());

drop policy if exists perfiles_update_self on public.perfiles;
create policy perfiles_update_self on public.perfiles
  for update using (id = auth.uid() or public.es_admin());

drop policy if exists perfiles_admin_all on public.perfiles;
create policy perfiles_admin_all on public.perfiles
  for all using (public.es_admin()) with check (public.es_admin());

-- ---- tipos_combustible: todos leen, admin escribe ----
drop policy if exists tipos_select on public.tipos_combustible;
create policy tipos_select on public.tipos_combustible
  for select to authenticated using (true);
drop policy if exists tipos_admin on public.tipos_combustible;
create policy tipos_admin on public.tipos_combustible
  for all using (public.es_admin()) with check (public.es_admin());

-- ---- precios_combustible: todos leen, admin escribe ----
drop policy if exists precios_select on public.precios_combustible;
create policy precios_select on public.precios_combustible
  for select to authenticated using (true);
drop policy if exists precios_admin on public.precios_combustible;
create policy precios_admin on public.precios_combustible
  for all using (public.es_admin()) with check (public.es_admin());

-- ---- vehiculos: todos leen, admin escribe ----
drop policy if exists vehiculos_select on public.vehiculos;
create policy vehiculos_select on public.vehiculos
  for select to authenticated using (true);
drop policy if exists vehiculos_admin on public.vehiculos;
create policy vehiculos_admin on public.vehiculos
  for all using (public.es_admin()) with check (public.es_admin());

-- ---- vehiculo_combustibles: todos leen, admin escribe ----
drop policy if exists vehcomb_select on public.vehiculo_combustibles;
create policy vehcomb_select on public.vehiculo_combustibles
  for select to authenticated using (true);
drop policy if exists vehcomb_admin on public.vehiculo_combustibles;
create policy vehcomb_admin on public.vehiculo_combustibles
  for all using (public.es_admin()) with check (public.es_admin());

-- ---- asignaciones: chofer ve las suyas, admin ve/gestiona todas ----
drop policy if exists asig_select on public.asignaciones;
create policy asig_select on public.asignaciones
  for select using (chofer_id = auth.uid() or public.es_admin());
drop policy if exists asig_admin on public.asignaciones;
create policy asig_admin on public.asignaciones
  for all using (public.es_admin()) with check (public.es_admin());

-- ---- cargas: chofer ve/inserta las suyas, admin todo ----
drop policy if exists cargas_select on public.cargas;
create policy cargas_select on public.cargas
  for select using (chofer_id = auth.uid() or public.es_admin());
drop policy if exists cargas_insert on public.cargas;
create policy cargas_insert on public.cargas
  for insert with check (chofer_id = auth.uid() or public.es_admin());
drop policy if exists cargas_update on public.cargas;
create policy cargas_update on public.cargas
  for update using (chofer_id = auth.uid() or public.es_admin());
drop policy if exists cargas_delete on public.cargas;
create policy cargas_delete on public.cargas
  for delete using (chofer_id = auth.uid() or public.es_admin());

-- =====================================================================
-- 9. DATOS INICIALES (opcional): tipos de combustible comunes
-- =====================================================================
insert into public.tipos_combustible (nombre, octanaje) values
  ('Nafta Súper 95', 95),
  ('Nafta Premium 97', 97),
  ('Nafta Grid 93', 93),
  ('Diésel', null),
  ('Diésel Premium', null),
  ('GNC', null)
on conflict (nombre) do nothing;

-- =====================================================================
-- 10. PROMOVER UN USUARIO A ADMIN (correr tras registrar tu usuario)
-- =====================================================================
-- update public.perfiles set rol = 'admin' where id = (
--   select id from auth.users where email = 'tu-email@sibarys.com'
-- );
