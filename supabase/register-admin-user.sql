-- Kediamanku admin user bootstrap.
-- Run this in Supabase SQL Editor after:
-- 1. You run supabase/admin-backend.sql.
-- 2. You create or login with the admin account in Supabase Auth.
--
-- Replace the email below with the email used on the admin login form.

insert into public.admin_users (user_id, email)
select id, email
from auth.users
where email = 'admin@kediamanku.com'
on conflict (user_id) do update set
  email = excluded.email;

select user_id, email, created_at
from public.admin_users
order by created_at desc;

-- Alternative if you already copied the UID from the admin page message:
-- insert into public.admin_users (user_id, email)
-- values ('PASTE_AUTH_USER_ID_HERE', 'admin@kediamanku.com')
-- on conflict (user_id) do update set email = excluded.email;
