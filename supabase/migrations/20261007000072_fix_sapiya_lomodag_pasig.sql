-- Correct Sapiya Lomodag (employee 026): real email is lomodag@, clinic is Pasig.
-- Older kiosk seed used "Lomodah" + San Mateo and never matched checkout / sales tags.

update public.profiles
set full_name = 'Sapiya Lomodag'
where email = 'sapiya.lomodag@imajica.com'
  and full_name is distinct from 'Sapiya Lomodag';

-- If a legacy seed account was created with the misspelled email, mark inactive
-- (do not delete auth users from SQL).
update public.profiles
set status = 'inactive'
where email = 'sapiya.lomodah@imajica.com'
  and status = 'active';

update public.staff
set
  full_name = 'Sapiya Lomodag',
  email = 'sapiya.lomodag@imajica.com'
where email = 'sapiya.lomodah@imajica.com'
   or (email = 'sapiya.lomodag@imajica.com' and full_name is distinct from 'Sapiya Lomodag');
