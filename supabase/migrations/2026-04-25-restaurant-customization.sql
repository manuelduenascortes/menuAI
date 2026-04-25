alter table restaurants
  add column if not exists primary_color text not null default '#8B5E3C';

alter table restaurants
  add column if not exists font_style text not null default 'clasico';

update restaurants
set
  primary_color = coalesce(primary_color, '#8B5E3C'),
  font_style = coalesce(font_style, 'clasico')
where primary_color is null or font_style is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_primary_color_check'
  ) then
    alter table restaurants
      add constraint restaurants_primary_color_check
      check (primary_color ~ '^#[0-9A-Fa-f]{6}$');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_font_style_check'
  ) then
    alter table restaurants
      add constraint restaurants_font_style_check
      check (font_style in ('clasico', 'elegante', 'moderno', 'casual', 'minimalista'));
  end if;
end $$;

insert into storage.buckets (id, name, public)
values ('restaurant-logos', 'restaurant-logos', true)
on conflict (id) do update set public = excluded.public;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public read restaurant-logos'
  ) then
    create policy "Public read restaurant-logos"
      on storage.objects for select
      using (bucket_id = 'restaurant-logos');
  end if;
end $$;
