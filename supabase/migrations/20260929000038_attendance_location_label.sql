-- Human-readable place name for attendance punches (reverse geocode)

alter table public.staff_attendance_logs
  add column if not exists location_label text;

comment on column public.staff_attendance_logs.location_label is
  'Street / place name from reverse geocode; coordinates kept for maps';
