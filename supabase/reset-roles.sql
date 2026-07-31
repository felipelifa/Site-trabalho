-- Reset all profile roles so users must re-select their role
UPDATE profiles SET role = NULL;
