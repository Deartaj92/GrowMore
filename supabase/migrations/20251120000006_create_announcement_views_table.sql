-- Track which users have seen each announcement popup
create table if not exists public.announcement_views (
  id                bigint generated always as identity primary key,
  announcement_id   bigint not null references public.announcements(id) on delete cascade,
  school_id         bigint not null,
  viewer_identifier text not null,
  viewer_type       text not null,
  viewer_role       text,
  viewer_name       text,
  student_id        bigint,
  staff_id          bigint,
  user_id           bigint,
  viewer_device_id  text,
  seen_at           timestamptz not null default now()
);

create unique index if not exists announcement_views_unique_viewer
  on public.announcement_views (announcement_id, viewer_identifier);

create index if not exists announcement_views_school_idx
  on public.announcement_views (school_id, announcement_id);
