-- =====================================================================
-- MIGRACIÓN: anular cargas (solo administración)
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada.)
--
-- Una carga anulada NO se borra: queda en la tabla con quién la anuló,
-- cuándo y por qué, y se puede restaurar. Pero deja de contar en todo:
-- consumo, reportes, alertas, exportaciones, planilla, último km del
-- vehículo y mantenimiento.
-- =====================================================================

-- 1) Campos nuevos en cargas
alter table public.cargas add column if not exists anulada_en     timestamptz;
alter table public.cargas add column if not exists anulada_por    uuid references public.perfiles(id) on delete set null;
alter table public.cargas add column if not exists anulada_motivo text;

create index if not exists idx_cargas_anuladas
  on public.cargas(anulada_en) where anulada_en is not null;

-- 2) La vista de consumo ignora las anuladas (mismas columnas que antes).
--    Al quitarlas también del cálculo, el recorrido de la carga siguiente
--    se mide desde la carga válida anterior.
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
  end as litros_por_100km,
  c.odometro_original,
  c.odometro_corregido_motivo,
  pc.nombre_completo as odometro_corregido_por_nombre,
  c.odometro_corregido_en
from public.cargas c
join public.vehiculos v on v.id = c.vehiculo_id
left join public.perfiles p  on p.id  = c.chofer_id
left join public.perfiles pc on pc.id = c.odometro_corregido_por
left join public.tipos_combustible tc on tc.id = c.tipo_combustible_id
where c.anulada_en is null
window w as (partition by c.vehiculo_id order by c.odometro_km, c.registrado_en);
alter view public.consumo set (security_invoker = on);

-- 3) Último km del vehículo (control al cargar): sin anuladas
create or replace function public.ultimo_odometro(p_vehiculo_id uuid)
returns numeric
language sql
security definer set search_path = public
stable
as $$
  select max(odometro_km) from public.cargas
  where vehiculo_id = p_vehiculo_id and anulada_en is null;
$$;

-- 4) Km actual para mantenimiento: sin anuladas
create or replace view public.estado_mantenimiento as
select
  v.id      as vehiculo_id,
  v.nombre,
  v.patente,
  v.activo,
  (select max(c.odometro_km) from public.cargas c
    where c.vehiculo_id = v.id and c.anulada_en is null) as km_actual,
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

-- 5) Control de duplicados: una carga anulada no bloquea volver a cargarla
create or replace function public.evitar_carga_duplicada()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.vehiculo_id::text));

  if exists (
    select 1 from public.cargas
    where vehiculo_id = new.vehiculo_id
      and odometro_km = new.odometro_km
      and litros      = new.litros
      and anulada_en is null
      and creado_en  >= now() - interval '10 minutes'
  ) then
    raise exception 'CARGA_DUPLICADA: ya existe una carga igual en los últimos 10 minutos';
  end if;

  return new;
end;
$$;

-- 6) Que la app vea los cambios de inmediato
notify pgrst, 'reload schema';
