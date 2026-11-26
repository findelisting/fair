-- One answer per form render (ADR 0003, decision 7).
-- Each feedback form carries a random token. A second submit with the same token is ignored.
-- The token is random per form, so it cannot link answers to a person.
-- Nullable: synthetic feedback (slice 5) has no token.

alter table public.feedback
  add column submission_id uuid;

alter table public.feedback
  add constraint feedback_submission_id_key unique (submission_id);
