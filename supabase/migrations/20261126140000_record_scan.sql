-- record_scan(): one round trip for the QR redirect (ADR 0002, decision 2).
-- Looks up the code; when it is active and p_record is true, inserts one live scan_events row;
-- returns the code's target. Unknown code: no row. Inactive code: returned, nothing recorded.
-- No IP address or other identifier is passed in or stored.

create or replace function public.record_scan(
  p_code text,
  p_record boolean,
  p_device text,
  p_language text,
  p_is_bot boolean
)
returns table (
  status text,
  target_type text,
  sku_id text,
  collection_id text,
  campaign_id text,
  market text
)
language plpgsql
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  c public.codes%rowtype;
begin
  select * into c from public.codes where public.codes.id = p_code;
  if not found then
    return;
  end if;

  if c.status = 'active' and p_record then
    insert into public.scan_events
      (code_id, sku_id, collection_id, campaign_id, market, device_type, language, is_bot, source)
    values
      (c.id, c.sku_id, c.collection_id, c.campaign_id, c.market, p_device, p_language, coalesce(p_is_bot, false), 'live');
  end if;

  return query select c.status, c.target_type, c.sku_id, c.collection_id, c.campaign_id, c.market;
end;
$$;

revoke all on function public.record_scan(text, boolean, text, text, boolean) from public, anon, authenticated;
grant execute on function public.record_scan(text, boolean, text, text, boolean) to service_role;
