-- Venue directory (/espacios): event spaces people can browse on a list or map and request a quote for.
-- Writes go through the Next.js server with the service role, like the rest of the schema.

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  owner_id uuid references public.profiles (id) on delete set null,
  name text not null,
  kind text not null default 'otro' check (kind in (
    'salon', 'hotel', 'rooftop', 'bar', 'restaurante', 'club', 'centro_convenciones',
    'teatro', 'museo', 'estadio', 'playa', 'naturaleza', 'otro')),
  zone text not null default '',
  address text,
  lat double precision,
  lng double precision,
  description text not null default '',
  capacity_min int check (capacity_min is null or capacity_min > 0),
  capacity_max int check (capacity_max is null or capacity_max > 0),
  price_from numeric(10,2) check (price_from is null or price_from >= 0),
  amenities text[] not null default '{}',
  cover_url text,
  gallery_urls text[] not null default '{}',
  website text,
  instagram text,
  phone text,
  status text not null default 'pending_review' check (status in ('live', 'pending_review', 'hidden')),
  featured boolean not null default false,
  created_at timestamptz not null default now()
);
create index venues_status_idx on public.venues (status);

-- Quote requests, either for one venue or a general "help me find a space" request (venue_id null).
create table public.venue_requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues (id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  event_type text,
  event_date date,
  guests int check (guests is null or guests > 0),
  budget text,
  message text not null default '',
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);
create index venue_requests_created_idx on public.venue_requests (created_at desc);

alter table public.venues enable row level security;
alter table public.venue_requests enable row level security;
create policy "public live venues" on public.venues for select using (status = 'live');
-- venue_requests: no public policies; only the server (service role) reads and writes them.

-- Starter directory: well-known Panama City event venues. Locations from OpenStreetMap.
-- Capacity, prices and photos are left empty until confirmed with each venue.
insert into public.venues (slug, name, kind, zone, address, lat, lng, status) values
  ('centro-de-convenciones-atlapa', 'Centro de Convenciones Atlapa', 'centro_convenciones', 'San Francisco', 'Avenida Cincuentenario, Boca La Caja', 8.989650, -79.499977, 'live'),
  ('figali-convention-center', 'Figali Convention Center', 'centro_convenciones', 'Amador', 'Avenida Amador, Ancón', 8.939646, -79.546458, 'live'),
  ('ciudad-del-saber', 'Ciudad del Saber', 'centro_convenciones', 'Clayton', 'Ciudad del Saber, Ancón', 8.999575, -79.583482, 'live'),
  ('biomuseo', 'Biomuseo', 'museo', 'Amador', 'Calzada de Amador, Ancón', 8.931930, -79.544767, 'live'),
  ('museo-del-canal-interoceanico', 'Museo del Canal Interoceánico', 'museo', 'Casco Viejo', 'Plaza de la Independencia, San Felipe', 8.951786, -79.534671, 'live'),
  ('teatro-nacional-de-panama', 'Teatro Nacional de Panamá', 'teatro', 'Casco Viejo', 'Avenida B, San Felipe', 8.952850, -79.533103, 'live'),
  ('arena-roberto-duran', 'Arena Roberto Durán', 'estadio', 'Juan Díaz', 'Campo Lindbergh, Juan Díaz', 9.032959, -79.471018, 'live'),
  ('estadio-rommel-fernandez', 'Estadio Rommel Fernández', 'estadio', 'Juan Díaz', 'Campo Lindbergh, Juan Díaz', 9.035869, -79.469473, 'live'),
  ('hotel-el-panama', 'Hotel El Panamá', 'hotel', 'El Cangrejo', 'Vía España, El Cangrejo', 8.983274, -79.528859, 'live'),
  ('jw-marriott-panama', 'JW Marriott Panama', 'hotel', 'Punta Pacífica', 'Calle Punta Colón, Punta Pacífica', 8.975508, -79.506983, 'live'),
  ('hilton-panama', 'Hilton Panama', 'hotel', 'Bella Vista', 'Avenida Balboa, Marbella', 8.976156, -79.522733, 'live'),
  ('waldorf-astoria-panama', 'Waldorf Astoria Panama', 'hotel', 'Bella Vista', 'Calle 47, Marbella', 8.976983, -79.524674, 'live'),
  ('riu-plaza-panama', 'RIU Plaza Panamá', 'hotel', 'Bella Vista', 'Calle 50, Marbella', 8.981111, -79.521017, 'live'),
  ('sortis-hotel', 'Sortis Hotel', 'hotel', 'Obarrio', 'Avenida Abel Bravo, Obarrio', 8.987595, -79.520544, 'live'),
  ('hard-rock-hotel-panama-megapolis', 'Hard Rock Hotel Panama Megapolis', 'hotel', 'Punta Paitilla', 'Avenida Balboa, Paitilla', 8.977441, -79.517504, 'live'),
  ('the-santa-maria-hotel-golf-resort', 'The Santa Maria Hotel & Golf Resort', 'hotel', 'Santa María', 'Santa María Business District', 9.027564, -79.450892, 'live'),
  ('american-trade-hotel', 'American Trade Hotel', 'hotel', 'Casco Viejo', 'Plaza Herrera, San Felipe', 8.952353, -79.536885, 'live'),
  ('sofitel-legend-casco-viejo', 'Sofitel Legend Casco Viejo', 'hotel', 'Casco Viejo', 'Calle Central, San Felipe', 8.951634, -79.531965, 'live'),
  ('hotel-central-panama', 'Hotel Central Panamá', 'hotel', 'Casco Viejo', 'Plaza de la Independencia, San Felipe', 8.952445, -79.534232, 'live'),
  ('tantalo-hotel', 'Tántalo Hotel', 'rooftop', 'Casco Viejo', 'Calle 8 y Avenida B, San Felipe', 8.952997, -79.536846, 'live'),
  ('club-union', 'Club Unión', 'club', 'Punta Paitilla', 'Calle Tomás Gabriel Duque, Punta Paitilla', 8.975477, -79.510441, 'live'),
  ('club-de-golf-de-panama', 'Club de Golf de Panamá', 'club', 'Cerro Viejo', 'Ernesto Córdoba Campos', 9.087614, -79.474189, 'live'),
  ('gamboa-rainforest-resort', 'Gamboa Rainforest Resort', 'naturaleza', 'Gamboa', 'Boulevard Goethals, Gamboa', 9.121687, -79.692603, 'live'),
  ('the-westin-playa-bonita', 'The Westin Playa Bonita', 'playa', 'Playa Bonita', 'Playa Bonita, Veracruz', 8.898867, -79.576092, 'live');
