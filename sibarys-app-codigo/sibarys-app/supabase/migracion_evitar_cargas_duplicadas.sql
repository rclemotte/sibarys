-- =====================================================================
-- MIGRACIÓN: evitar cargas duplicadas
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada.)
--
-- Rechaza una carga si en los últimos 10 minutos ya se registró otra con
-- el mismo vehículo, kilometraje y litros (ej. doble toque en "Guardar"),
-- sin importar qué chofer la haya cargado.
-- =====================================================================

create or replace function public.evitar_carga_duplicada()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Serializa las cargas del mismo vehículo para que dos envíos
  -- simultáneos no pasen los dos el control.
  perform pg_advisory_xact_lock(hashtext(new.vehiculo_id::text));

  if exists (
    select 1 from public.cargas
    where vehiculo_id = new.vehiculo_id
      and odometro_km = new.odometro_km
      and litros      = new.litros
      and creado_en  >= now() - interval '10 minutes'
  ) then
    raise exception 'CARGA_DUPLICADA: ya existe una carga igual en los últimos 10 minutos';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_evitar_carga_duplicada on public.cargas;
create trigger trg_evitar_carga_duplicada
  before insert on public.cargas
  for each row execute function public.evitar_carga_duplicada();

-- ---------------------------------------------------------------------
-- Para revisar duplicados que ya existan (misma carga dos veces):
-- select vehiculo_id, odometro_km, litros, count(*), min(creado_en), max(creado_en)
-- from public.cargas
-- group by vehiculo_id, odometro_km, litros
-- having count(*) > 1;
-- ---------------------------------------------------------------------
