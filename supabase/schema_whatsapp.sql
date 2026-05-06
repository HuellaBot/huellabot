-- Tabla de configuración de WhatsApp por clínica
create table public.whatsapp_configs (
  id uuid default uuid_generate_v4() primary key,
  clinic_id uuid references public.clinics(id) on delete cascade not null unique,
  twilio_account_sid text not null default '',
  twilio_auth_token text not null default '',
  twilio_phone_number text not null default '',
  is_active boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabla de mensajes de WhatsApp
create table public.whatsapp_messages (
  id uuid default uuid_generate_v4() primary key,
  clinic_id uuid references public.clinics(id) on delete cascade not null,
  phone_number text not null,
  message text not null,
  response text not null,
  timestamp timestamptz default now()
);

-- RLS
alter table public.whatsapp_configs enable row level security;
alter table public.whatsapp_messages enable row level security;

create policy "Clínica gestiona su config de WhatsApp" on public.whatsapp_configs
  for all using (
    clinic_id in (select id from public.clinics where user_id = auth.uid())
  );

create policy "Clínica ve sus mensajes de WhatsApp" on public.whatsapp_messages
  for all using (
    clinic_id in (select id from public.clinics where user_id = auth.uid())
  );

-- Trigger updated_at para whatsapp_configs
create trigger whatsapp_configs_updated_at before update on public.whatsapp_configs
  for each row execute function public.handle_updated_at();

-- Índice para búsquedas rápidas por número de teléfono Twilio
create index idx_whatsapp_configs_phone on public.whatsapp_configs(twilio_phone_number);
create index idx_whatsapp_messages_clinic_phone on public.whatsapp_messages(clinic_id, phone_number);
