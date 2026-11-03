// Íconos y descripciones de la navegación (solo presentación).
import {
  BarChart3,
  Building2,
  CircleDollarSign,
  Flag,
  Fuel,
  Gauge,
  List,
  MapPin,
  Scale,
  Sheet,
  Tag,
  Truck,
  Users,
  Wrench,
  FileText,
  type LucideIcon,
} from "lucide-react";

export const INFO_ADMIN: Record<string, { icono: LucideIcon; texto: string }> = {
  "/admin/vehiculos": { icono: Truck, texto: "Flota, tanque, combustibles y alquiler" },
  "/admin/mantenimiento": { icono: Wrench, texto: "Servicios por kilometraje" },
  "/admin/combustibles": { icono: Fuel, texto: "Tipos de combustible" },
  "/admin/marcas": { icono: Tag, texto: "Marcas y modelos de la flota" },
  "/admin/empresas": { icono: Building2, texto: "Empresas de alquiler" },
  "/admin/emblemas": { icono: Flag, texto: "Banderas de las estaciones" },
  "/admin/estaciones": { icono: MapPin, texto: "Estaciones de servicio" },
  "/admin/tarifas": { icono: CircleDollarSign, texto: "Precios de referencia por emblema" },
  "/admin/choferes": { icono: Users, texto: "Usuarios, permisos y contraseñas" },
};

export const ICONO_REPORTE: Record<string, LucideIcon> = {
  "/reportes": BarChart3,
  "/reportes/detalle": FileText,
  "/reportes/planilla": Sheet,
  "/reportes/precios": Scale,
  "/reportes/km-alquilados": Gauge,
  "/reportes/listados": List,
};
