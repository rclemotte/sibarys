-- =====================================================================
-- MIGRACIÓN: login por cédula + cambio de contraseña en el primer ingreso
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional al schema; no borra nada.)
-- =====================================================================

-- Nuevos campos en perfiles
alter table public.perfiles add column if not exists cedula text;
alter table public.perfiles add column if not exists debe_cambiar_password boolean not null default false;

-- La cédula debe ser única (cuando está cargada)
create unique index if not exists uq_perfiles_cedula
  on public.perfiles (cedula) where cedula is not null;

-- El trigger que crea el perfil ahora también toma cédula y el flag de
-- "debe cambiar contraseña" desde los metadatos del usuario.
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo, rol, cedula, debe_cambiar_password)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre_completo', new.email),
    coalesce(new.raw_user_meta_data->>'rol', 'chofer'),
    new.raw_user_meta_data->>'cedula',
    coalesce((new.raw_user_meta_data->>'debe_cambiar_password')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
