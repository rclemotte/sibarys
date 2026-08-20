-- =====================================================================
-- MIGRACIÓN 02 — Empresas (alquiler), Emblemas + Estaciones de servicio,
--                capacidad de tanque, consumo asignado y estación en la carga.
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Es adicional al schema.sql; no borra nada de lo existente. Se puede
--  correr más de una vez sin romper: usa "if not exists" / "on conflict".)
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- 1. EMPRESAS  (catálogo de empresas de las que se ALQUILA un vehículo)
--    Ojo: es distinto del emblema de la nafta. Acá van agencias/rentadoras.
-- =====================================================================
create table if not exists public.empresas (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique,
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table public.empresas enable row level security;

drop policy if exists empresas_select on public.empresas;
create policy empresas_select on public.empresas
  for select to authenticated using (true);

drop policy if exists empresas_admin on public.empresas;
create policy empresas_admin on public.empresas
  for all using (public.es_admin()) with check (public.es_admin());

-- =====================================================================
-- 2. EMBLEMAS  (marca de la estación de nafta: Shell, YPF, Axion, Puma…)
--    El emblema es la "empresa madre"; cada estación es una sucursal.
-- =====================================================================
create table if not exists public.emblemas (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique,
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table public.emblemas enable row level security;

drop policy if exists emblemas_select on public.emblemas;
create policy emblemas_select on public.emblemas
  for select to authenticated using (true);

drop policy if exists emblemas_admin on public.emblemas;
create policy emblemas_admin on public.emblemas
  for all using (public.es_admin()) with check (public.es_admin());

insert into public.emblemas (nombre) values
  ('Shell'), ('YPF'), ('Axion'), ('Puma'), ('Gulf'), ('Blanca / Otra')
on conflict (nombre) do nothing;

-- =====================================================================
-- 3. ESTACIONES DE SERVICIO  (sucursal concreta de un emblema)
--    Ej.: "Curva Romero" · Luque · Emblema: Shell
-- =====================================================================
create table if not exists public.estaciones_servicio (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  localidad   text,
  emblema_id  uuid references public.emblemas(id) on delete set null,
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

create index if not exists idx_estaciones_emblema
  on public.estaciones_servicio(emblema_id);

alter table public.estaciones_servicio enable row level security;

drop policy if exists estaciones_select on public.estaciones_servicio;
create policy estaciones_select on public.estaciones_servicio
  for select to authenticated using (true);

drop policy if exists estaciones_admin on public.estaciones_servicio;
create policy estaciones_admin on public.estaciones_servicio
  for all using (public.es_admin()) with check (public.es_admin());

-- =====================================================================
-- 4. VEHÍCULOS — campos nuevos
--    - capacidad_tanque_litros: capacidad del tanque en litros
--    - es_alquilado + empresa_id: si es alquilado y de qué empresa
--    - consumo_promedio_asignado: valor de referencia (km/l) que el admin
--      tipea a mano; se usa para la alerta de consumo alto del chofer.
-- =====================================================================
alter table public.vehiculos
  add column if not exists capacidad_tanque_litros   numeric(7,2),
  add column if not exists es_alquilado              boolean not null default false,
  add column if not exists empresa_id                uuid references public.empresas(id) on delete set null,
  add column if not exists consumo_promedio_asignado numeric(6,2);

-- =====================================================================
-- 5. CARGAS — estación de servicio elegida (además del texto libre legacy)
-- =====================================================================
alter table public.cargas
  add column if not exists estacion_id uuid references public.estaciones_servicio(id) on delete set null;

create index if not exists idx_cargas_estacion on public.cargas(estacion_id);
