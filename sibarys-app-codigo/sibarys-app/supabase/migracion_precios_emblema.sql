-- =====================================================================
-- MIGRACIÓN: precios de referencia por emblema y estación obligatoria
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada. Se puede correr más de una vez.)
--
-- 1) Precio de referencia por emblema + tipo de combustible + fecha.
--    Lo carga administración y se usa SOLO para controlar lo que pagan
--    los choferes (no cambia cómo se carga ni el monto de la carga).
-- 2) Emblema en la carga, para cuando la estación no está en la lista
--    ("Otra estación"): el chofer elige el emblema y escribe el nombre.
-- =====================================================================

-- 1) Precios de referencia por emblema
create table if not exists public.precios_emblema (
  id                  uuid primary key default gen_random_uuid(),
  emblema_id          uuid not null references public.emblemas(id) on delete cascade,
  tipo_combustible_id uuid not null references public.tipos_combustible(id) on delete cascade,
  precio              numeric(10,2) not null check (precio > 0),
  vigente_desde       date not null default current_date,
  creado_por          uuid references public.perfiles(id) on delete set null,
  creado_en           timestamptz not null default now(),
  unique (emblema_id, tipo_combustible_id, vigente_desde)
);

create index if not exists idx_precios_emblema_busqueda
  on public.precios_emblema(emblema_id, tipo_combustible_id, vigente_desde desc);

alter table public.precios_emblema enable row level security;

drop policy if exists precios_emblema_admin on public.precios_emblema;
create policy precios_emblema_admin on public.precios_emblema
  for all using (public.es_admin()) with check (public.es_admin());

-- Permisos explícitos para la app (Supabase ya no los da solo en tablas nuevas)
grant select, insert, update, delete on public.precios_emblema to authenticated;

-- 2) Emblema de la carga cuando la estación no está en la lista
alter table public.cargas add column if not exists emblema_id uuid
  references public.emblemas(id) on delete set null;

-- 3) Que la app vea los cambios de inmediato
notify pgrst, 'reload schema';
