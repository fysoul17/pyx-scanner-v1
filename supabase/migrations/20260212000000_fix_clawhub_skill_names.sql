-- Fix ClawHub skills that have displayName stored as name
-- Move the current name (displayName) to description, replace name with clawhub_slug
UPDATE skills
SET
  description = name,
  name = clawhub_slug
WHERE source = 'clawhub'
  AND clawhub_slug IS NOT NULL
  AND name != clawhub_slug;
