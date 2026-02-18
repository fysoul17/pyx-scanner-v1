-- Add GitHub popularity metrics to skills table
ALTER TABLE skills ADD COLUMN github_stars INTEGER;
ALTER TABLE skills ADD COLUMN github_forks INTEGER;
ALTER TABLE skills ADD COLUMN github_is_private BOOLEAN;
