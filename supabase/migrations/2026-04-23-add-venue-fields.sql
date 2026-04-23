alter table restaurants
  add column if not exists venue_type text not null default 'restaurant';

alter table restaurants
  add column if not exists menu_access_mode text not null default 'both';

update restaurants
set
  venue_type = coalesce(venue_type, 'restaurant'),
  menu_access_mode = coalesce(menu_access_mode, 'both')
where venue_type is null or menu_access_mode is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_venue_type_check'
  ) then
    alter table restaurants
      add constraint restaurants_venue_type_check
      check (venue_type in ('restaurant', 'bar_cafe', 'cocktail_bar'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'restaurants_menu_access_mode_check'
  ) then
    alter table restaurants
      add constraint restaurants_menu_access_mode_check
      check (menu_access_mode in ('general_qr', 'table_qr', 'both'));
  end if;
end $$;
