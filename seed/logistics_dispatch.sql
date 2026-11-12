-- =====================================================================
-- DispatchIQ: Delivery Dispatch Agent (Logistics)
-- Run in Supabase -> SQL Editor. Running it again resets all data.
-- All names and data are made up.
-- =====================================================================

drop function if exists assign_delivery(text, bigint, bigint);
drop function if exists unassign_delivery(text, bigint);
drop table if exists deliveries, drivers, dispatchers cascade;

-- ---------------------------------------------------------------- tables
create table dispatchers (
  id     text primary key,
  name   text not null,
  depot  text not null
);

create table drivers (
  id             bigint generated always as identity primary key,
  dispatcher_id  text not null references dispatchers(id),
  name           text not null,
  vehicle        text not null check (vehicle in ('bike', 'van', 'truck')),
  capacity_kg    int  not null check (capacity_kg > 0),   -- max weight per delivery
  zone           text not null,                           -- area the driver covers
  max_active     int  not null default 3,                 -- max open deliveries at once
  status         text not null default 'available'
                 check (status in ('available', 'on_break', 'off_duty'))
);

create table deliveries (
  id             bigint generated always as identity primary key,
  dispatcher_id  text not null references dispatchers(id),
  customer       text not null,
  address        text not null,
  zone           text not null,
  weight_kg      int  not null check (weight_kg > 0),
  priority       text not null default 'normal' check (priority in ('urgent', 'normal')),
  deadline       time not null,                           -- deliver before this time today
  status         text not null default 'pending'
                 check (status in ('pending', 'assigned', 'in_transit', 'delivered', 'cancelled')),
  driver_id      bigint references drivers(id),
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------- data
insert into dispatchers (id, name, depot) values
  ('D001', 'Meera Nair', 'Chennai Central Depot'),
  ('D002', 'Vikram Rao', 'Coimbatore Depot');

insert into drivers (dispatcher_id, name, vehicle, capacity_kg, zone, max_active, status) values
  ('D001', 'Karthik S',   'bike',  15, 'T Nagar',    3, 'available'),
  ('D001', 'Ravi Kumar',  'van',   300, 'Adyar',     3, 'available'),
  ('D001', 'Imran Sheikh','truck', 1500, 'Guindy',   2, 'available'),
  ('D001', 'Lakshmi P',   'bike',  15, 'Adyar',      3, 'on_break'),
  ('D001', 'Suresh M',    'van',   300, 'T Nagar',   3, 'available'),
  ('D001', 'Anita Joseph','bike',  15, 'Guindy',     3, 'off_duty'),
  ('D002', 'Dinesh R',    'van',   300, 'RS Puram',  3, 'available');

insert into deliveries (dispatcher_id, customer, address, zone, weight_kg, priority, deadline, status, driver_id) values
  ('D001', 'Sakthi Pharmacy',   '12 Usman Road, T Nagar',       'T Nagar', 4,   'urgent', '11:00', 'pending',    null),
  ('D001', 'Bright Electronics','45 South Mada St, T Nagar',    'T Nagar', 12,  'normal', '15:00', 'pending',    null),
  ('D001', 'Green Grocers',     '7 LB Road, Adyar',             'Adyar',   120, 'normal', '14:00', 'pending',    null),
  ('D001', 'Anand Furniture',   '88 Sardar Patel Rd, Guindy',   'Guindy',  900, 'normal', '17:00', 'pending',    null),
  ('D001', 'City Hospital',     '3 Mount Road, Guindy',         'Guindy',  6,   'urgent', '10:30', 'pending',    null),
  ('D001', 'Book Barn',         '21 Besant Ave, Adyar',         'Adyar',   25,  'normal', '16:00', 'pending',    null),
  ('D001', 'Metro Mart',        '9 Pondy Bazaar, T Nagar',      'T Nagar', 8,   'normal', '13:00', 'assigned',   1),
  ('D001', 'Cafe Aroma',        '5 Elliots Beach Rd, Adyar',    'Adyar',   40,  'normal', '12:00', 'in_transit', 2),
  ('D002', 'Kovai Textiles',    '14 Avinashi Rd, RS Puram',     'RS Puram',60,  'normal', '15:00', 'pending',    null);

-- ---------------------------------------------------------------- functions
-- assign_delivery: all checks happen here, so the AI cannot break the rules.
create or replace function assign_delivery(p_dispatcher_id text, p_delivery_id bigint, p_driver_id bigint)
returns jsonb
language plpgsql
as $$
declare
  v_del     deliveries%rowtype;
  v_drv     drivers%rowtype;
  v_active  int;
begin
  select * into v_del from deliveries
    where id = p_delivery_id and dispatcher_id = p_dispatcher_id for update;
  if not found then raise exception 'Delivery % not found for this dispatcher.', p_delivery_id; end if;
  if v_del.status <> 'pending' then
    raise exception 'Delivery % is already %, so it cannot be assigned.', p_delivery_id, v_del.status;
  end if;

  select * into v_drv from drivers
    where id = p_driver_id and dispatcher_id = p_dispatcher_id for update;
  if not found then raise exception 'Driver % not found for this dispatcher.', p_driver_id; end if;
  if v_drv.status <> 'available' then
    raise exception '% is %, not available.', v_drv.name, replace(v_drv.status, '_', ' ');
  end if;
  if v_drv.zone <> v_del.zone then
    raise exception '% covers %, but the delivery is in %.', v_drv.name, v_drv.zone, v_del.zone;
  end if;
  if v_del.weight_kg > v_drv.capacity_kg then
    raise exception 'The parcel weighs % kg but % (%) can carry only % kg.',
      v_del.weight_kg, v_drv.name, v_drv.vehicle, v_drv.capacity_kg;
  end if;

  select count(*) into v_active from deliveries
    where driver_id = p_driver_id and status in ('assigned', 'in_transit');
  if v_active >= v_drv.max_active then
    raise exception '% already has % open deliveries (maximum %).', v_drv.name, v_active, v_drv.max_active;
  end if;

  update deliveries set status = 'assigned', driver_id = p_driver_id where id = p_delivery_id;

  return jsonb_build_object(
    'delivery_id', p_delivery_id, 'customer', v_del.customer, 'driver', v_drv.name,
    'vehicle', v_drv.vehicle, 'deadline', to_char(v_del.deadline, 'HH24:MI'),
    'driver_open_deliveries', v_active + 1, 'status', 'assigned');
end;
$$;

-- unassign_delivery: allowed only before the driver has picked it up (status = assigned).
create or replace function unassign_delivery(p_dispatcher_id text, p_delivery_id bigint)
returns jsonb
language plpgsql
as $$
declare
  v_del deliveries%rowtype;
begin
  select * into v_del from deliveries
    where id = p_delivery_id and dispatcher_id = p_dispatcher_id for update;
  if not found then raise exception 'Delivery % not found for this dispatcher.', p_delivery_id; end if;
  if v_del.status <> 'assigned' then
    raise exception 'Delivery % is %, so the driver cannot be removed.', p_delivery_id, v_del.status;
  end if;

  update deliveries set status = 'pending', driver_id = null where id = p_delivery_id;
  return jsonb_build_object('delivery_id', p_delivery_id, 'customer', v_del.customer, 'status', 'pending');
end;
$$;

-- ---------------------------------------------------------------- security
alter table dispatchers enable row level security;
alter table drivers enable row level security;
alter table deliveries enable row level security;

revoke execute on function assign_delivery(text, bigint, bigint) from public;
revoke execute on function unassign_delivery(text, bigint) from public;
grant execute on function assign_delivery(text, bigint, bigint) to service_role;
grant execute on function unassign_delivery(text, bigint) to service_role;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
notify pgrst, 'reload schema';
