-- Kediamanku admin backend for Supabase.
-- Run this file in Supabase SQL Editor.
--
-- Setup steps after running:
-- 1. Create an admin account in Supabase Auth.
-- 2. Copy that user's Auth UID.
-- 3. Insert the UID into public.admin_users with the statement near the bottom.
-- 4. Put your anon public key in supabase-config.js.

create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.has_unsafe_url(urls text[])
returns boolean
language sql
immutable
as $$
  select exists (
    select 1
    from unnest(coalesce(urls, '{}'::text[])) as url_value
    where url_value ~* '^[[:space:]]*(javascript|data|vbscript):'
  );
$$;

grant execute on function public.has_unsafe_url(text[]) to anon, authenticated;

create table if not exists public.catalog_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  product_code text,
  category text not null check (category in ('Kitchen Set', 'Lemari Custom', 'Kamar Interior', 'Kamar Anak')),
  description text not null,
  material text not null,
  size text,
  finishing text,
  production_time text,
  packaging_installation text,
  price_range text not null default 'By quotation',
  price_value numeric not null default 0,
  image_url text,
  images text[] not null default '{}',
  image_alt text,
  link_url text,
  newest int not null default 0,
  popular int not null default 0,
  featured boolean not null default false,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catalog_products add column if not exists product_code text;
alter table public.catalog_products add column if not exists size text;
alter table public.catalog_products add column if not exists finishing text;
alter table public.catalog_products add column if not exists production_time text;
alter table public.catalog_products add column if not exists packaging_installation text;
alter table public.catalog_products add column if not exists images text[] not null default '{}';

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null check (category in ('Kitchen Set', 'Lemari Custom', 'Kamar Interior', 'Kamar Anak', 'Storage', 'Apartment', 'House')),
  location text,
  project_year int,
  area_scope text,
  materials text,
  image_url text,
  image_alt text,
  tags text[] not null default '{}',
  is_featured boolean not null default false,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  service_interest text check (
    service_interest is null or
    service_interest in ('Kitchen Set', 'Lemari Custom', 'Kamar Interior', 'Kamar Anak', 'General Consultation')
  ),
  message text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'closed', 'archived')),
  source text not null default 'website',
  website text,
  form_started_at timestamptz,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.leads add column if not exists website text;
alter table public.leads add column if not exists form_started_at timestamptz;
alter table public.leads add column if not exists user_agent text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_public_text_lengths'
  ) then
    alter table public.leads
    add constraint leads_public_text_lengths
    check (
      char_length(name) <= 160 and
      char_length(coalesce(phone, '')) <= 40 and
      char_length(coalesce(email, '')) <= 180 and
      char_length(coalesce(message, '')) <= 2000 and
      char_length(coalesce(source, '')) <= 80 and
      char_length(coalesce(website, '')) <= 200 and
      char_length(coalesce(user_agent, '')) <= 260
    );
  end if;
end $$;

create or replace function public.is_valid_public_lead(
  _phone text,
  _email text,
  _website text,
  _form_started_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int := 0;
  clean_phone text := nullif(trim(coalesce(_phone, '')), '');
  clean_email text := nullif(lower(trim(coalesce(_email, ''))), '');
begin
  if nullif(trim(coalesce(_website, '')), '') is not null then
    return false;
  end if;

  if _form_started_at is null then
    return false;
  end if;

  if now() - _form_started_at < interval '3 seconds' then
    return false;
  end if;

  if now() - _form_started_at > interval '2 hours' then
    return false;
  end if;

  if clean_phone is null and clean_email is null then
    return false;
  end if;

  select count(*)
  into recent_count
  from public.leads
  where created_at > now() - interval '10 minutes'
    and (
      (clean_phone is not null and phone = clean_phone) or
      (clean_email is not null and lower(email) = clean_email)
    );

  return recent_count < 3;
end;
$$;

grant execute on function public.is_valid_public_lead(text, text, text, timestamptz) to anon, authenticated;

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

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  role text not null,
  bio text,
  image_url text,
  image_alt text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'catalog_products_name_length') then
    alter table public.catalog_products add constraint catalog_products_name_length check (char_length(name) between 1 and 140);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_products_text_length') then
    alter table public.catalog_products add constraint catalog_products_text_length check (
      char_length(description) <= 3000 and
      char_length(material) <= 1600 and
      char_length(price_range) <= 120
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_products_safe_urls') then
    alter table public.catalog_products add constraint catalog_products_safe_urls check (
      (image_url is null or image_url !~* '^[[:space:]]*(javascript|data|vbscript):') and
      (link_url is null or link_url !~* '^[[:space:]]*(javascript|data|vbscript):') and
      public.has_unsafe_url(images) = false
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_products_detail_text_length') then
    alter table public.catalog_products add constraint catalog_products_detail_text_length check (
      (product_code is null or char_length(product_code) <= 80) and
      (size is null or char_length(size) <= 220) and
      (finishing is null or char_length(finishing) <= 220) and
      (production_time is null or char_length(production_time) <= 160) and
      (packaging_installation is null or char_length(packaging_installation) <= 320) and
      (array_length(images, 1) is null or array_length(images, 1) <= 12)
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'catalog_products_safe_gallery_urls') then
    alter table public.catalog_products add constraint catalog_products_safe_gallery_urls check (
      public.has_unsafe_url(images) = false
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'projects_text_length') then
    alter table public.projects add constraint projects_text_length check (
      char_length(title) between 1 and 160 and
      (location is null or char_length(location) <= 160) and
      (area_scope is null or char_length(area_scope) <= 260) and
      (materials is null or char_length(materials) <= 320)
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'projects_safe_image_url') then
    alter table public.projects add constraint projects_safe_image_url check (
      image_url is null or image_url !~* '^[[:space:]]*(javascript|data|vbscript):'
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'testimonials_text_length') then
    alter table public.testimonials add constraint testimonials_text_length check (
      char_length(title) between 1 and 160 and
      char_length(excerpt) <= 600 and
      char_length(detail) <= 3000 and
      char_length(client_name) between 1 and 140
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'testimonials_safe_image_url') then
    alter table public.testimonials add constraint testimonials_safe_image_url check (
      image_url is null or image_url !~* '^[[:space:]]*(javascript|data|vbscript):'
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'team_members_text_length') then
    alter table public.team_members add constraint team_members_text_length check (
      char_length(name) between 1 and 140 and
      char_length(role) between 1 and 140 and
      (bio is null or char_length(bio) <= 1000)
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'team_members_safe_image_url') then
    alter table public.team_members add constraint team_members_safe_image_url check (
      image_url is null or image_url !~* '^[[:space:]]*(javascript|data|vbscript):'
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'leads_text_length') then
    alter table public.leads add constraint leads_text_length check (
      char_length(name) between 1 and 140 and
      (phone is null or char_length(phone) <= 80) and
      (email is null or char_length(email) <= 160) and
      (message is null or char_length(message) <= 1600)
    );
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kediamanku-images',
  'kediamanku-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists catalog_products_category_idx on public.catalog_products (category);
create index if not exists catalog_products_published_idx on public.catalog_products (is_published);
create index if not exists catalog_products_sort_idx on public.catalog_products (sort_order, created_at desc);
create index if not exists projects_category_idx on public.projects (category);
create index if not exists projects_published_idx on public.projects (is_published);
create index if not exists projects_sort_idx on public.projects (sort_order, created_at desc);
create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists testimonials_service_idx on public.testimonials (service);
create index if not exists testimonials_published_idx on public.testimonials (is_published);
create index if not exists testimonials_sort_idx on public.testimonials (sort_order, testimonial_date desc);
create index if not exists team_members_published_idx on public.team_members (is_published);
create index if not exists team_members_sort_idx on public.team_members (sort_order, created_at asc);

drop trigger if exists catalog_products_set_updated_at on public.catalog_products;
create trigger catalog_products_set_updated_at
before update on public.catalog_products
for each row execute function public.set_updated_at();

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists leads_set_updated_at on public.leads;
create trigger leads_set_updated_at
before update on public.leads
for each row execute function public.set_updated_at();

drop trigger if exists testimonials_set_updated_at on public.testimonials;
create trigger testimonials_set_updated_at
before update on public.testimonials
for each row execute function public.set_updated_at();

drop trigger if exists team_members_set_updated_at on public.team_members;
create trigger team_members_set_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

alter table public.admin_users enable row level security;
alter table public.catalog_products enable row level security;
alter table public.projects enable row level security;
alter table public.leads enable row level security;
alter table public.testimonials enable row level security;
alter table public.team_members enable row level security;

drop policy if exists "Admins can read admin users" on public.admin_users;
create policy "Admins can read admin users"
on public.admin_users for select
to authenticated
using (public.is_admin());

drop policy if exists "Public can read published catalog products" on public.catalog_products;
drop policy if exists "Admins can manage catalog products" on public.catalog_products;
create policy "Public can read published catalog products"
on public.catalog_products for select
to anon, authenticated
using (is_published = true);
create policy "Admins can manage catalog products"
on public.catalog_products for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read published projects" on public.projects;
drop policy if exists "Admins can manage projects" on public.projects;
create policy "Public can read published projects"
on public.projects for select
to anon, authenticated
using (is_published = true);
create policy "Admins can manage projects"
on public.projects for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can submit leads" on public.leads;
drop policy if exists "Admins can view leads" on public.leads;
drop policy if exists "Admins can update leads" on public.leads;
drop policy if exists "Admins can delete leads" on public.leads;
create policy "Public can submit leads"
on public.leads for insert
to anon, authenticated
with check (public.is_valid_public_lead(phone, email, website, form_started_at));
create policy "Admins can view leads"
on public.leads for select
to authenticated
using (public.is_admin());
create policy "Admins can update leads"
on public.leads for update
to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "Admins can delete leads"
on public.leads for delete
to authenticated
using (public.is_admin());

drop policy if exists "Public can read published testimonials" on public.testimonials;
drop policy if exists "Authenticated can manage testimonials" on public.testimonials;
drop policy if exists "Admins can manage testimonials" on public.testimonials;
create policy "Public can read published testimonials"
on public.testimonials for select
to anon, authenticated
using (is_published = true);
create policy "Admins can manage testimonials"
on public.testimonials for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read published team members" on public.team_members;
drop policy if exists "Admins can manage team members" on public.team_members;
create policy "Public can read published team members"
on public.team_members for select
to anon, authenticated
using (is_published = true);
create policy "Admins can manage team members"
on public.team_members for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Public can read Kediamanku images" on storage.objects;
drop policy if exists "Admins can upload Kediamanku images" on storage.objects;
drop policy if exists "Admins can update Kediamanku images" on storage.objects;
drop policy if exists "Admins can delete Kediamanku images" on storage.objects;

create policy "Public can read Kediamanku images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'kediamanku-images');

create policy "Admins can upload Kediamanku images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'kediamanku-images' and public.is_admin());

create policy "Admins can update Kediamanku images"
on storage.objects for update
to authenticated
using (bucket_id = 'kediamanku-images' and public.is_admin())
with check (bucket_id = 'kediamanku-images' and public.is_admin());

create policy "Admins can delete Kediamanku images"
on storage.objects for delete
to authenticated
using (bucket_id = 'kediamanku-images' and public.is_admin());

-- Replace the UID and email below after creating the admin account in Supabase Auth.
-- insert into public.admin_users (user_id, email)
-- values ('PASTE_AUTH_USER_ID_HERE', 'admin@kediamanku.com')
-- on conflict (user_id) do update set email = excluded.email;
