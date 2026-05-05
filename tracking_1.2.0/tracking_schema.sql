-- ============================================================
-- TRACKING — Bestand & Zähler
-- Anhang zu bensn Personal OS schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS tracking_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Item-Referenz (entspricht ITEMS[].id im Frontend)
    item_id         VARCHAR(50) NOT NULL,
    category        VARCHAR(50) NOT NULL,   -- kiffen | rauchen | lebensmittel
    name            VARCHAR(100) NOT NULL,

    -- Wert
    amount          NUMERIC(10,3) NOT NULL,
    unit            VARCHAR(20)  NOT NULL,  -- g | Stk. | Dose | ml

    -- Logiktyp
    entry_type      VARCHAR(10) NOT NULL    -- 'bestand' | 'zaehler'
        CHECK (entry_type IN ('bestand','zaehler')),

    -- Datum in Vienna-Zeit (für Tages-Gruppierung ohne TZ-Probleme)
    date            DATE NOT NULL,

    -- Optional
    note            TEXT,

    -- Metadaten
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    timestamp       TIMESTAMPTZ DEFAULT NOW(),  -- alias für Frontend-Kompatibilität
    source          VARCHAR(20) DEFAULT 'pwa',
    deleted         BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_tracking_item_id   ON tracking_entries(item_id);
CREATE INDEX idx_tracking_date      ON tracking_entries(date DESC);
CREATE INDEX idx_tracking_category  ON tracking_entries(category);
CREATE INDEX idx_tracking_type      ON tracking_entries(entry_type);
CREATE INDEX idx_tracking_ts        ON tracking_entries(timestamp DESC);
