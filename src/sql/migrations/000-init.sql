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
    id serial primary key,
    short_name varchar,
    long_name varchar
);

CREATE TABLE accounts (
    id varchar,
    user_id uuid,
    broker int references brokers,
    name varchar,

    total_value money,
    stock_bp money,
    option_bp money,

    should_autoupdate boolean default false,
    last_pull_time timestamptz,

    PRIMARY KEY (id, user_id)
);

CREATE UNIQUE INDEX ON accounts(user_id, id);
CREATE INDEX ON accounts(user_id);

-- A position will generally be all the trades that fit under a particular symbol.
-- It is possible to split trades on a single position into multiple positions,
-- but positions on different symbols can not be combined into one for now.
CREATE TABLE positions (
    id uuid primary key default uuid_generate_v1(),
    user_id uuid references users,
    account varchar,
    symbol varchar,
    name varchar,
    note varchar,
    tags int[],
    notional_risk money,
    profit_target_pct real,
    stop_loss real,

    active boolean default true,
    added timestamptz default now(),

    FOREIGN KEY (account, user_id) REFERENCES accounts
);

CREATE INDEX ON positions(user_id, added, active);
CREATE INDEX ON positions(user_id, account, active);
CREATE INDEX ON positions(user_id, symbol, active);
CREATE INDEX ON positions using gin(tags);

CREATE TABLE trades (
    id uuid primary key default uuid_generate_v1(),
    trade_id varchar,
    user_id uuid references users,
    position uuid references positions,

    broker_id int references brokers,

    name varchar,
    strategy_description varchar,
    tags int[],
    note varchar,
    symbol varchar,
    multiplier int default 100,

    combined_into uuid,
    traded timestamptz default now(),

    added timestamptz default now()
);

CREATE INDEX ON trades(user_id, symbol);
CREATE INDEX ON trades(position);

CREATE TABLE optionlegs (
    id uuid primary key default uuid_generate_v1(),
    user_id uuid,
    symbol varchar not null,
    price money,
    size int not null,
    call boolean not null,
    expiration date not null,
    strike money not null,
    commissions money,
    opening_trade uuid references trades,
    closing_trade uuid references trades,
    expired boolean,

    orig_delta real, -- The delta at the time that the leg was opened.
    total_profit money -- Set when a trade is closed.
);

CREATE INDEX ON optionlegs(user_id, symbol);
CREATE INDEX ON optionlegs(user_id, symbol, expiration, strike, call);
CREATE INDEX ON optionlegs(opening_trade);
CREATE INDEX ON optionlegs(closing_trade);

CREATE TABLE tags (
    id serial primary key,
    user_id uuid references users,
    name varchar not null,
    color varchar not null
);

CREATE UNIQUE INDEX ON tags(user_id, name);

INSERT INTO brokers (short_name, long_name) VALUES
    ('IB', 'Interactive Brokers'),
    ('TOS', 'ThinkOrSwim'),
    ('TW', 'TastyWorks');

CREATE TABLE historic_equity_prices (
    symbol varchar not null,
    quote_date date not null,
    iv double precision,
    opening money,
    closing money,
    high money,
    low money
);

CREATE UNIQUE INDEX ON historic_equity_prices(symbol, quote_date);
CREATE INDEX ON historic_equity_prices(symbol);

CREATE TABLE historic_equity_technicals (
    name varchar not null,
    symbol varchar not null,
    dt date not null,
    variable varchar,
    value double precision not null
);

CREATE UNIQUE INDEX ON historic_equity_technicals(name, symbol, dt, variable);

CREATE TABLE current_equity_prices (
    symbol varchar primary key,
    iv double precision,
    bid money,
    ask money,
    last money,

    updated timestamptz default now()
);

CREATE TABLE current_option_prices (
    symbol varchar not null,
    expiration date not null,
    strike money not null,
    call boolean not null,

    bid money,
    ask money,
    last money,

    iv real,
    delta real,
    gamma real,
    theta real,
    vega real,

    updated timestamptz default now()
);

CREATE UNIQUE INDEX ON current_option_prices(symbol, expiry, strike, call);
CREATE INDEX ON current_option_prices(symbol);

CREATE TABLE fetches (
    user_id uuid not null,
    type varchar not null,
    ts timestamptz default now()
);

CREATE INDEX ON fetches(user_id, type);
CREATE UNIQUE INDEX ON fetches(user_id, type, ts);