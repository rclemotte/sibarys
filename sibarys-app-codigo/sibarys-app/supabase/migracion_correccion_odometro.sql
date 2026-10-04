-- =====================================================================
-- MIGRACIÓN: corrección manual del odómetro de una carga (solo admin)
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada.)
--
-- Cuando un chofer carga mal el kilometraje, el admin lo corrige desde
-- Historial con un motivo obligatorio. Se guarda el valor original, el
-- motivo, quién lo corrigió y cuándo.
-- =====================================================================

-- 1) Campos nuevos en cargas
alter table public.cargas add column if not exists odometro_original        numeric(10,1);
alter table public.cargas add column if not exists odometro_corregido_motivo text;
alter table public.cargas add column if not exists odometro_corregido_por    uuid references public.perfiles(id) on delete set null;
alter table public.cargas add column if not exists odometro_corregido_en     timestamptz;

-- 2) La vista de consumo ahora también muestra la corrección
--    (mismas columnas que antes + 4 nuevas al final).
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
window w as (partition by c.vehiculo_id order by c.odometro_km, c.registrado_en);
alter view public.consumo set (security_invoker = on);
