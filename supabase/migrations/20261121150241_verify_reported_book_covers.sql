alter table public.cover_reports add column last_checked_at timestamptz;
create index cover_reports_recheck_idx on public.cover_reports (last_checked_at, book_id);

create table public.verified_book_covers (
  book_id text primary key,
  cover_url text not null,
  verified_at timestamptz not null default now()
);

alter table public.verified_book_covers enable row level security;
revoke all on public.verified_book_covers from public, anon, authenticated;
grant select on public.verified_book_covers to anon, authenticated;
grant select, insert on public.verified_book_covers to service_role;
create policy "Verified catalogue covers are public"
on public.verified_book_covers for select to anon, authenticated using (true);

create schema cover_repair_private;
revoke all on schema cover_repair_private from public;
create table cover_repair_private.settings (
  id boolean primary key default true check (id),
  secret_hash bytea not null check (octet_length(secret_hash) = 32)
);
revoke all on cover_repair_private.settings from public, anon, authenticated;
grant usage on schema cover_repair_private to service_role;
grant select on cover_repair_private.settings to service_role;

-- Claim a bounded batch and stamp every report for the selected books. The
-- transaction lock prevents overlapping invocations from claiming the same IDs.
create function public.run_cover_repair(
  p_secret text,
  p_book_id text default null,
  p_cover_url text default null
)
returns table (book_id text)
language plpgsql
set search_path = ''
as $$
begin
  if p_secret is null or p_secret !~ '^[a-f0-9]{64}$' or not exists (
    select 1 from cover_repair_private.settings
    where secret_hash = sha256(convert_to(p_secret, 'UTF8'))
  ) then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_book_id is not null or p_cover_url is not null then
    if p_book_id is null or p_cover_url is null or length(p_cover_url) > 1024
      or p_cover_url !~ '^https://(covers\.openlibrary\.org/b/|uploads\.mangadex\.org/covers/|cdn\.myanimelist\.net/images/manga/|s4\.anilist\.co/file/anilistcdn/media/manga/cover/)'
      or not exists (
        select 1 from public.cover_reports as r
        where r.book_id = p_book_id and r.last_checked_at > now() - interval '10 minutes'
      )
    then
      raise exception 'Invalid cover repair' using errcode = '22023';
    end if;
    insert into public.verified_book_covers as c (book_id, cover_url)
      values (p_book_id, p_cover_url) on conflict on constraint verified_book_covers_pkey do nothing;
    return query select p_book_id;
    return;
  end if;

  if not pg_try_advisory_xact_lock(1047126731, 29066) then
    return;
  end if;

  return query
  with due as (
    select r.book_id
    from public.cover_reports as r
    where (r.last_checked_at is null or r.last_checked_at < now() - interval '23 hours')
      and not exists (select 1 from public.verified_book_covers as c where c.book_id = r.book_id)
    group by r.book_id
    order by min(coalesce(r.last_checked_at, r.created_at)), r.book_id
    limit 8
  ), claimed as (
    update public.cover_reports as r set last_checked_at = now()
    from due where r.book_id = due.book_id
    returning r.book_id
  )
  select distinct claimed.book_id from claimed;
end;
$$;

grant select, update(last_checked_at) on public.cover_reports to service_role;
revoke all on function public.run_cover_repair(text, text, text) from public, anon, authenticated;
grant execute on function public.run_cover_repair(text, text, text) to service_role;
