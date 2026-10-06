-- =====================================================================
-- MIGRACIÓN: consumo de referencia del vehículo en L/100 km
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada.)
--
-- Antes el "Consumo prom." del vehículo se cargaba en km/l
-- (columna consumo_promedio_asignado). Ahora se carga en litros cada
-- 100 km, en una columna nueva. La columna vieja queda como respaldo.
-- =====================================================================

-- 1) Columna nueva
alter table public.vehiculos
  add column if not exists consumo_ref_l100km numeric(6,2);

-- 2) Pasar los valores ya cargados (asumiendo que estaban en km/l,
--    que era lo que pedía la pantalla): L/100 km = 100 / km/l
update public.vehiculos
set consumo_ref_l100km = round(100 / consumo_promedio_asignado, 2)
where consumo_ref_l100km is null
  and consumo_promedio_asignado > 0;

-- 3) Para revisar: si alguno ya lo habían cargado en L/100 km, acá se va
--    a ver un valor raro en la columna nueva. Corregilo desde la app
--    (Vehículos -> Editar datos).
-- select patente, nombre,
--        consumo_promedio_asignado as viejo_km_por_litro,
--        consumo_ref_l100km        as nuevo_l_100km
-- from public.vehiculos
-- where consumo_promedio_asignado is not null
-- order by nombre;
