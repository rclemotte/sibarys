-- =====================================================================
-- MIGRACIÓN: Auditoría (quién modifica los datos) — TODAS las tablas
-- Correr en: Supabase -> SQL Editor -> New query -> Run
--
-- Registra, por cada alta/edición/borrado en cualquier tabla:
--   qué tabla, qué acción, qué registro, quién lo hizo y cuándo.
-- (Sin "antes y después", sin pantalla — todo queda guardado en la tabla
--  public.auditoria para consultarlo cuando haga falta.)
-- =====================================================================

-- 1) Tabla donde se guarda la auditoría
create table if not exists public.auditoria (
  id             bigserial primary key,
  tabla          text not null,
  operacion      text not null,          -- INSERT / UPDATE / DELETE
  registro_id    text,                    -- id del registro afectado
  usuario_id     uuid,                    -- quién lo hizo (null = desde SQL/sistema)
  usuario_nombre text,                    -- nombre del usuario en ese momento
  creado_en      timestamptz not null default now()
);

create index if not exists idx_auditoria_tabla   on public.auditoria(tabla);
create index if not exists idx_auditoria_usuario on public.auditoria(usuario_id);
create index if not exists idx_auditoria_fecha    on public.auditoria(creado_en desc);

-- 2) Función que registra cada cambio
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_nombre text;
  v_reg_id text;
begin
  -- Nombre del usuario (si el cambio vino desde la app con sesión)
  if v_uid is not null then
    select nombre_completo into v_nombre from public.perfiles where id = v_uid;
  end if;

  -- Id del registro afectado (usa NEW para alta/edición, OLD para borrado)
  v_reg_id := coalesce(to_jsonb(NEW)->>'id', to_jsonb(OLD)->>'id');

  insert into public.auditoria (tabla, operacion, registro_id, usuario_id, usuario_nombre)
  values (TG_TABLE_NAME, TG_OP, v_reg_id, v_uid, v_nombre);

  return coalesce(NEW, OLD);
end;
$$;

-- 3) Enganchar el trigger a TODAS las tablas de public (menos la de auditoría)
do $$
declare r record;
begin
  for r in
    select tablename from pg_tables
    where schemaname = 'public' and tablename <> 'auditoria'
  loop
    execute format('drop trigger if exists trg_auditoria on public.%I', r.tablename);
    execute format(
      'create trigger trg_auditoria after insert or update or delete on public.%I ' ||
      'for each row execute function public.registrar_auditoria()',
      r.tablename
    );
  end loop;
end $$;

-- 4) Seguridad: solo el admin puede leer la auditoría.
--    (El trigger la escribe solo, sin necesidad de permisos del usuario.)
alter table public.auditoria enable row level security;

drop policy if exists auditoria_admin_select on public.auditoria;
create policy auditoria_admin_select on public.auditoria
  for select using (public.es_admin());

-- =====================================================================
-- Cómo consultarla (ejemplos, para correr cuando quieras ver el registro):
-- =====================================================================
-- Últimos 100 movimientos:
--   select creado_en, usuario_nombre, tabla, operacion, registro_id
--   from public.auditoria
--   order by creado_en desc
--   limit 100;
--
-- Todo lo que hizo un usuario:
--   select * from public.auditoria
--   where usuario_nombre ilike '%juan%'
--   order by creado_en desc;
--
-- Cambios sobre una tabla puntual (ej. cargas):
--   select * from public.auditoria
--   where tabla = 'cargas'
--   order by creado_en desc;
