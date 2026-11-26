-- reset_demo() failed with "must be owner of sequence scan_events_id_seq":
-- TRUNCATE ... RESTART IDENTITY needs ownership of the identity sequences, and
-- service_role is not their owner. Rather than raising the function's privileges
-- (SECURITY DEFINER), drop RESTART IDENTITY: row ids simply keep counting up
-- across resets, which nothing depends on.

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
    public.collections, public.markets;
  perform public.seed_demo(payload);
end;
$$;

revoke all on function public.reset_demo(jsonb) from public, anon, authenticated;
grant execute on function public.reset_demo(jsonb) to service_role;
