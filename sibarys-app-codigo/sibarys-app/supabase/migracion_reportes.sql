-- =====================================================================
-- MIGRACIÓN: datos para el módulo de Reportes
-- Correr en: Supabase -> SQL Editor -> New query -> Run
-- (Adicional; no borra nada.)
--
-- Devuelve las cargas con su recorrido y consumo calculados sobre el
-- historial COMPLETO de cada vehículo, pero mostrando solo lo que el
-- usuario puede ver:
--   - administración: todas las cargas;
--   - chofer: solo las cargas que registró él.
-- Así, si varios choferes usan el mismo vehículo, el recorrido de cada
-- carga es el real (desde la carga anterior de cualquier chofer).
-- =====================================================================

create or replace function public.reporte_consumo(p_desde timestamptz)
returns setof public.consumo
language sql
security definer set search_path = public
stable
as $$
  select *
  from public.consumo
  where registrado_en >= p_desde
    and (public.es_admin() or chofer_id = auth.uid())
  order by registrado_en;
$$;

revoke all on function public.reporte_consumo(timestamptz) from public;
grant execute on function public.reporte_consumo(timestamptz) to authenticated;
