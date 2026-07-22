-- Seed default salary rules + update settings for all existing users
-- Run this in Supabase SQL Editor

-- 1. Update settings: base_salary=970, meal_allowance=90, payment_day=15
UPDATE settings SET
  base_salary = 970,
  meal_allowance = 90,
  payment_day = 15
WHERE base_salary = 0 OR base_salary IS NULL;

-- 2. Delete old rules and seed defaults for all users
DELETE FROM salary_rules;

DO $$
DECLARE
  uid UUID;
BEGIN
  FOR uid IN SELECT id FROM auth.users LOOP
    INSERT INTO salary_rules (user_id, name, type, amount, condition_type, condition_value, city, day_of_week, is_holiday, is_vacation, is_absence, active, priority) VALUES
      (uid, 'Semana Lisboa/Algarve', 'base', 140, 'week_city', 'Lisboa', 'Lisboa', NULL, FALSE, FALSE, FALSE, TRUE, 10),
      (uid, 'Semana Porto', 'base', 50, 'week_city', 'Porto', 'Porto', NULL, FALSE, FALSE, FALSE, TRUE, 10),
      (uid, 'Sábado Lisboa/Algarve', 'overtime', 110, 'saturday', 'Lisboa', 'Lisboa', 6, FALSE, FALSE, FALSE, TRUE, 20),
      (uid, 'Sábado Porto', 'overtime', 80, 'saturday', 'Porto', 'Porto', 6, FALSE, FALSE, FALSE, TRUE, 20),
      (uid, 'Feriado', 'bonus', 80, 'holiday', NULL, NULL, NULL, TRUE, FALSE, FALSE, TRUE, 30),
      (uid, 'Férias', 'bonus', 80, 'vacation', NULL, NULL, NULL, FALSE, TRUE, FALSE, TRUE, 30),
      (uid, 'Falta normal', 'deduction', -80, 'absence', 'normal', NULL, NULL, FALSE, FALSE, TRUE, TRUE, 40),
      (uid, 'Falta segunda', 'deduction', -240, 'absence', 'monday', NULL, 1, FALSE, FALSE, TRUE, TRUE, 50),
      (uid, 'Falta sexta', 'deduction', -240, 'absence', 'friday', NULL, 5, FALSE, FALSE, TRUE, TRUE, 50),
      (uid, 'Adicional Diário Porto', 'bonus', 10, 'city_bonus', 'Porto', 'Porto', NULL, FALSE, FALSE, FALSE, TRUE, 15),
      (uid, 'Adicional Diário Lisboa/Algarve', 'bonus', 30, 'city_bonus', 'Lisboa', 'Lisboa', NULL, FALSE, FALSE, FALSE, TRUE, 15),
      (uid, 'Adicional Sexta-feira Lisboa/Algarve', 'bonus', 20, 'friday_bonus', 'Lisboa', 'Lisboa', 5, FALSE, FALSE, FALSE, TRUE, 25);
  END LOOP;
END $$;
