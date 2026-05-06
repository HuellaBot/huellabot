# 🐾 Huella Bot

Plataforma SaaS de chatbot IA para veterinarias. Cada clínica configura su propio bot con precios, servicios y personalidad, y obtiene un widget embebible para su sitio web.

## Stack

- **Next.js 14** (App Router)
- **Supabase** (Auth + PostgreSQL + RLS)
- **Anthropic Claude** (claude-sonnet-4-6)
- **Tailwind CSS**

## Inicio rápido

### 1. Instalar dependencias

```bash
cd huellabot
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Edita `.env.local` con tus credenciales:

| Variable | Dónde obtenerla |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en desarrollo |

### 3. Crear tablas en Supabase

En el **SQL Editor** de Supabase, ejecuta el contenido de `supabase/schema.sql`.

### 4. Correr el servidor

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## Estructura

```
app/
  page.tsx              → Landing page
  (auth)/
    login/              → Login
    signup/             → Registro
  (dashboard)/
    dashboard/          → Panel de control
  api/
    chat/               → Endpoint del chatbot (público)
    config/[clinicId]/  → Config para el widget (público)
    auth/signout/       → Logout
public/
  widget.js             → Script embebible (vanilla JS)
supabase/
  schema.sql            → Esquema de base de datos
```

## Widget embebible

Cada veterinaria obtiene este fragmento de código en su dashboard:

```html
<script
  src="https://huellabot.com/widget.js"
  data-clinic-id="CLINIC_ID"
  defer
></script>
```

Compatible con cualquier sitio web (WordPress, Wix, HTML puro).
