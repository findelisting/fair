-- Finde x fairafric demo: initial schema.
-- See APPROACH.md section 3 for the data model and section 15 for the stress test.
--
-- Access model: every table has row-level security on and NO policies, and the
-- anon and authenticated roles get no grants. Only the server, with the secret
-- (service-role) key, reaches the data.

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

create table public.markets (
  code text primary key check (code ~ '^[A-Z]{2}$'),
  name text not null
);

create table public.collections (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  description text not null default ''
);

create table public.skus (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  variety text not null,
  format text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive'))
);

create table public.collection_skus (
  collection_id text not null references public.collections (id) on delete cascade,
  sku_id text not null references public.skus (id) on delete cascade,
  position int not null default 0,
  primary key (collection_id, sku_id)
);

create table public.campaigns (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  channel text not null check (channel in ('wrapper', 'shelf_talker', 'influencer', 'trade_fair')),
  starts_on date not null,
  ends_on date not null,
  check (ends_on >= starts_on)
);

-- A QR code. Each code carries its campaign and market (APPROACH.md section 3),
-- and points either to one SKU or to one collection.
create table public.codes (
  id text primary key check (id ~ '^[a-z0-9-]{3,32}$'),
  label text not null,
  target_type text not null check (target_type in ('product', 'feedback', 'shop', 'collection')),
  sku_id text references public.skus (id),
  collection_id text references public.collections (id),
  campaign_id text not null references public.campaigns (id),
  market text not null references public.markets (code),
  status text not null default 'active' check (status in ('active', 'inactive')),
  check (
    (target_type in ('product', 'feedback', 'shop') and sku_id is not null and collection_id is null)
    or (target_type = 'collection' and collection_id is not null and sku_id is null)
  )
);

-- ---------------------------------------------------------------------------
-- Events. `source` keeps live rows apart from synthetic rows (slice 5),
-- so every dashboard number can be badged Live or Synthetic data.
-- No IP address, name, email or other identifier is stored anywhere.
-- ---------------------------------------------------------------------------

create table public.scan_events (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  code_id text not null references public.codes (id),
  sku_id text references public.skus (id),
  collection_id text references public.collections (id),
  campaign_id text not null references public.campaigns (id),
  market text not null references public.markets (code),
  device_type text not null default 'unknown' check (device_type in ('mobile', 'tablet', 'desktop', 'unknown')),
  language text check (language is null or length(language) <= 16),
  is_bot boolean not null default false,
  source text not null default 'live' check (source in ('live', 'synthetic'))
);

create index scan_events_ts_idx on public.scan_events (ts);
create index scan_events_sku_ts_idx on public.scan_events (sku_id, ts);
create index scan_events_collection_ts_idx on public.scan_events (collection_id, ts);

create table public.page_views (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  page text not null check (page in ('product', 'feedback', 'collection')),
  sku_id text references public.skus (id),
  collection_id text references public.collections (id),
  campaign_id text references public.campaigns (id),
  market text references public.markets (code),
  source text not null default 'live' check (source in ('live', 'synthetic'))
);

create index page_views_ts_idx on public.page_views (ts);
create index page_views_page_campaign_idx on public.page_views (page, campaign_id);

create table public.feedback (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  sku_id text not null references public.skus (id),
  campaign_id text references public.campaigns (id),
  market text references public.markets (code),
  rating int not null check (rating between 1 and 5),
  taste_note text not null check (length(taste_note) <= 64),
  free_text text check (free_text is null or length(free_text) <= 500),
  themes text[] not null default '{}',
  source text not null default 'live' check (source in ('live', 'synthetic'))
);

create index feedback_sku_ts_idx on public.feedback (sku_id, ts);

-- Mock website connector: aggregates only, always synthetic.
create table public.web_aggregates (
  day date not null,
  sku_id text not null references public.skus (id),
  campaign_id text not null references public.campaigns (id),
  market text not null references public.markets (code),
  sessions int not null default 0 check (sessions >= 0),
  page_views int not null default 0 check (page_views >= 0),
  video_plays int not null default 0 check (video_plays >= 0),
  shop_clicks int not null default 0 check (shop_clicks >= 0),
  primary key (day, sku_id, campaign_id, market)
);

-- ---------------------------------------------------------------------------
-- Lock down: RLS on, no policies; anon and authenticated get nothing.
-- ---------------------------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array[
    'markets', 'collections', 'skus', 'collection_skus', 'campaigns', 'codes',
    'scan_events', 'page_views', 'feedback', 'web_aggregates'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated, public', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;

revoke all on all sequences in schema public from anon, authenticated, public;
grant usage, select on all sequences in schema public to service_role;

-- ---------------------------------------------------------------------------
-- Seed and reset. The catalogue comes from scripts/seedData.ts as one JSON payload.
-- ---------------------------------------------------------------------------

-- Upserts the catalogue. Safe to run more than once. Deletes nothing.
create or replace function public.seed_demo(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.markets (code, name)
  select x.code, x.name from jsonb_to_recordset(coalesce(payload->'markets', '[]')) as x(code text, name text)
  on conflict (code) do update set name = excluded.name;

  insert into public.collections (id, name, description)
  select x.id, x.name, coalesce(x.description, '')
  from jsonb_to_recordset(coalesce(payload->'collections', '[]')) as x(id text, name text, description text)
  on conflict (id) do update set name = excluded.name, description = excluded.description;

  insert into public.skus (id, name, variety, format, description, status)
  select x.id, x.name, x.variety, x.format, coalesce(x.description, ''), coalesce(x.status, 'active')
  from jsonb_to_recordset(coalesce(payload->'skus', '[]'))
    as x(id text, name text, variety text, format text, description text, status text)
  on conflict (id) do update set
    name = excluded.name, variety = excluded.variety, format = excluded.format,
    description = excluded.description, status = excluded.status;

  insert into public.collection_skus (collection_id, sku_id, position)
  select x.collection_id, x.sku_id, coalesce(x.position, 0)
  from jsonb_to_recordset(coalesce(payload->'collection_skus', '[]'))
    as x(collection_id text, sku_id text, position int)
  on conflict (collection_id, sku_id) do update set position = excluded.position;

  insert into public.campaigns (id, name, channel, starts_on, ends_on)
  select x.id, x.name, x.channel, x.starts_on, x.ends_on
  from jsonb_to_recordset(coalesce(payload->'campaigns', '[]'))
    as x(id text, name text, channel text, starts_on date, ends_on date)
  on conflict (id) do update set
    name = excluded.name, channel = excluded.channel,
    starts_on = excluded.starts_on, ends_on = excluded.ends_on;

  insert into public.codes (id, label, target_type, sku_id, collection_id, campaign_id, market, status)
  select x.id, x.label, x.target_type, x.sku_id, x.collection_id, x.campaign_id, x.market, coalesce(x.status, 'active')
  from jsonb_to_recordset(coalesce(payload->'codes', '[]'))
    as x(id text, label text, target_type text, sku_id text, collection_id text, campaign_id text, market text, status text)
  on conflict (id) do update set
    label = excluded.label, target_type = excluded.target_type, sku_id = excluded.sku_id,
    collection_id = excluded.collection_id, campaign_id = excluded.campaign_id,
    market = excluded.market, status = excluded.status;
end;
$$;

-- Deletes ALL data, live scans and live feedback included, then seeds again.
-- One function call is one transaction: if anything fails, the old data stays.
create or replace function public.reset_demo(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  truncate table
    public.scan_events, public.page_views, public.feedback, public.web_aggregates,
    public.codes, public.collection_skus, public.campaigns, public.skus,
    public.collections, public.markets
  restart identity;
  perform public.seed_demo(payload);
end;
$$;

revoke all on function public.seed_demo(jsonb) from public, anon, authenticated;
revoke all on function public.reset_demo(jsonb) from public, anon, authenticated;
grant execute on function public.seed_demo(jsonb) to service_role;
grant execute on function public.reset_demo(jsonb) to service_role;
