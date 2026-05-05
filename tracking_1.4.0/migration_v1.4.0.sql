-- ============================================================
-- Migration v1.4.0 — Multi-Buttons & Verknüpfte Buchungen
-- ============================================================

-- Neue Spalten in tracking_items
ALTER TABLE tracking_items
    ADD COLUMN IF NOT EXISTS buttons JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS linked_items JSONB DEFAULT '[]';

-- buttons Format:
-- [{"label": "+1", "amount": 1}, {"label": "+1 Pkg.", "amount": 30}, {"label": "-1", "amount": -1}]

-- linked_items Format:
-- [{"item_slug": "filter-tabak", "amount": -1}, {"item_slug": "papes-tabak", "amount": -1}]

-- entry_type VARCHAR erweitern falls noch nicht passiert
ALTER TABLE tracking_entries ALTER COLUMN entry_type TYPE VARCHAR(20);
