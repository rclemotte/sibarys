# Sibarys — App de Kilometraje y Combustible

Arquitectura y plan del proyecto.

## 1. Objetivo

Aplicación web (mobile-first) para que los choferes de Sibarys registren, cada vez
que cargan combustible, el **kilometraje del vehículo** y los **litros cargados**.
Con esos dos datos la app calcula el **consumo real (km/litro y litros/100 km)**,
detecta cargas anómalas y ofrece reportes por vehículo y por chofer.

Restricción clave: **infraestructura 100% open source y sin costo** para el cliente.

## 2. Principios de diseño

- **Cero costo**: todo corre en free tiers o software self-hosteable.
- **Open source**: cada pieza del stack es open source y se puede autoalojar más
  adelante sin reescribir la app (evita el vendor lock-in).
- **Mobile-first / PWA**: el chofer la usa desde el celular en la estación de servicio.
  Instalable en la pantalla de inicio, funciona bien con una mano.
- **Simple de cargar**: el flujo de carga debe hacerse en menos de 30 segundos.
- **Seguridad por rol**: cada chofer ve lo suyo; el admin ve todo.

## 3. Stack tecnológico

| Capa | Tecnología | Por qué | Costo |
|------|-----------|---------|-------|
| Frontend | **Next.js 14** (App Router) + React + TypeScript | Framework open source, PWA, SSR | $0 |
| Estilos | **Tailwind CSS** | Rápido, mobile-first | $0 |
| Gráficos | **Recharts** | Librería open source de charts | $0 |
| Backend / DB | **Supabase** (PostgreSQL + Auth + RLS) | Open source, self-hosteable, free tier generoso | $0 |
| Hosting web | **Vercel** (o Netlify / Cloudflare Pages) | Deploy de Next.js gratis | $0 |

**Nota sobre "open"**: Supabase es open source (Postgres + GoTrue + PostgREST) y se
puede autoalojar en un VPS o incluso en una máquina propia con Docker. Se empieza en
el free tier gestionado (cero costo, cero mantenimiento) y, si el cliente algún día
quiere control total, se migra el mismo esquema SQL a una instancia self-hosted sin
tocar la app. Vercel también es reemplazable por Netlify/Cloudflare Pages, todos gratis.

### Alternativa 100% self-hosted (si en algún momento no se quiere depender de nubes)
- **PocketBase** (un solo binario Go, SQLite + auth) autoalojado, o
- **Supabase self-hosted** con Docker en un VPS gratuito/barato (Oracle Cloud Always Free, Fly.io, etc.).

## 4. Modelo de datos

Todas las tablas y columnas están **en español** (detalle SQL en
`supabase/schema.sql`).

### `perfiles`
Extiende a los usuarios de autenticación (`auth.users`): `id`, `nombre_completo`,
`rol` (`chofer` | `admin`), `activo`, `creado_en`.

### `tipos_combustible`
Catálogo de combustibles: `id`, `nombre` (ej. "Nafta Súper 97"), `octanaje`,
`activo`, `creado_en`.

### `precios_combustible`
Historial de tarifas: `id`, `tipo_combustible_id`, `precio`, `vigente_desde`
(fecha), `creado_por`, `creado_en`. El **precio vigente** de cada combustible es
el de mayor `vigente_desde <= hoy`; se expone en la vista `precios_vigentes`.
Cuando cambia el precio, se agrega una fila nueva con la nueva fecha, y queda el
historial completo.

### `vehiculos`
La flota: `id`, `patente` (única), `nombre` (alias), `marca`, `modelo`, `anio`,
`activo`, `creado_en`.

### `vehiculo_combustibles` (muchos a muchos)
Qué combustibles puede usar cada vehículo: `vehiculo_id`, `tipo_combustible_id`.
Ej.: un Onix Joy asociado a "Súper 97" y "Grid 93".

### `asignaciones`
Qué chofer maneja qué vehículo: `id`, `vehiculo_id`, `chofer_id`, `asignado_en`,
`activo`. Relación flexible (un vehículo puede tener varios choferes y viceversa).
El chofer solo ve/carga los vehículos que tiene asignados.

### `cargas`
El corazón: **cada carga de combustible** registra odómetro + litros.
`id`, `vehiculo_id`, `chofer_id`, `tipo_combustible_id`, `registrado_en`,
`odometro_km`, `litros`, `precio_litro` (se pre-carga desde la tarifa vigente),
`costo_total` (calculado), `tanque_lleno`, `estacion` (opc.), `notas` (opc.).

### Cálculo de consumo (método tanque a tanque)
Para cada carga se busca la carga anterior del mismo vehículo:

```
distancia    = odometro_km(actual) - odometro_km(anterior)
km_por_litro = distancia / litros(actual)
litros_100km = 100 * litros(actual) / distancia
```

Se materializa en la **vista SQL `consumo`**, así el frontend solo lee y no
hace lógica pesada. Una carga se marca como anómala si el consumo se desvía mucho del
promedio del vehículo (posible error de tipeo, fuga o robo).

## 5. Seguridad (Row Level Security)

Todo el acceso pasa por **RLS de Postgres**, así el free tier es seguro sin backend propio:

- Un **chofer** inserta cargas y lee **solo las suyas** + sus asignaciones.
- Un **admin** lee/edita todo (vehículos, choferes, tarifas, asignaciones, cargas).
- El rol se resuelve con la función `es_admin()` que lee `perfiles.rol`.

## 6. Flujos principales

**Chofer (celular):**
1. Inicia sesión.
2. Toca "Nueva carga".
3. Elige uno de **sus vehículos asignados** → elige el combustible (entre los
   permitidos del vehículo; el precio se pre-carga desde la tarifa vigente) →
   ingresa odómetro y litros → Guardar.
4. Ve al instante el consumo calculado respecto a la carga anterior.

**Admin:**
1. Panel con KPIs: consumo promedio de la flota, litros del mes, costo del mes.
2. Reportes con gráficos por vehículo y por chofer.
3. **Vehículos** (con sus combustibles), **Asignaciones** (auto → chofer),
   **Tarifas** (precios por combustible con fecha de vigencia) y **Choferes**.

## 7. Roadmap

**Fase 1 — MVP (este entregable):** auth por rol, ABM de vehículos, carga de km/litros,
cálculo de consumo, reportes básicos, PWA.

**Fase 2 — Operativo:** foto del odómetro/ticket, alertas de consumo anómalo,
export a Excel/CSV, recordatorios de mantenimiento por km.

**Fase 3 — Analítica:** costo por km, comparación entre choferes, detección de
fugas/robos, dashboard directivo.

## 8. Despliegue gratuito (resumen)

1. Crear proyecto gratis en **supabase.com** → correr `supabase/schema.sql`.
2. Copiar `URL` y `anon key` a las variables de entorno.
3. Deploy del repo en **Vercel** (import desde GitHub, gratis).
4. Registrar tu usuario y promoverlo a admin.

Paso a paso en `README.md`.
