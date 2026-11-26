-- Slice 5 (ADR 0005): replace all synthetic history in one transaction.
-- Deletes only rows marked source = 'synthetic' (live scans, page views and feedback stay),
-- and all of web_aggregates, which is synthetic by design. Then inserts the payload
-- produced by lib/synthetic.ts. If anything fails, the old synthetic rows stay.
create or replace function public.replace_synthetic(payload jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.scan_events where source = 'synthetic';
  delete from public.page_views where source = 'synthetic';
  delete from public.feedback where source = 'synthetic';
  delete from public.web_aggregates;

  insert into public.scan_events (ts, code_id, sku_id, collection_id, campaign_id, market, device_type, language, is_bot, source)
  select x.ts, x.code_id, x.sku_id, x.collection_id, x.campaign_id, x.market, x.device_type, x.language, false, 'synthetic'
  from jsonb_to_recordset(coalesce(payload->'scan_events', '[]')) as x(
    ts timestamptz, code_id text, sku_id text, collection_id text, campaign_id text, market text, device_type text, language text);

  insert into public.page_views (ts, page, sku_id, collection_id, campaign_id, market, source)
  select x.ts, x.page, x.sku_id, x.collection_id, x.campaign_id, x.market, 'synthetic'
  from jsonb_to_recordset(coalesce(payload->'page_views', '[]')) as x(
    ts timestamptz, page text, sku_id text, collection_id text, campaign_id text, market text);

  insert into public.feedback (ts, sku_id, campaign_id, market, rating, taste_note, free_text, themes, source)
  select x.ts, x.sku_id, x.campaign_id, x.market, x.rating, x.taste_note, x.free_text, x.themes, 'synthetic'
  from jsonb_to_recordset(coalesce(payload->'feedback', '[]')) as x(
    ts timestamptz, sku_id text, campaign_id text, market text, rating int, taste_note text, free_text text, themes text[]);

  insert into public.web_aggregates (day, sku_id, campaign_id, market, sessions, page_views, video_plays, shop_clicks)
  select x.day, x.sku_id, x.campaign_id, x.market, x.sessions, x.page_views, x.video_plays, x.shop_clicks
  from jsonb_to_recordset(coalesce(payload->'web_aggregates', '[]')) as x(
    day date, sku_id text, campaign_id text, market text, sessions int, page_views int, video_plays int, shop_clicks int);
end;
$$;

revoke all on function public.replace_synthetic(jsonb) from public, anon, authenticated;
grant execute on function public.replace_synthetic(jsonb) to service_role;
