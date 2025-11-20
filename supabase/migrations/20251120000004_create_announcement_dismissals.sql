create table if not exists announcement_dismissals (
    id bigint generated always as identity primary key,
    school_id bigint not null,
    announcement_id bigint not null references announcements(id) on delete cascade,
    recipient_type text not null check (recipient_type in ('student','staff')),
    recipient_id text not null,
    dismissed_at timestamp with time zone not null default timezone('utc', now()),
    created_at timestamp with time zone not null default timezone('utc', now())
);

create unique index if not exists announcement_dismissals_unique
    on announcement_dismissals (announcement_id, recipient_type, recipient_id);

create index if not exists announcement_dismissals_school_idx
    on announcement_dismissals (school_id, recipient_type, recipient_id);
