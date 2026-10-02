import type { Client } from '@/types'

/** Known customer contact profiles (phone, gender, DOB, sessions) to merge into registry. */
export type ClientProfileSeed = {
  fullName: string
  email: string
  phone: string
  gender: 'female' | 'male'
  dateOfBirth: string
  sessionsCount: number
}

export const CLIENT_PROFILE_SEED: ClientProfileSeed[] = [
  {
    fullName: 'Arnel Arellano',
    email: 'arnelarellano1@yahoo.com',
    phone: '+639277633144',
    gender: 'male',
    dateOfBirth: '1980-10-16',
    sessionsCount: 6,
  },
  {
    fullName: 'Annalize Vega',
    email: 'annalizevega@yahoo.com',
    phone: '+639178971607',
    gender: 'female',
    dateOfBirth: '1978-01-28',
    sessionsCount: 38,
  },
  {
    fullName: 'Ma Lourdes Arellano',
    email: 'abell74@gmail.com',
    phone: '+639171520262',
    gender: 'female',
    dateOfBirth: '1967-11-14',
    sessionsCount: 18,
  },
  {
    fullName: 'Shaira Castillo',
    email: 'castilloshaira98@gmail.com',
    phone: '+639277805896',
    gender: 'female',
    dateOfBirth: '1998-11-12',
    sessionsCount: 7,
  },
  {
    fullName: 'Marjorie Comboy',
    email: 'marjoriecomboy@gmail.com',
    phone: '+639277805887',
    gender: 'female',
    dateOfBirth: '1995-11-19',
    sessionsCount: 1,
  },
  {
    fullName: 'Angeline Mae Cinco',
    email: 'angelinemaecinco@gmail.com',
    phone: '+639678242863',
    gender: 'female',
    dateOfBirth: '2005-10-30',
    sessionsCount: 0,
  },
  {
    fullName: 'Catherine Bardelosa',
    email: 'katherinebardelosa@gmail.com',
    phone: '+639279528695',
    gender: 'female',
    dateOfBirth: '2001-04-04',
    sessionsCount: 7,
  },
  {
    fullName: 'Rona Krisha Sayat',
    email: 'rsayatrona@gmail.com',
    phone: '+639278058785',
    gender: 'female',
    dateOfBirth: '2005-04-11',
    sessionsCount: 7,
  },
  {
    fullName: 'Ma. Nelida Arnaez',
    email: 'arnaeznelida@yahoo.com',
    phone: '+639177115926',
    gender: 'female',
    dateOfBirth: '1971-06-20',
    sessionsCount: 2,
  },
  {
    fullName: 'Stephen Buenaflor',
    email: 'stephenbuenaflor@gmail.com',
    phone: '+639686586044',
    gender: 'male',
    dateOfBirth: '1994-04-18',
    sessionsCount: 18,
  },
  {
    fullName: 'Alyssa Buenaflor',
    email: 'alyssamarie03@gmail.com',
    phone: '+639686586083',
    gender: 'female',
    dateOfBirth: '1995-04-18',
    sessionsCount: 0,
  },
  {
    fullName: 'Angelica Polinar',
    email: 'angelicapolinar2001@gmail.com',
    phone: '+639272338464',
    gender: 'female',
    dateOfBirth: '2001-08-30',
    sessionsCount: 3,
  },
]

export function normalizeClientName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\./g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '')
}

export function findClientProfileSeed(
  client: Pick<Client, 'fullName' | 'email'>,
): ClientProfileSeed | undefined {
  const nameKey = normalizeClientName(client.fullName)
  const emailKey = client.email?.trim().toLowerCase()
  return CLIENT_PROFILE_SEED.find((p) => {
    if (normalizeClientName(p.fullName) === nameKey) return true
    if (emailKey && p.email.toLowerCase() === emailKey) return true
    return false
  })
}
