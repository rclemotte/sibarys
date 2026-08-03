# Sibarys — App de Combustible y Kilometraje

Web app **mobile-first (PWA)** para que los choferes de Sibarys registren, cada vez
que cargan combustible, el **kilometraje** y los **litros**, y así medir el
**consumo real** de la flota (km/l y l/100 km).

Stack **100% open source y gratis**: Next.js + Supabase (Postgres) + Vercel.

- Arquitectura y decisiones: ver [`ARQUITECTURA.md`](./ARQUITECTURA.md)
- Base de datos: ver [`supabase/schema.sql`](./supabase/schema.sql)

---

## ⚠️ Antes de empezar

Este proyecto viene con una carpeta `node_modules` **incompleta** (se generó en un
entorno con límites de tiempo). **Borrala** y reinstalá limpio:

```bash
rm -rf node_modules package-lock.json   # en Windows: borrá la carpeta a mano
npm install
```

---

## 1. Requisitos

- Node.js 18.18+ (recomendado 20+)
- Una cuenta gratis en [supabase.com](https://supabase.com)
- Una cuenta gratis en [vercel.com](https://vercel.com) (opcional, para publicar)

## 2. Crear la base de datos (Supabase)

1. Entrá a supabase.com → **New project** (elegí el plan Free).
2. Cuando esté listo, abrí **SQL Editor → New query**.
3. Pegá todo el contenido de `supabase/schema.sql` y tocá **Run**.
   Esto crea las tablas (`profiles`, `vehicles`, `fuel_logs`), la vista de consumo
   y las políticas de seguridad (RLS).
4. Andá a **Project Settings → API** y copiá:
   - **Project URL**
   - **anon public key**

## 3. Configurar el proyecto

```bash
cp .env.example .env.local
```

Editá `.env.local` con tus datos:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Instalá y corré en local:

```bash
npm install
npm run dev
```

Abrí http://localhost:3000

## 4. Crear el primer usuario y hacerlo admin

1. En Supabase: **Authentication → Users → Add user** (email + contraseña).
   > Tip: desactivá "Confirm email" en **Authentication → Providers → Email**
   > mientras probás, para no tener que confirmar por correo.
2. Ese usuario ya puede iniciar sesión como **chofer**. Para hacerlo **admin**,
   en **SQL Editor** corré:

   ```sql
   update public.perfiles set rol = 'admin'
   where id = (select id from auth.users where email = 'tu-email@sibarys.com');
   ```

3. Iniciá sesión en la app. Como admin vas a ver la pestaña **Admin** con sus
   sub-secciones: Vehículos, Asignaciones, Tarifas y Choferes.

## 5. Configuración inicial (como admin)

El `schema.sql` ya deja cargados tipos de combustible comunes (Súper 95, Premium
97, Grid 93, Diésel, GNC). Después, desde **Admin**:

1. **Tarifas** → cargá el **precio por litro** de cada combustible con su fecha
   *"vigente desde"*. Cuando cambie el precio, agregás una fila nueva con la
   nueva fecha; queda el historial y el sistema toma siempre el más reciente.
   (Ahí también podés crear tipos de combustible nuevos.)
2. **Vehículos** → **+ Agregar vehículo** y tildá los **combustibles que puede
   usar** (ej. Onix Joy → Súper 97 + Grid 93). Podés editar los combustibles de
   cada vehículo después con "Editar".
3. **Choferes** → cada usuario que registres en Supabase aparece acá; asignale
   rol o dalo de baja.
4. **Asignaciones** → asigná cada vehículo a su(s) chofer(es). El chofer solo verá
   y podrá cargar los vehículos que tenga asignados.

## 6. Publicar gratis en Vercel

1. Subí el proyecto a un repo de GitHub.
2. En vercel.com → **Add New → Project → Import** el repo.
3. En **Environment Variables** cargá `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. **Deploy**. Te queda una URL pública (ej. `sibarys.vercel.app`).
5. En el celular, abrí la URL → menú del navegador → **Agregar a pantalla de
   inicio**. Queda como una app (PWA).

> Alternativas de hosting gratis equivalentes: Netlify o Cloudflare Pages.
> Alternativa 100% self-hosted: Supabase self-hosted (Docker) o PocketBase.

---

## Cómo se calcula el consumo

Cada carga registra **odómetro + litros**. El consumo se calcula "tanque a tanque":
la app toma la diferencia de kilometraje contra la carga anterior del mismo vehículo
y la divide por los litros cargados (`km/l` y `l/100km`). Por eso, para que el número
sea preciso, conviene **cargar el tanque lleno** y registrar **cada** carga.

La primera carga de un vehículo no muestra consumo (no hay contra qué comparar).
Las cargas con consumo muy fuera de rango se marcan con ⚠️ en el historial (posible
error de tipeo, fuga o robo de combustible).

## Estructura del proyecto

```
sibarys-app/
├─ ARQUITECTURA.md          Documento de arquitectura y roadmap
├─ supabase/schema.sql      Esquema SQL (tablas, vista, RLS)
├─ src/
│  ├─ app/
│  │  ├─ login/             Inicio de sesión
│  │  └─ (app)/             App protegida
│  │     ├─ dashboard/      KPIs del mes
│  │     ├─ cargar/         Registro de km + litros
│  │     ├─ historial/      Listado de cargas + consumo
│  │     ├─ reportes/       Gráficos (Recharts)
│  │     └─ admin/          Solo admin:
│  │        ├─ vehiculos/      ABM + combustibles por vehículo
│  │        ├─ asignaciones/   Asignar autos a choferes
│  │        ├─ tarifas/        Precios por combustible con historial
│  │        └─ choferes/       Roles y altas/bajas
│  ├─ components/           Navegación, logout
│  ├─ lib/                  Cliente Supabase, tipos, formato
│  └─ middleware.ts         Protección de rutas / sesión
└─ public/                  Manifest PWA e íconos
```

## Roadmap (próximas fases)

- **Fase 2:** foto del odómetro/ticket, alertas de consumo anómalo, export a Excel/CSV, recordatorios de mantenimiento por km.
- **Fase 3:** costo por km, comparación entre choferes, detección de fugas, dashboard directivo.

## Costos

Todo corre en free tier: **$0**. Supabase Free cubre holgadamente el volumen de una
flota (miles de cargas). Si algún día se supera, se migra el mismo esquema a Supabase
self-hosted sin reescribir la app.
