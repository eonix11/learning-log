CREATE TABLE idempotency_keys (
    id bigserial primary key,
    user_id bigint not null,
    key text not null,
    response jsonb,
    code int,
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    status text not null default 'processing',
    unique (user_id, key)
);