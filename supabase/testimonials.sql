-- Kediamanku testimonials table for Supabase.
-- Run this file only if you need the testimonials table by itself.
-- This file intentionally does not seed dummy testimonials.

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  service text not null check (service in ('Kitchen Set', 'Lemari Custom', 'Kamar Interior', 'Kamar Anak')),
  rating int not null default 5 check (rating between 1 and 5),
  testimonial_date date,
  excerpt text not null,
  detail text not null,
  client_name text not null,
  location text,
  project_name text,
  image_url text,
  image_alt text,
  is_featured boolean not null default false,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists testimonials_service_idx on public.testimonials (service);
create index if not exists testimonials_published_idx on public.testimonials (is_published);
create index if not exists testimonials_sort_idx on public.testimonials (sort_order, testimonial_date desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists testimonials_set_updated_at on public.testimonials;
create trigger testimonials_set_updated_at
before update on public.testimonials
for each row
execute function public.set_updated_at();

alter table public.testimonials enable row level security;

drop policy if exists "Public can read published testimonials" on public.testimonials;
drop policy if exists "Authenticated can manage testimonials" on public.testimonials;
drop policy if exists "Admins can manage testimonials" on public.testimonials;

create policy "Public can read published testimonials"
on public.testimonials
for select
to anon, authenticated
using (is_published = true);
