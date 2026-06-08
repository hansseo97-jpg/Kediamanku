-- Remove old Kediamanku demo rows from Supabase.
-- Run this once if you previously imported the dummy seed data.
-- This targets known demo slugs only, so real admin-entered content is left alone.

delete from public.testimonials
where slug in (
  'kitchen-bsd',
  'wardrobe-alam-sutera',
  'bedroom-bintaro',
  'kids-gading',
  'kitchen-pondok-indah',
  'wardrobe-pik',
  'bedroom-cipete',
  'kids-kelapa-gading',
  'kitchen-jaksel',
  'wardrobe-tebet',
  'bedroom-cinere',
  'kids-bekasi'
);

delete from public.catalog_products
where slug in (
  'modern-warm-kitchen-set',
  'japandi-linear-kitchen',
  'master-bedroom-wardrobe',
  'walk-in-wardrobe-system',
  'calm-bedroom-wall-panel',
  'upholstered-bed-frame',
  'kids-study-bedroom-set',
  'smart-toy-storage-wall',
  'floating-tv-cabinet',
  'compact-study-desk',
  'entryway-storage-cabinet',
  'bedside-headboard-set'
);

delete from public.projects
where slug in (
  'modern-warm-kitchen-set',
  'master-bedroom-wardrobe',
  'calm-bedroom-interior',
  'playful-kids-room',
  'apartment-storage-wall',
  'compact-apartment-kitchen'
);
