-- Schema del backend Sponky Squad.
-- Eseguire nella SQL Editor di Neon (o con psql) PRIMA del primo deploy.

-- Estensione per gen_random_uuid(), disponibile su Neon senza permessi extra.
create extension if not exists pgcrypto;

-- ═══════════════════════════════════════════════════════════════════════
--  UTENTI
-- ═══════════════════════════════════════════════════════════════════════
create table if not exists users (
  id                uuid primary key default gen_random_uuid(),

  -- identita' (campi del vecchio form di iscruzione)
  first_name        text not null,
  last_name         text not null,
  email             text not null,
  password_hash     text not null,          -- bcrypt, mai in chiaro
  cap               text not null,
  age_range         text not null,          -- '18-25' | '25-35' | '35-45' | '45'
  card_number       integer not null,       -- tessera personalizzata 2..999
  group_name        text not null default 'Nessun gruppo',

  -- checkbox multiple, salvate come array di stringhe
  riding_styles     text[] not null default '{}',
  discount_interests text[] not null default '{}',

  -- consensi
  privacy_accepted  boolean not null default false,
  privacy_accepted_at timestamptz,
  newsletter        boolean not null default false,

  -- identificativi mostrati in /account e sulla tessera
  member_id         text not null unique,   -- codice univoco tipo SS-4F2K-9XQ1

  -- stato account
  is_active         boolean not null default true,
  is_admin          boolean not null default false,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- l'email e' la credenziale di login: univoca e case-insensitive.
-- La normalizziamo a minuscolo PRIMA del confronto, quindi unique su lowercase.
create unique index if not exists users_email_lower_key on users (lower(email));
create index if not exists users_is_active_idx on users (is_active);

-- il numero tessera e' "personalizzabile" ma deve restare univoco
create unique index if not exists users_card_number_key on users (card_number)
  where card_number is not null;

-- ═══════════════════════════════════════════════════════════════════════
--  RICHIESTE PARTNER
-- ═══════════════════════════════════════════════════════════════════════
create table if not exists partner_requests (
  id            uuid primary key default gen_random_uuid(),
  first_name    text not null,
  last_name     text not null,
  company       text not null,
  email         text not null,
  phone         text not null,
  message       text not null,
  privacy_accepted boolean not null default false,

  status        text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected')),

  created_at    timestamptz not null default now(),
  reviewed_at   timestamptz
);

create index if not exists partner_requests_status_idx on partner_requests (status);
create index if not exists partner_requests_created_idx on partner_requests (created_at desc);

-- ═══════════════════════════════════════════════════════════════════════
--  RATE LIMITING (brute-force su login utente e admin)
-- ═══════════════════════════════════════════════════════════════════════
-- Contiamo i tentativi FALLITI per combinazione ip+email+scope.
-- Ogni serverless function ha la sua memoria, quindi il contatore deve
-- stare nel database: e' l'unico posto condiviso fra le istanze.
create table if not exists login_attempts (
  id            bigserial primary key,
  bucket        text not null,        -- hash di ip+email+scope, mai l'indirizzo in chiaro
  scope         text not null,        -- 'user' | 'admin'
  attempted_at  timestamptz not null default now()
);

create index if not exists login_attempts_bucket_idx
  on login_attempts (bucket, attempted_at desc);

-- ═══════════════════════════════════════════════════════════════════════
--  SESSIONI REVOCABILI
-- ═══════════════════════════════════════════════════════════════════════
-- Il JWT e' autosufficiente, ma senza una lista di revoca non puoi mai
-- disconnettere davvero un account. token_version permette di invalidare
-- TUTTI i token emessi prima di un certo punto incrementando il numero.
alter table users add column if not exists token_version integer not null default 1;

-- ═══════════════════════════════════════════════════════════════════════
--  TRIGGER updated_at
-- ═══════════════════════════════════════════════════════════════════════
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists users_updated_at on users;
create trigger users_updated_at before update on users
  for each row execute function set_updated_at();
