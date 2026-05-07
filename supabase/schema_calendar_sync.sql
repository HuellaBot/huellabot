-- Canal de notificaciones push de Google Calendar por clínica
alter table public.google_calendar_tokens
  add column if not exists sync_token text default '',
  add column if not exists channel_id text default '',
  add column if not exists channel_expiry bigint default 0;
