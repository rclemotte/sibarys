-- =====================================================================
-- MIGRACIÓN: tabla paramétrica de MARCAS de vehículos
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Es adicional al schema.sql; no borra nada de lo existente.)
-- =====================================================================

create table if not exists public.marcas (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null unique,
  activo    boolean not null default true,
  creado_en timestamptz not null default now()
);

alter table public.marcas enable row level security;

-- Todos los usuarios autenticados pueden leer las marcas (para el desplegable)
drop policy if exists marcas_select on public.marcas;
create policy marcas_select on public.marcas
  for select to authenticated using (true);

-- Solo admin puede crear/editar/borrar marcas
drop policy if exists marcas_admin on public.marcas;
create policy marcas_admin on public.marcas
  for all using (public.es_admin()) with check (public.es_admin());

-- Marcas iniciales (podés agregar/quitar después desde la app)
insert into public.marcas (nombre) values
  ('Chevrolet'), ('Citroën'), ('Fiat'), ('Ford'), ('Honda'), ('Hyundai'),
  ('Iveco'), ('Jeep'), ('Kia'), ('Mercedes-Benz'), ('Nissan'), ('Peugeot'),
  ('Renault'), ('Toyota'), ('Volkswagen')
on conflict (nombre) do nothing;
