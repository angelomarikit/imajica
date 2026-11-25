/**
 * Turn database and network errors into sentences clinic staff can act on.
 * Messages we already wrote in plain language pass through unchanged.
 */

const TECHNICAL =
  /supabase|postgres|pgrst|postgrest|violat|constraint|duplicate key|relation "|column "|syntax error|row-level|jwt|schema cache|invalid input syntax|2350\d|42[pP]\d\d|permission denied|null value in column|foreign key|check constraint|stack|errno|ECONN|fetch failed/i

export function toUserMessage(input: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const raw =
    input instanceof Error
      ? input.message
      : typeof input === 'string'
        ? input
        : input && typeof input === 'object' && 'message' in input
          ? String((input as { message?: unknown }).message ?? '')
          : ''
  const message = raw.replace(/\s+/g, ' ').trim()
  if (!message) return fallback

  const friendly = translate(message)
  if (friendly) return friendly
  if (!TECHNICAL.test(message)) return message
  return fallback
}

function translate(message: string): string | null {
  if (/clients_code_key/i.test(message)) {
    return 'This patient number is already in use. Please try adding them again.'
  }
  if (/clients_email|email_key|duplicate key.*email/i.test(message)) {
    return 'A patient with this email is already on file. Search their name or number and select that record.'
  }
  if (/clients_phone|phone_key|duplicate key.*phone/i.test(message)) {
    return 'A patient with this contact number is already on file. Search and select that record.'
  }
  if (/duplicate key|unique constraint|already exists/i.test(message)) {
    return 'This is already in the system. Search for the existing record instead of creating another one.'
  }
  if (/row-level security|permission denied|not allowed|42501|PGRST301/i.test(message)) {
    return 'You don’t have access to do that. Ask your clinic manager if you need it.'
  }
  if (/jwt expired|not authenticated|session expired|not signed in|invalid claim/i.test(message)) {
    return 'Your sign-in expired. Sign in again, then try once more.'
  }
  if (/failed to fetch|networkerror|network request failed|load failed|econnreset|timeout|57014/i.test(message)) {
    return 'The connection dropped. Check the internet and try again.'
  }
  if (/schema cache|could not find the function|does not exist/i.test(message)) {
    return 'This action isn’t ready yet. Refresh the page. If it still fails, contact support.'
  }
  if (/supabase is not configured/i.test(message)) {
    return 'The clinic database isn’t connected on this device. Ask support to finish setup.'
  }
  if (/invalid input syntax for type uuid/i.test(message)) {
    return 'A linked record looks incomplete. Refresh the page and try again.'
  }
  if (/null value in column/i.test(message)) {
    return 'A required field is missing. Fill it in and try again.'
  }
  if (/value too long/i.test(message)) {
    return 'One of the fields is too long. Shorten it and try again.'
  }
  if (/foreign key|violates foreign key/i.test(message)) {
    return 'This is linked to a record that is no longer available. Refresh and try again.'
  }
  if (/check constraint/i.test(message)) {
    return 'One of the values isn’t allowed. Check the form and try again.'
  }
  if (/failed to fetch dynamically imported module|loading chunk|importing a module script failed/i.test(message)) {
    return 'The app was updated. Refresh this page, sign in again if asked, then continue.'
  }
  return null
}
