-- Tokens OAuth de Google Calendar por clínica
create table public.google_calendar_tokens (
  id uuid default uuid_generate_v4() primary key,
  clinic_id uuid references public.clinics(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text not null,
  expiry_date bigint,
  calendar_id text default 'primary',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Citas agendadas
create table public.appointments (
  id uuid default uuid_generate_v4() primary key,
  clinic_id uuid references public.clinics(id) on delete cascade not null,
  patient_name text not null,
  patient_phone text not null default '',
  pet_name text not null default '',
  service text not null default '',
  appointment_at timestamptz not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'completed')),
  google_event_id text default '',
  notes text default '',
  created_at timestamptz default now()
);

-- RLS
alter table public.google_calendar_tokens enable row level security;
alter table public.appointments enable row level security;

create policy "Clínica gestiona sus tokens de Google" on public.google_calendar_tokens
  for all using (
    clinic_id in (select id from public.clinics where user_id = auth.uid())
  );

create policy "Clínica gestiona sus citas" on public.appointments
  for all using (
    clinic_id in (select id from public.clinics where user_id = auth.uid())
  );

-- Trigger updated_at
create trigger google_tokens_updated_at before update on public.google_calendar_tokens
  for each row execute function public.handle_updated_at();

-- Índices
create index idx_appointments_clinic_date on public.appointments(clinic_id, appointment_at);
create index idx_appointments_status on public.appointments(clinic_id, status);
