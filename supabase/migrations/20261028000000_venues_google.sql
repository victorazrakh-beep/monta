-- Venues imported from Google Maps (through DataForSEO), like a directory that owners can later claim.

alter table public.venues
  add column source text not null default 'monta' check (source in ('monta', 'google')),
  add column google_cid text unique,
  add column category text,
  add column rating numeric(2,1) check (rating is null or rating between 0 and 5),
  add column reviews_count int not null default 0,
  add column imported_at timestamptz;
