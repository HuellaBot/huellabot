alter table public.services
  add column if not exists duration_minutes integer default 30;

alter table public.appointments
  add column if not exists patient_email text default '',
  add column if not exists duration_minutes integer default 30;
