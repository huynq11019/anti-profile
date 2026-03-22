ALTER TABLE profiles ADD COLUMN fingerprint_seed INTEGER;

UPDATE profiles
SET fingerprint_seed = (abs(random()) % 900000) + 100000
WHERE fingerprint_seed IS NULL;
