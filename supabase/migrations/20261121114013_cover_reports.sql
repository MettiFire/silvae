create table public.cover_reports (
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Catalogue results may be reported before a book is added to a library.
  book_id text not null check (char_length(book_id) between 1 and 512),
  book_title text not null check (char_length(btrim(book_title)) between 1 and 500),
  book_authors text not null check (char_length(book_authors) <= 1000),
  created_at timestamptz not null default now(),
  primary key (user_id, book_id)
);

alter table public.cover_reports enable row level security;
revoke all on public.cover_reports from public, anon, authenticated;
grant select on public.cover_reports to authenticated;
grant insert (user_id, book_id, book_title, book_authors) on public.cover_reports to authenticated;

create policy "Readers can see their cover reports"
on public.cover_reports for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Readers can create their cover reports"
on public.cover_reports for insert to authenticated
with check ((select auth.uid()) = user_id);
