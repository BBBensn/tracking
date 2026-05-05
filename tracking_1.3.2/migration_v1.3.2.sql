-- ============================================================
-- Migration v1.3.2 — Zähler-Richtung + Packungshierarchie
-- ============================================================

-- Neue Spalten in tracking_items
ALTER TABLE tracking_items
    ADD COLUMN IF NOT EXISTS counter_direction VARCHAR(1) DEFAULT '+',
    ADD COLUMN IF NOT EXISTS pack_unit  VARCHAR(20) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS pack_size  NUMERIC(10,3) DEFAULT NULL;

-- Vorhandene Items: Richtung setzen wo sinnvoll
-- (alle bisherigen sind + außer nichts explizit gesetzt)
UPDATE tracking_items SET counter_direction = '+' WHERE counter_direction IS NULL;
