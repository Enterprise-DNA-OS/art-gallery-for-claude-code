create function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
create table artists (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), name text not null unique, country text not null default 'NZ', biography text not null default '');
create trigger touch_artists before update on artists for each row execute function touch_updated();
create table contacts (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), external_id text unique, name text not null, email text not null default '', interests text not null default '', marketing_consent boolean not null default false, last_contact date, notes text not null default '');
create trigger touch_contacts before update on contacts for each row execute function touch_updated();
create table artworks (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), external_id text not null unique, title text not null, artist_id uuid not null references artists, medium text not null default '', dimensions text not null default '', year text not null default '', currency text not null default 'NZD' check(currency ~ '^[A-Z]{3}$'), price_cents bigint not null default 0 check(price_cents>=0), status text not null default 'available' check(status in ('available','reserved','sold','returned')), location text not null default 'Unverified', condition_note text not null default '', condition_date date, provenance text not null default '', image_files text not null default '', raw_import jsonb not null default '{}');
create trigger touch_artworks before update on artworks for each row execute function touch_updated();
create table consignments (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), artwork_id uuid not null unique references artworks, consignor text not null, starts_on date not null, ends_on date not null, commission_pct numeric(5,2) not null check(commission_pct between 0 and 100), agreement_ref text not null default '', returned_on date, check(ends_on>=starts_on));
create trigger touch_consignments before update on consignments for each row execute function touch_updated();
create table sales (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), ref text not null unique, artwork_id uuid not null unique references artworks, contact_id uuid not null references contacts, sold_on date not null, due_on date not null, currency text not null check(currency ~ '^[A-Z]{3}$'), total_cents bigint not null check(total_cents>0), paid_cents bigint not null default 0 check(paid_cents>=0 and paid_cents<=total_cents), artist_due_cents bigint not null check(artist_due_cents>=0 and artist_due_cents<=total_cents), artist_paid_cents bigint not null default 0 check(artist_paid_cents>=0 and artist_paid_cents<=artist_due_cents), market text not null check(market in ('AU','NZ','OTHER')), resale boolean not null default false, royalty_status text not null default 'unreviewed' check(royalty_status in ('unreviewed','reported','not-applicable')), royalty_evidence text not null default '', check(due_on>=sold_on));
create trigger touch_sales before update on sales for each row execute function touch_updated();
create table offers (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), artwork_id uuid not null references artworks, contact_id uuid not null references contacts, offered_on date not null default current_date, followup_on date not null, state text not null default 'open' check(state in ('open','won','lost')), notes text not null default '');
create trigger touch_offers before update on offers for each row execute function touch_updated();
create table exhibitions (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), name text not null unique, opens_on date not null, closes_on date not null, venue text not null, check(closes_on>=opens_on));
create trigger touch_exhibitions before update on exhibitions for each row execute function touch_updated();
create table exhibition_artworks (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), exhibition_id uuid not null references exhibitions, artwork_id uuid not null references artworks, unique(exhibition_id,artwork_id));
create trigger touch_exhibition_artworks before update on exhibition_artworks for each row execute function touch_updated();
create table movements (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), artwork_id uuid not null references artworks, moved_on date not null default current_date, from_location text not null, to_location text not null, note text not null default '');
create trigger touch_movements before update on movements for each row execute function touch_updated();
create table notes (id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), contact_id uuid not null references contacts, noted_on date not null default current_date, body text not null);
create trigger touch_notes before update on notes for each row execute function touch_updated();

create index offers_followup_idx on offers(followup_on) where state='open';
create index sales_due_idx on sales(due_on);
create view inventory as
select w.id,w.external_id as stock,w.title,a.name as artist,w.status,w.location,w.currency,w.price_cents,w.condition_date,w.condition_note,w.provenance
from artworks w join artists a on a.id=w.artist_id;
create view consignment_due as
select c.id,w.external_id as stock,w.title,a.name as artist,c.consignor,c.ends_on,c.ends_on-current_date as days_left,c.agreement_ref,c.commission_pct,w.currency,w.price_cents
from consignments c join artworks w on w.id=c.artwork_id join artists a on a.id=w.artist_id
where c.returned_on is null and w.status not in ('sold','returned');
create view settlements as
select s.id,s.ref,a.name as artist,c.consignor,w.title,s.sold_on,s.due_on,s.currency,s.total_cents,s.paid_cents,s.total_cents-s.paid_cents as collector_balance_cents,
s.artist_due_cents,s.artist_paid_cents,s.artist_due_cents-s.artist_paid_cents as artist_balance_cents,
case when s.paid_cents=s.total_cents then 'ready' else 'await collector payment' end as settlement_status
from sales s join artworks w on w.id=s.artwork_id join artists a on a.id=w.artist_id left join consignments c on c.artwork_id=w.id;
create view collector_followups as
select o.id,o.artwork_id,c.name as collector,w.title,a.name as artist,o.followup_on,current_date-o.followup_on as days_overdue,w.status,c.marketing_consent,o.notes
from offers o join contacts c on c.id=o.contact_id join artworks w on w.id=o.artwork_id join artists a on a.id=w.artist_id where o.state='open';
create view royalty_checks as
select s.id,s.ref,w.title,s.market,s.currency,s.total_cents,s.sold_on,s.royalty_status,s.royalty_evidence,
case when s.market='AU' and s.currency='AUD' and s.total_cents>=100000 then 'AU resale reporting review'
when s.market='AU' and s.currency<>'AUD' then 'AU conversion and reporting review'
when s.market='NZ' then 'NZ scheme review'
else 'No automated jurisdiction check' end as review,
case when s.market='AU' and s.currency='AUD' and s.total_cents>=100000 then round(s.total_cents*0.05)::bigint else null end as indicative_royalty_cents
from sales s join artworks w on w.id=s.artwork_id where s.resale;
create view attention as
select 'consignment' as kind,stock as reference,title as item,case when agreement_ref='' then 'Missing written agreement reference' else 'Consignment expires within 14 days' end as reason
from consignment_due where agreement_ref='' or days_left<=14
union all select 'collector',ref,title,'Collector payment overdue' from settlements where due_on<current_date and collector_balance_cents>0
union all select 'settlement',ref,title,'Artist payment ready to record' from settlements where settlement_status='ready' and artist_balance_cents>0
union all select 'followup',id::text,collector||': '||title,'Collector follow-up overdue' from collector_followups where days_overdue>0
union all select 'condition',stock,title,'Condition check missing or older than 90 days (house rule)' from inventory where status in ('available','reserved') and (condition_date is null or condition_date<current_date-90)
union all select 'royalty',ref,title,review from royalty_checks where royalty_status='unreviewed';
