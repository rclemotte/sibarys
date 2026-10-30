-- =====================================================================
-- MIGRACIÓN: límite de km para vehículos alquilados
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada. Se puede correr más de una vez.)
--
-- En el catastro del vehículo alquilado se carga desde qué fecha se
-- controlan los km, el límite (normalmente 5.000) y con cuántos km de
-- anticipación avisar (normalmente 500). Opcionalmente, el odómetro al
-- inicio; si no se carga, se toma el de la primera carga desde esa fecha.
-- =====================================================================

alter table public.vehiculos
  add column if not exists km_control_desde date,
  add column if not exists km_limite        integer default 5000 check (km_limite is null or km_limite > 0),
  add column if not exists km_aviso         integer default 500  check (km_aviso is null or km_aviso >= 0),
  add column if not exists km_inicial       numeric(10,1)        check (km_inicial is null or km_inicial >= 0);

-- Que la app vea los cambios de inmediato
notify pgrst, 'reload schema';
