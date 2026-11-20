-- Finalized managed images are private, unique per note, and never signed URLs.
ALTER TABLE notes ADD COLUMN image_key text NULL;

ALTER TABLE notes ADD CONSTRAINT notes_image_key_format
  CHECK (image_key IS NULL OR image_key ~ '^notes/[a-f0-9]{32}\.(jpg|png)$');

CREATE UNIQUE INDEX notes_image_key_unique_idx
  ON notes (image_key) WHERE image_key IS NOT NULL;
