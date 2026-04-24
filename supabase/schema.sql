-- MenuAI - Schema completo para Supabase
-- Ejecutar en el SQL Editor de Supabase

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================
-- TABLA: restaurants
-- ============================================
create table if not exists restaurants (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  venue_type text not null default 'restaurant' check (venue_type in ('restaurant', 'bar_cafe', 'cocktail_bar')),
  menu_access_mode text not null default 'both' check (menu_access_mode in ('general_qr', 'table_qr', 'both')),
  description text,
  logo_url text,
  address text,
  phone text,
  trial_ends_at timestamptz default (now() + interval '14 days'),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  establishment_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Migración para BD existentes:
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz DEFAULT (now() + interval '14 days');
-- UPDATE restaurants SET trial_ends_at = created_at + interval '14 days' WHERE trial_ends_at IS NULL;
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS venue_type text NOT NULL DEFAULT 'restaurant';
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS menu_access_mode text NOT NULL DEFAULT 'both';
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_customer_id text;
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS subscription_status text;
-- ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS establishment_type text;

-- ============================================
-- TABLA: tables (mesas)
-- ============================================
create table if not exists tables (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  number integer not null,
  label text,
  qr_code_url text,
  created_at timestamptz default now(),
  unique(restaurant_id, number)
);

-- ============================================
-- TABLA: categories (categorías de carta)
-- ============================================
create table if not exists categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  name text not null,
  description text,
  emoji text,
  display_order integer default 0,
  created_at timestamptz default now()
);

-- ============================================
-- TABLA: allergens (alergenos estándar)
-- ============================================
create table if not exists allergens (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text
);

-- Insertar alergenos estándar (14 de la UE)
insert into allergens (name, icon) values
  ('Gluten', '🌾'),
  ('Crustáceos', '🦐'),
  ('Huevo', '🥚'),
  ('Pescado', '🐟'),
  ('Cacahuetes', '🥜'),
  ('Soja', '🫘'),
  ('Lácteos', '🥛'),
  ('Frutos de cáscara', '🌰'),
  ('Apio', '🌿'),
  ('Mostaza', '🟡'),
  ('Sésamo', '🌱'),
  ('Dióxido de azufre', '⚗️'),
  ('Altramuces', '🌸'),
  ('Moluscos', '🦪')
on conflict (name) do nothing;

-- ============================================
-- TABLA: dietary_tags (etiquetas dietéticas)
-- ============================================
create table if not exists dietary_tags (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  icon text,
  color text
);

insert into dietary_tags (name, icon, color) values
  ('Vegetariano', '🥗', 'green'),
  ('Vegano', '🌱', 'emerald'),
  ('Halal', '☪️', 'teal'),
  ('Kosher', '✡️', 'blue'),
  ('Sin gluten', '🚫🌾', 'yellow'),
  ('Sin lactosa', '🚫🥛', 'orange'),
  ('Sin azúcar', '🚫🍬', 'pink'),
  ('Picante', '🌶️', 'red')
on conflict (name) do nothing;

-- ============================================
-- TABLA: menu_items (platos)
-- ============================================
create table if not exists menu_items (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references categories(id) on delete cascade not null,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  available boolean default true,
  display_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- TABLA: ingredients (ingredientes por plato)
-- ============================================
create table if not exists ingredients (
  id uuid primary key default uuid_generate_v4(),
  menu_item_id uuid references menu_items(id) on delete cascade not null,
  name text not null
);

-- ============================================
-- TABLA: menu_item_allergens (relación N:N)
-- ============================================
create table if not exists menu_item_allergens (
  menu_item_id uuid references menu_items(id) on delete cascade,
  allergen_id uuid references allergens(id) on delete cascade,
  primary key (menu_item_id, allergen_id)
);

-- ============================================
-- TABLA: menu_item_tags (relación N:N)
-- ============================================
create table if not exists menu_item_tags (
  menu_item_id uuid references menu_items(id) on delete cascade,
  tag_id uuid references dietary_tags(id) on delete cascade,
  primary key (menu_item_id, tag_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Restaurants: solo el propietario puede modificar
alter table restaurants enable row level security;
create policy "Propietario gestiona su restaurante"
  on restaurants for all
  using (auth.uid() = user_id);

create policy "Carta pública visible por todos"
  on restaurants for select
  using (true);

-- Tables: propietario gestiona, público lee
alter table tables enable row level security;
create policy "Propietario gestiona mesas"
  on tables for all
  using (
    restaurant_id in (
      select id from restaurants where user_id = auth.uid()
    )
  );
create policy "Mesas públicas"
  on tables for select
  using (true);

-- Categories
alter table categories enable row level security;
create policy "Propietario gestiona categorías"
  on categories for all
  using (
    restaurant_id in (
      select id from restaurants where user_id = auth.uid()
    )
  );
create policy "Categorías públicas"
  on categories for select
  using (true);

-- Menu items
alter table menu_items enable row level security;
create policy "Propietario gestiona platos"
  on menu_items for all
  using (
    category_id in (
      select c.id from categories c
      join restaurants r on r.id = c.restaurant_id
      where r.user_id = auth.uid()
    )
  );
create policy "Platos públicos"
  on menu_items for select
  using (true);

-- Ingredients
alter table ingredients enable row level security;
create policy "Ingredientes públicos"
  on ingredients for select
  using (true);
create policy "Propietario gestiona ingredientes"
  on ingredients for all
  using (
    menu_item_id in (
      select mi.id from menu_items mi
      join categories c on c.id = mi.category_id
      join restaurants r on r.id = c.restaurant_id
      where r.user_id = auth.uid()
    )
  );

-- Allergens y dietary_tags son públicos
alter table allergens enable row level security;
create policy "Alergenos públicos" on allergens for select using (true);

alter table dietary_tags enable row level security;
create policy "Tags públicos" on dietary_tags for select using (true);

-- menu_item_allergens
alter table menu_item_allergens enable row level security;
create policy "Relación alergenos pública" on menu_item_allergens for select using (true);
create policy "Propietario gestiona alergenos de plato"
  on menu_item_allergens for all
  using (
    menu_item_id in (
      select mi.id from menu_items mi
      join categories c on c.id = mi.category_id
      join restaurants r on r.id = c.restaurant_id
      where r.user_id = auth.uid()
    )
  );

-- menu_item_tags
alter table menu_item_tags enable row level security;
create policy "Relación tags pública" on menu_item_tags for select using (true);
create policy "Propietario gestiona tags de plato"
  on menu_item_tags for all
  using (
    menu_item_id in (
      select mi.id from menu_items mi
      join categories c on c.id = mi.category_id
      join restaurants r on r.id = c.restaurant_id
      where r.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCIÓN: updated_at automático
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger restaurants_updated_at
  before update on restaurants
  for each row execute function update_updated_at();

create trigger menu_items_updated_at
  before update on menu_items
  for each row execute function update_updated_at();

-- ============================================
-- RPC: Atomic update of menu item + relations
-- Prevents data loss if insert fails after delete
-- ============================================
create or replace function update_menu_item_full(
  p_item_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_ingredient_names text[],
  p_allergen_ids uuid[],
  p_tag_ids uuid[]
) returns void as $$
begin
  -- Verify ownership: caller must own the restaurant that owns this item
  if not exists (
    select 1 from menu_items mi
    join categories c on c.id = mi.category_id
    join restaurants r on r.id = c.restaurant_id
    where mi.id = p_item_id and r.user_id = auth.uid()
  ) then
    raise exception 'No autorizado';
  end if;

  update menu_items
  set name = p_name, description = p_description, price = p_price
  where id = p_item_id;

  delete from ingredients where menu_item_id = p_item_id;
  delete from menu_item_allergens where menu_item_id = p_item_id;
  delete from menu_item_tags where menu_item_id = p_item_id;

  if array_length(p_ingredient_names, 1) > 0 then
    insert into ingredients (menu_item_id, name)
      select p_item_id, unnest(p_ingredient_names);
  end if;

  if array_length(p_allergen_ids, 1) > 0 then
    insert into menu_item_allergens (menu_item_id, allergen_id)
      select p_item_id, unnest(p_allergen_ids);
  end if;

  if array_length(p_tag_ids, 1) > 0 then
    insert into menu_item_tags (menu_item_id, tag_id)
      select p_item_id, unnest(p_tag_ids);
  end if;
end;
$$ language plpgsql security definer;

-- ============================================
-- TABLA: chat_usage (control de uso mensual)
-- ============================================
create table if not exists chat_usage (
  restaurant_id uuid references restaurants(id) on delete cascade not null,
  month_key text not null, -- formato: '2026-04'
  count integer not null default 0,
  primary key (restaurant_id, month_key)
);

alter table chat_usage enable row level security;
create policy "Chat usage público lectura" on chat_usage for select using (true);

-- RPC: Incrementar contador de uso (upsert atómico)
create or replace function increment_chat_usage(
  p_restaurant_id uuid,
  p_month_key text
) returns integer as $$
declare
  new_count integer;
begin
  insert into chat_usage (restaurant_id, month_key, count)
  values (p_restaurant_id, p_month_key, 1)
  on conflict (restaurant_id, month_key)
  do update set count = chat_usage.count + 1
  returning count into new_count;

  return new_count;
end;
$$ language plpgsql security definer;

-- ============================================
-- ÍNDICES para foreign keys (rendimiento queries)
-- ============================================
create index if not exists idx_categories_restaurant_id on categories(restaurant_id);
create index if not exists idx_menu_items_category_id on menu_items(category_id);
create index if not exists idx_tables_restaurant_id on tables(restaurant_id);
create index if not exists idx_ingredients_menu_item_id on ingredients(menu_item_id);
create index if not exists idx_menu_item_allergens_menu_item_id on menu_item_allergens(menu_item_id);
create index if not exists idx_menu_item_tags_menu_item_id on menu_item_tags(menu_item_id);

-- ============================================
-- Storage: menu-images bucket
-- ============================================
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

-- Anyone can read (public bucket)
create policy "Public read menu-images"
  on storage.objects for select
  using (bucket_id = 'menu-images');

-- Authenticated users can upload
create policy "Auth users upload menu-images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'menu-images');

-- Authenticated users can delete their uploads
create policy "Auth users delete menu-images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'menu-images');
