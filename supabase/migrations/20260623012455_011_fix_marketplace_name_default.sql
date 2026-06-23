ALTER TABLE app_settings ALTER COLUMN marketplace_name SET DEFAULT 'SuperShape';
UPDATE app_settings SET marketplace_name = 'SuperShape' WHERE id = 1;