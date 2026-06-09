alter table public.projects add column if not exists testimonial_metric text;
alter table public.projects add column if not exists testimonial_metric_label text;
alter table public.projects add column if not exists testimonial_quote text;
alter table public.projects add column if not exists testimonial_client_name text;
alter table public.projects add column if not exists testimonial_client_role text;
alter table public.projects add column if not exists testimonial_image_url text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'projects_testimonial_text_length') then
    alter table public.projects add constraint projects_testimonial_text_length check (
      (testimonial_metric is null or char_length(testimonial_metric) <= 24) and
      (testimonial_metric_label is null or char_length(testimonial_metric_label) <= 120) and
      (testimonial_quote is null or char_length(testimonial_quote) <= 700) and
      (testimonial_client_name is null or char_length(testimonial_client_name) <= 140) and
      (testimonial_client_role is null or char_length(testimonial_client_role) <= 160)
    );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'projects_safe_testimonial_image_url') then
    alter table public.projects add constraint projects_safe_testimonial_image_url check (
      testimonial_image_url is null or testimonial_image_url !~* '^[[:space:]]*(javascript|data|vbscript):'
    );
  end if;
end $$;
