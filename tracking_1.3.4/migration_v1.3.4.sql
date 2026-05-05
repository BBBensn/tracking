-- Migration v1.3.4 — delta entry_type + VARCHAR fix
ALTER TABLE tracking_entries ALTER COLUMN entry_type TYPE VARCHAR(20);

ALTER TABLE tracking_entries
    DROP CONSTRAINT IF EXISTS tracking_entries_entry_type_check;
ALTER TABLE tracking_entries
    ADD CONSTRAINT tracking_entries_entry_type_check
    CHECK (entry_type IN ('bestand','zaehler','auffuellung','entnahme','delta'));
