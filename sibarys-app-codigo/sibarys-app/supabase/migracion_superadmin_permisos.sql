-- =====================================================================
-- MIGRACIÓN: rol "superadmin" + permisos de edición por administrador
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada.)
--
-- Niveles:
--   superadmin -> puede todo y decide qué puede editar cada admin.
--   admin      -> gestiona, pero solo edita lo que el superadmin le habilitó.
--   chofer     -> registra sus cargas.
-- =====================================================================

-- 1) Nuevo rol permitido
alter table public.perfiles drop constraint if exists perfiles_rol_check;
alter table public.perfiles
  add constraint perfiles_rol_check check (rol in ('chofer','admin','superadmin'));

-- 2) Permisos de edición (para rol admin). Arrancan habilitados para no
--    cambiar nada de lo que ya funciona; el superadmin los apaga.
alter table public.perfiles add column if not exists puede_editar_vehiculos   boolean not null default true;
alter table public.perfiles add column if not exists puede_corregir_km        boolean not null default true;
alter table public.perfiles add column if not exists puede_gestionar_usuarios boolean not null default true;
alter table public.perfiles add column if not exists puede_editar_catalogos   boolean not null default true;

-- 3) es_admin() ahora incluye al superadmin (lo usan todas las políticas RLS)
create or replace function public.es_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol in ('admin','superadmin')
  );
$$;

create or replace function public.es_superadmin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.perfiles
    where id = auth.uid() and rol = 'superadmin'
  );
$$;

-- 4) Protección: solo el superadmin puede cambiar roles y permisos.
--    (Desde el SQL Editor o con la clave de servicio no hay usuario logueado,
--     así que se permite: así se crea el primer superadmin.)
create or replace function public.proteger_rol_y_permisos()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.es_superadmin() then
    return new;
  end if;

  if new.rol is distinct from old.rol
     or new.puede_editar_vehiculos   is distinct from old.puede_editar_vehiculos
     or new.puede_corregir_km        is distinct from old.puede_corregir_km
     or new.puede_gestionar_usuarios is distinct from old.puede_gestionar_usuarios
     or new.puede_editar_catalogos   is distinct from old.puede_editar_catalogos
  then
    raise exception 'Solo el súper admin puede cambiar roles y permisos.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_proteger_rol_y_permisos on public.perfiles;
create trigger trg_proteger_rol_y_permisos
  before update on public.perfiles
  for each row execute function public.proteger_rol_y_permisos();

-- 5) PRIMER SUPERADMIN: reemplazá la cédula y corré esta línea.
-- update public.perfiles set rol = 'superadmin' where cedula = '1234567';
