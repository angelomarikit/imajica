-- Update existing clients that match these names (no new rows / no duplicates).
-- Contact, gender, and date of birth only.

update public.clients c
set
  email = v.email,
  phone = v.phone,
  date_of_birth = v.dob::date,
  gender = v.gender,
  updated_at = now()
from (
  values
    ('Arnel Arellano', 'arnelarellano1@yahoo.com', '+639277633144', '1980-10-16', 'male'),
    ('Annalize Vega', 'annalizevega@yahoo.com', '+639178971607', '1978-01-28', 'female'),
    ('Ma Lourdes Arellano', 'abell74@gmail.com', '+639171520262', '1967-11-14', 'female'),
    ('Shaira Castillo', 'castilloshaira98@gmail.com', '+639277805896', '1998-11-12', 'female'),
    ('Marjorie Comboy', 'marjoriecomboy@gmail.com', '+639277805887', '1995-11-19', 'female'),
    ('Angeline Mae Cinco', 'angelinemaecinco@gmail.com', '+639678242863', '2005-10-30', 'female'),
    ('Catherine Bardelosa', 'katherinebardelosa@gmail.com', '+639279528695', '2001-04-04', 'female'),
    ('Rona Krisha Sayat', 'rsayatrona@gmail.com', '+639278058785', '2005-04-11', 'female'),
    ('Ma. Nelida Arnaez', 'arnaeznelida@yahoo.com', '+639177115926', '1971-06-20', 'female'),
    ('Stephen Buenaflor', 'stephenbuenaflor@gmail.com', '+639686586044', '1994-04-18', 'male'),
    ('Alyssa Buenaflor', 'alyssamarie03@gmail.com', '+639686586083', '1995-04-18', 'female'),
    ('Angelica Polinar', 'angelicapolinar2001@gmail.com', '+639272338464', '2001-08-30', 'female')
) as v(full_name, email, phone, dob, gender)
where lower(regexp_replace(c.full_name, '[^a-zA-Z0-9]', '', 'g'))
    = lower(regexp_replace(v.full_name, '[^a-zA-Z0-9]', '', 'g'));
