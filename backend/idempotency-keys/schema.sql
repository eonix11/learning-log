CREATE TABLE idempotency_keys (
    id bigserial primary key,
    user_id bigint not null,
    key text not null,
    response jsonb,
    code int,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    status text not null default 'processing',
    locked_at timestamptz not null default now(),
    unique (user_id, key)
);

