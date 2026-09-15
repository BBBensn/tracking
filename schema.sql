-- tracking.bensn.me — current schema (consolidated from migration_v1.3.0 .. v1.4.0)
-- Tables live in the shared `bensnos` Postgres DB, created/queried by the hub-api (bensn-meta repo).
-- This file is a reference snapshot, not something this repo runs migrations from.

CREATE TABLE tracking_categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(50) NOT NULL,
    emoji       VARCHAR(10),
    color       VARCHAR(20),              -- named token, e.g. "muted" — not a hex string
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tracking_items (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id       UUID REFERENCES tracking_categories(id) ON DELETE CASCADE,
    slug              VARCHAR(50) UNIQUE NOT NULL,
    name              VARCHAR(100) NOT NULL,
    tracking_mode     VARCHAR(20) CHECK (tracking_mode IN ('bestand','zaehler','vorrat')),
    base_unit         VARCHAR(20),
    unit_size         NUMERIC(10,2),
    counter_direction VARCHAR(1) DEFAULT '+',
    pack_unit         VARCHAR(20),
    pack_size         NUMERIC(10,2),
    presets           JSONB DEFAULT '[]',
    buttons           JSONB DEFAULT '[]',
    linked_items      JSONB DEFAULT '[]',   -- [{slug, amount}] cross-item deduction, e.g. cigarettes -> tabak
    sort_order        INT DEFAULT 0,
    active            BOOLEAN DEFAULT TRUE,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tracking_entries (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    item_id     UUID REFERENCES tracking_items(id) ON DELETE CASCADE,
    category    VARCHAR(50),               -- denormalized at write time (deliberate, see hub-api CLAUDE.md)
    name        VARCHAR(100),              -- denormalized at write time
    amount      NUMERIC(10,2),
    unit        VARCHAR(20),
    entry_type  VARCHAR(20) CHECK (entry_type IN ('bestand','zaehler','auffuellung','entnahme','delta')),
    date        DATE NOT NULL DEFAULT CURRENT_DATE,
    note        TEXT,
    source      VARCHAR(20) DEFAULT 'web',
    deleted     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data (current production categories/items, for reference — not re-run automatically)
-- Categories: kiffen, rauchen, lebensmittel
-- Items: weed, filter-joint, papes-joint, zigarette, spicy, ofen, papes-tabak, filter-tabak,
--        tabak, kaffee, redbull (zaehler, unit "Dose")
