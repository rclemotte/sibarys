-- =====================================================================
-- MIGRACIÓN: edición de cargas por administración (con historial)
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada.)
--
-- Cada vez que un administrador corrige un dato de una carga, queda una
-- fila por cada dato cambiado: valor anterior, valor nuevo, motivo,
-- quién lo cambió y cuándo.
-- =====================================================================

create table if not exists public.cargas_correcciones (
  id              bigserial primary key,
  carga_id        uuid not null references public.cargas(id) on delete cascade,
  campo           text not null,          -- ej. "Litros", "Kilometraje"
  valor_anterior  text,
  valor_nuevo     text,
  motivo          text not null,
  corregido_por   uuid references public.perfiles(id) on delete set null,
  corregido_en    timestamptz not null default now()
);

create index if not exists idx_correcciones_carga
  on public.cargas_correcciones(carga_id, corregido_en desc);

alter table public.cargas_correcciones enable row level security;

-- Ven el historial: administración, y el chofer de esa carga
drop policy if exists correcciones_select on public.cargas_correcciones;
create policy correcciones_select on public.cargas_correcciones
  for select using (
    public.es_admin()
    or exists (select 1 from public.cargas c
               where c.id = carga_id and c.chofer_id = auth.uid())
  );

-- Solo administración registra correcciones (y no se pueden borrar ni editar)
drop policy if exists correcciones_insert on public.cargas_correcciones;
create policy correcciones_insert on public.cargas_correcciones
  for insert with check (public.es_admin() and corregido_por = auth.uid());

-- Solo para deshacer el registro si la edición de la carga falló
-- (cada administrador puede borrar únicamente lo que acaba de registrar)
drop policy if exists correcciones_delete on public.cargas_correcciones;
create policy correcciones_delete on public.cargas_correcciones
  for delete using (
    public.es_admin() and corregido_por = auth.uid()
    and corregido_en > now() - interval '5 minutes'
  );
