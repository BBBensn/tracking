-- ============================================================
-- Migration v1.3.1 — Vorrat-Modus
-- ============================================================

-- tracking_entries: CHECK constraint erweitern
ALTER TABLE tracking_entries
    DROP CONSTRAINT IF EXISTS tracking_entries_entry_type_check;

ALTER TABLE tracking_entries
    ADD CONSTRAINT tracking_entries_entry_type_check
    CHECK (entry_type IN ('bestand','zaehler','auffuellung','entnahme'));

-- tracking_items: CHECK constraint erweitern
ALTER TABLE tracking_items
    DROP CONSTRAINT IF EXISTS tracking_items_tracking_mode_check;

ALTER TABLE tracking_items
    ADD CONSTRAINT tracking_items_tracking_mode_check
    CHECK (tracking_mode IN ('bestand','zaehler','vorrat'));
