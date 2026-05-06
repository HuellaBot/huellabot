-- Habilitar extensión uuid
create extension if not exists "uuid-ossp";

-- Tabla de clínicas (una por cuenta)
create table public.clinics (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text default '',
  phone text default '',
  address text default '',
  hours text default 'Lunes a Viernes 8:00-18:00, Sábado 9:00-14:00',
  extra_info text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de servicios
create table public.services (
  id uuid default uuid_generate_v4() primary key,
  clinic_id uuid references public.clinics(id) on delete cascade not null,
  name text not null,
  price text not null,
  duration text default '',
  created_at timestamptz default now()
);

-- Tabla de configuración del bot
create table public.bot_configs (
  id uuid default uuid_generate_v4() primary key,
  clinic_id uuid references public.clinics(id) on delete cascade not null unique,
  bot_name text default 'Asistente Virtual',
  bot_tone text default 'amigable y profesional',
  welcome_message text default '¡Hola! Soy el asistente virtual de la clínica. ¿En qué puedo ayudarte hoy?',
  primary_color text default '#2D6A4F',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de conversaciones (analytics)
create table public.conversations (
  id uuid default uuid_generate_v4() primary key,
  clinic_id uuid references public.clinics(id) on delete cascade not null,
  session_id text not null,
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Row Level Security
alter table public.clinics enable row level security;
alter table public.services enable row level security;
alter table public.bot_configs enable row level security;
alter table public.conversations enable row level security;

-- Políticas: solo el dueño puede ver/editar su clínica
create policy "Usuarios ven su propia clínica" on public.clinics
  for all using (auth.uid() = user_id);

create policy "Usuarios gestionan sus servicios" on public.services
  for all using (
    clinic_id in (select id from public.clinics where user_id = auth.uid())
  );

create policy "Usuarios gestionan config de su bot" on public.bot_configs
  for all using (
    clinic_id in (select id from public.clinics where user_id = auth.uid())
  );

create policy "Usuarios ven sus conversaciones" on public.conversations
  for all using (
    clinic_id in (select id from public.clinics where user_id = auth.uid())
  );

-- Función para actualizar updated_at automáticamente
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clinics_updated_at before update on public.clinics
  for each row execute function public.handle_updated_at();

create trigger bot_configs_updated_at before update on public.bot_configs
  for each row execute function public.handle_updated_at();
