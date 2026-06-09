-- Kediamanku hidden SEO blog system.
-- Run this after supabase/admin-backend.sql in Supabase SQL Editor.

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique not null,
  excerpt text,
  content jsonb not null default '[]'::jsonb,
  featured_image text,
  author_name text default 'Kediamanku Editorial Team',
  author_role text default 'Interior Design & Build',
  author_avatar text,
  category text not null,
  tags text[] default '{}',
  status text check (status in ('draft', 'published')) default 'draft',
  seo_title text,
  seo_description text,
  seo_keywords text[],
  read_time_minutes int not null default 4,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.blog_posts add column if not exists read_time_minutes int not null default 4;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'blog_posts_text_length') then
    alter table public.blog_posts add constraint blog_posts_text_length check (
      char_length(title) between 1 and 180 and
      char_length(slug) between 1 and 120 and
      (excerpt is null or char_length(excerpt) <= 420) and
      char_length(category) between 1 and 80 and
      (seo_title is null or char_length(seo_title) <= 180) and
      (seo_description is null or char_length(seo_description) <= 220) and
      read_time_minutes between 1 and 60
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'blog_posts_safe_urls') then
    alter table public.blog_posts add constraint blog_posts_safe_urls check (
      (featured_image is null or featured_image !~* '^[[:space:]]*(javascript|data|vbscript):') and
      (author_avatar is null or author_avatar !~* '^[[:space:]]*(javascript|data|vbscript):')
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'blog_posts_content_is_array') then
    alter table public.blog_posts add constraint blog_posts_content_is_array check (
      jsonb_typeof(content) = 'array'
    );
  end if;
end $$;

create index if not exists blog_posts_slug_idx on public.blog_posts (slug);
create index if not exists blog_posts_status_idx on public.blog_posts (status);
create index if not exists blog_posts_category_idx on public.blog_posts (category);
create index if not exists blog_posts_published_at_idx on public.blog_posts (published_at desc);

drop trigger if exists blog_posts_set_updated_at on public.blog_posts;
create trigger blog_posts_set_updated_at
before update on public.blog_posts
for each row execute function public.set_updated_at();

alter table public.blog_posts enable row level security;

drop policy if exists "Public can read published blog posts" on public.blog_posts;
drop policy if exists "Admins can manage blog posts" on public.blog_posts;

create policy "Public can read published blog posts"
on public.blog_posts for select
to anon, authenticated
using (status = 'published' and published_at is not null and published_at <= now());

create policy "Admins can manage blog posts"
on public.blog_posts for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
