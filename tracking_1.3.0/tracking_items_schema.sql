-- ============================================================
-- TRACKING — Kategorien & Items
-- Anhang zu tracking_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tracking_categories (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(50) NOT NULL UNIQUE,
    emoji       VARCHAR(10) DEFAULT '📦',
    color       VARCHAR(20) DEFAULT 'muted',   -- design token: green|orange|blue|muted
    sort_order  INT DEFAULT 0,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tracking_items (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id     UUID NOT NULL REFERENCES tracking_categories(id) ON DELETE CASCADE,
    -- Slug-ID für WT-Verknüpfung (spicy, zigarette, etc.) — optional
    slug            VARCHAR(50) UNIQUE,
    name            VARCHAR(100) NOT NULL,
    tracking_mode   VARCHAR(10) NOT NULL DEFAULT 'zaehler'
                        CHECK (tracking_mode IN ('bestand','zaehler')),
    base_unit       VARCHAR(20) NOT NULL DEFAULT 'Stk.',
    unit_size       NUMERIC(10,3) DEFAULT 1,   -- +1 Einheit = X base_unit
    presets         TEXT DEFAULT '',            -- kommagetrennt: "1,2,5,10"
    sort_order      INT DEFAULT 0,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_items_category ON tracking_items(category_id);
CREATE INDEX IF NOT EXISTS idx_tracking_items_slug     ON tracking_items(slug);

-- ── Seed-Daten (bestehende hardcoded Items) ──────────────────
-- Kategorien
INSERT INTO tracking_categories (name, emoji, color, sort_order) VALUES
    ('kiffen',       '🌿', 'green',  0),
    ('rauchen',      '🚬', 'orange', 1),
    ('lebensmittel', '☕', 'blue',   2)
ON CONFLICT (name) DO NOTHING;

-- Items — Kiffen
INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'weed',        'Weed',          'bestand', 'g',    0.5, '0.5,1,2,5,10', 0 FROM tracking_categories WHERE name='kiffen'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'filter-joint','Filter (Joint)','bestand', 'Stk.',10,   '10,25,50,100', 1 FROM tracking_categories WHERE name='kiffen'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'papes-joint', 'Papes (Joint)', 'bestand', 'Stk.',10,   '10,25,50,100', 2 FROM tracking_categories WHERE name='kiffen'
ON CONFLICT (slug) DO NOTHING;

-- Items — Rauchen
INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'zigarette',   'Zigarette',     'zaehler', 'Stk.',1,    '1,2,5',        0 FROM tracking_categories WHERE name='rauchen'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'spicy',       'Spicy',         'zaehler', 'Stk.',1,    '1,2,5',        1 FROM tracking_categories WHERE name='rauchen'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'ofen',        'Ofen',          'zaehler', 'Stk.',1,    '1,2',          2 FROM tracking_categories WHERE name='rauchen'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'papes-tabak', 'Papes (Tabak)', 'bestand', 'Stk.',50,   '50,100,200',   3 FROM tracking_categories WHERE name='rauchen'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'filter-tabak','Filter (Tabak)','bestand', 'Stk.',50,   '50,100,200',   4 FROM tracking_categories WHERE name='rauchen'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'tabak',       'Tabak',         'bestand', 'g',   100,  '100,250,500,1000', 5 FROM tracking_categories WHERE name='rauchen'
ON CONFLICT (slug) DO NOTHING;

-- Items — Lebensmittel
INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'kaffee',      'Kaffee',        'bestand', 'g',   250,  '100,250,500,1000', 0 FROM tracking_categories WHERE name='lebensmittel'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO tracking_items (category_id, slug, name, tracking_mode, base_unit, unit_size, presets, sort_order)
SELECT id, 'redbull',     'Red Bull',      'zaehler', 'Dose',1,    '1,2,4',        1 FROM tracking_categories WHERE name='lebensmittel'
ON CONFLICT (slug) DO NOTHING;
