-- =====================================================================
-- MIGRACIÓN: contraseñas puestas por el admin + carga en cualquier vehículo
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada.)
-- =====================================================================

-- 1) Nadie queda obligado a cambiar la contraseña en el primer ingreso.
--    El admin define la contraseña y se la pasa al chofer.
update public.perfiles
set debe_cambiar_password = false
where debe_cambiar_password;

-- 2) Último kilometraje cargado de un vehículo, mirando las cargas de
--    TODOS los choferes (ahora cualquiera puede usar cualquier vehículo).
--    Lo usa la pantalla "Cargar" para validar que el km no retroceda.
--    Devuelve solo un número, así el chofer no ve las cargas de otros.
create or replace function public.ultimo_odometro(p_vehiculo_id uuid)
returns numeric
language sql
security definer set search_path = public
stable
as $$
  select max(odometro_km) from public.cargas where vehiculo_id = p_vehiculo_id;
$$;

revoke all on function public.ultimo_odometro(uuid) from public;
grant execute on function public.ultimo_odometro(uuid) to authenticated;
