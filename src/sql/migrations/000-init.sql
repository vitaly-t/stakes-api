CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id uuid primary key default uuid_generate_v4(),
    email varchar,
    name varchar,
    pw_hash varchar,
    info jsonb
);

CREATE UNIQUE INDEX ON users(email);

CREATE TABLE brokers (
    id uuid primary key default uuid_generate_v1(),
    short_name varchar,
    long_name varchar
);

CREATE TABLE positions (
    id uuid primary key default uuid_generate_v1(),
    user_id uuid references users,
    symbol varchar,
    name varchar,
    note varchar,

    broker uuid references brokers,
    active boolean default true,

    added timestamptz default now()
);

CREATE INDEX ON positions(user_id, added, active);
CREATE INDEX ON positions(user_id, broker, active);
CREATE INDEX ON positions(user_id, symbol, active);

CREATE TABLE combos (
    id uuid primary key default uuid_generate_v1(),
    user_id uuid references users, -- not used yet
    position uuid references positions,
    name varchar not null
);

CREATE INDEX ON combos(user_id, position);

CREATE TABLE trades (
    id uuid primary key default uuid_generate_v1(),
    user_id uuid references users, -- not used yet
    position uuid references positions,
    combo uuid references combos,

    name varchar,
    note varchar,
    size int,
    price money,
    multiplier int,
    commissions money,
    notional_risk money,

    traded timestamptz not null,

    added timestamptz default now()
);

CREATE INDEX ON trades(user_id, position);

CREATE TABLE tags (
    id serial primary key,
    user_id uuid references users, -- Not used yet
    name varchar not null,
    color varchar not null
);

CREATE UNIQUE INDEX ON tags(user_id, name);

CREATE TABLE position_tags (
    position uuid not null references positions on delete cascade,
    tag int not null references tags on delete cascade
);

CREATE INDEX ON position_tags(position);
CREATE INDEX ON position_tags(tag);

INSERT INTO brokers (short_name, long_name) VALUES
    ('IB', 'Interactive Brokers'),
    ('TOS', 'ThinkOrSwim'),
    ('TW', 'TastyWorks');
