export type Rol = "chofer" | "admin";

export interface Perfil {
  id: string;
  nombre_completo: string | null;
  rol: Rol;
  activo: boolean;
  creado_en: string;
}

export interface TipoCombustible {
  id: string;
  nombre: string;
  octanaje: number | null;
  activo: boolean;
  creado_en: string;
}

export interface PrecioCombustible {
  id: string;
  tipo_combustible_id: string;
  precio: number;
  vigente_desde: string;
  creado_en: string;
}

export interface PrecioVigente {
  tipo_combustible_id: string;
  tipo_nombre: string;
  precio: number;
  vigente_desde: string;
}

export interface Marca {
  id: string;
  nombre: string;
  activo: boolean;
  creado_en: string;
}

export interface Vehiculo {
  id: string;
  patente: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  activo: boolean;
  creado_en: string;
}

export interface Asignacion {
  id: string;
  vehiculo_id: string;
  chofer_id: string;
  asignado_en: string;
  activo: boolean;
}

export interface Carga {
  id: string;
  vehiculo_id: string;
  chofer_id: string;
  tipo_combustible_id: string | null;
  registrado_en: string;
  odometro_km: number;
  litros: number;
  precio_litro: number | null;
  costo_total: number | null;
  tanque_lleno: boolean;
  estacion: string | null;
  notas: string | null;
  creado_en: string;
}

export interface Consumo {
  id: string;
  vehiculo_id: string;
  patente: string;
  vehiculo_nombre: string;
  chofer_id: string;
  chofer_nombre: string | null;
  tipo_combustible_id: string | null;
  combustible_nombre: string | null;
  registrado_en: string;
  odometro_km: number;
  litros: number;
  precio_litro: number | null;
  costo_total: number | null;
  tanque_lleno: boolean;
  estacion: string | null;
  odometro_anterior: number | null;
  distancia_km: number | null;
  km_por_litro: number | null;
  litros_por_100km: number | null;
}

/** Vehículo con sus combustibles permitidos (para el formulario de carga) */
export interface VehiculoParaCarga {
  id: string;
  nombre: string;
  patente: string;
  combustibles: {
    id: string;
    nombre: string;
    precio_vigente: number | null;
  }[];
}
