-- Pool de números de WhatsApp administrado por Huella Bot
create table public.phone_number_pool (
  id uuid default uuid_generate_v4() primary key,
  phone_number text not null unique,       -- e.g. "+5215512345678"
  twilio_sid text,                          -- Twilio PhoneNumber SID (PNxxxxxxx)
  friendly_name text,                       -- etiqueta opcional
  is_active boolean default true,           -- aprobado y listo para usar
  is_assigned boolean default false,
  clinic_id uuid references public.clinics(id) on delete set null,
  assigned_at timestamptz,
  notes text,
  created_at timestamptz default now()
);

-- Solo el service role puede leer/escribir esta tabla (sin RLS pública)
alter table public.phone_number_pool enable row level security;

-- Índices para búsqueda rápida
create index idx_pool_unassigned on public.phone_number_pool(is_active, is_assigned) where is_active = true and is_assigned = false;
create index idx_pool_clinic on public.phone_number_pool(clinic_id) where clinic_id is not null;
