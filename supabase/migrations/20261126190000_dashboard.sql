-- Slice 4 (ADR 0007): dashboard numbers in one call, and the "Useful and accurate?" checks.
--
-- dashboard_summary returns one JSON object, so no list is ever cut off by the API row limit.
-- Every count is split live/synthetic; bots are left out; last 60 days; days in Europe/Berlin.
-- Product view: rows for that SKU. Collection view: the collection's own code plus its member SKUs.

create or replace function public.dashboard_summary(p_view text, p_id text, p_market text default null, p_campaign text default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  since timestamptz := now() - interval '60 days';
  members text[];
  result jsonb;
begin
  if p_view not in ('product', 'collection') then
    raise exception 'unknown view %', p_view;
  end if;
  if p_view = 'collection' then
    select coalesce(array_agg(cs.sku_id), '{}') into members from public.collection_skus cs where cs.collection_id = p_id;
  else
    members := array[p_id];
  end if;

  with
  s as (
    select e.ts, e.source, e.campaign_id, e.market, coalesce(e.sku_id, '') as sku_key
    from public.scan_events e
    where not e.is_bot and e.ts >= since
      and (e.sku_id = any (members) or (p_view = 'collection' and e.collection_id = p_id))
      and (p_market is null or e.market = p_market)
      and (p_campaign is null or e.campaign_id = p_campaign)
  ),
  pv as (
    select v.page, v.source
    from public.page_views v
    where v.ts >= since
      and (v.sku_id = any (members) or (p_view = 'collection' and v.collection_id = p_id))
      and (p_market is null or v.market = p_market)
      and (p_campaign is null or v.campaign_id = p_campaign)
  ),
  f as (
    select fb.*
    from public.feedback fb
    where fb.ts >= since
      and fb.sku_id = any (members)
      and (p_market is null or fb.market = p_market)
      and (p_campaign is null or fb.campaign_id = p_campaign)
  ),
  w as (
    select wa.*
    from public.web_aggregates wa
    where wa.day >= (since at time zone 'Europe/Berlin')::date
      and wa.sku_id = any (members)
      and (p_market is null or wa.market = p_market)
      and (p_campaign is null or wa.campaign_id = p_campaign)
  )
  select jsonb_build_object(
    'asOf', now(),
    'scans', jsonb_build_object(
      'total', (select jsonb_build_object('live', count(*) filter (where source = 'live'), 'synthetic', count(*) filter (where source = 'synthetic')) from s),
      'lastLive', (select max(ts) from s where source = 'live'),
      'byDay', coalesce((select jsonb_agg(x order by x.key) from (
        select (ts at time zone 'Europe/Berlin')::date::text as key,
               count(*) filter (where source = 'live') as live, count(*) filter (where source = 'synthetic') as synthetic
        from s group by 1) x), '[]'),
      'byCampaign', coalesce((select jsonb_agg(x order by x.live + x.synthetic desc, x.key) from (
        select campaign_id as key, count(*) filter (where source = 'live') as live, count(*) filter (where source = 'synthetic') as synthetic
        from s group by 1) x), '[]'),
      'byMarket', coalesce((select jsonb_agg(x order by x.live + x.synthetic desc, x.key) from (
        select market as key, count(*) filter (where source = 'live') as live, count(*) filter (where source = 'synthetic') as synthetic
        from s group by 1) x), '[]'),
      'bySku', coalesce((select jsonb_agg(x order by x.live + x.synthetic desc, x.key) from (
        select sku_key as key, count(*) filter (where source = 'live') as live, count(*) filter (where source = 'synthetic') as synthetic
        from s where sku_key <> '' group by 1) x), '[]'),
      'collectionCode', (select jsonb_build_object('live', count(*) filter (where source = 'live'), 'synthetic', count(*) filter (where source = 'synthetic')) from s where sku_key = '')
    ),
    'pageViews', jsonb_build_object(
      'byPage', coalesce((select jsonb_agg(x order by x.key) from (
        select page as key, count(*) filter (where source = 'live') as live, count(*) filter (where source = 'synthetic') as synthetic
        from pv group by 1) x), '[]')
    ),
    'feedback', jsonb_build_object(
      'total', (select jsonb_build_object('live', count(*) filter (where source = 'live'), 'synthetic', count(*) filter (where source = 'synthetic')) from f),
      'avgRating', (select round(avg(rating)::numeric, 1) from f),
      'themes', coalesce((select jsonb_agg(x order by x.live + x.synthetic desc, x.key) from (
        select t as key, count(*) filter (where source = 'live') as live, count(*) filter (where source = 'synthetic') as synthetic
        from f, unnest(f.themes) as t group by 1) x), '[]'),
      'recent', coalesce((select jsonb_agg(x order by x.ts desc) from (
        select ts, sku_id as sku, rating, taste_note as "tasteNote", free_text as "freeText", campaign_id as campaign, market
        from f where source = 'live' order by ts desc limit 5) x), '[]')
    ),
    'web', jsonb_build_object(
      'total', (select jsonb_build_object(
        'sessions', coalesce(sum(sessions), 0), 'pageViews', coalesce(sum(page_views), 0),
        'videoPlays', coalesce(sum(video_plays), 0), 'shopClicks', coalesce(sum(shop_clicks), 0)) from w),
      'byDay', coalesce((select jsonb_agg(x order by x.key) from (
        select day::text as key, sum(sessions) as sessions from w group by 1) x), '[]')
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.dashboard_summary(text, text, text, text) from public, anon, authenticated;
grant execute on function public.dashboard_summary(text, text, text, text) to service_role;

-- "Useful and accurate?" answers on the insight cards (ADR 0001 amendment 2, ADR 0007 decision 5).
-- Card id, answer and time only: no user, no session, no address.
create table public.insight_checks (
  id bigint generated always as identity primary key,
  ts timestamptz not null default now(),
  card_id text not null check (card_id ~ '^[a-z-]{2,20}:[a-z0-9-]{2,40}$'),
  answer text not null check (answer in ('up', 'down'))
);

alter table public.insight_checks enable row level security;
alter table public.insight_checks force row level security;
revoke all on table public.insight_checks from anon, authenticated, public;
grant all on table public.insight_checks to service_role;
revoke all on all sequences in schema public from anon, authenticated, public;
grant usage, select on all sequences in schema public to service_role;
