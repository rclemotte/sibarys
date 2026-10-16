-- =====================================================================
-- MIGRACIÓN: mantenimiento de vehículos
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada.)
--
-- Administración registra cada mantenimiento: fecha, km al hacerlo,
-- km del próximo y un texto libre con lo que se hizo. El km actual de
-- cada vehículo sale solo de su última carga de combustible.
-- =====================================================================

create table if not exists public.mantenimientos (
  id           uuid primary key default gen_random_uuid(),
  vehiculo_id  uuid not null references public.vehiculos(id) on delete cascade,
  fecha        date not null default current_date,
  km           numeric(10,1) not null check (km >= 0),
  km_proximo   numeric(10,1) not null,
  descripcion  text not null,
  creado_por   uuid references public.perfiles(id) on delete set null,
  creado_en    timestamptz not null default now(),
  check (km_proximo > km)
);

create index if not exists idx_mantenimientos_vehiculo
  on public.mantenimientos(vehiculo_id, fecha desc, creado_en desc);

alter table public.mantenimientos enable row level security;

drop policy if exists mant_admin on public.mantenimientos;
create policy mant_admin on public.mantenimientos
  for all using (public.es_admin()) with check (public.es_admin());

-- Estado de mantenimiento de cada vehículo: su km actual (última carga),
-- y su último mantenimiento registrado con el km del próximo.
create or replace view public.estado_mantenimiento as
select
  v.id      as vehiculo_id,
  v.nombre,
  v.patente,
  v.activo,
  (select max(c.odometro_km) from public.cargas c where c.vehiculo_id = v.id) as km_actual,
  m.fecha       as ultimo_fecha,
  m.km          as ultimo_km,
  m.km_proximo,
  m.descripcion as ultimo_descripcion
from public.vehiculos v
left join lateral (
  select * from public.mantenimientos mm
  where mm.vehiculo_id = v.id
  order by mm.fecha desc, mm.creado_en desc
  limit 1
) m on true;
alter view public.estado_mantenimiento set (security_invoker = on);
