/**
 * PayMongo integration must run server-side (Supabase Edge Functions).
 * Frontend only initiates checkout and polls status — never holds secret keys.
 */
export interface CreatePaymentIntentInput {
  amount: number
  currency?: 'PHP'
  description: string
  saleId: string
}

export async function createPayMongoCheckout(input: CreatePaymentIntentInput): Promise<{ checkoutUrl?: string; reference: string }> {
  const reference = `pm_${input.saleId}_${Date.now()}`
  // Placeholder: invoke supabase.functions.invoke('paymongo-create-payment', { body: input })
  return { reference, checkoutUrl: undefined }
}

export async function verifyPayMongoPayment(reference: string): Promise<'pending' | 'paid' | 'failed'> {
  void reference
  // Placeholder: server verifies with PayMongo API using secret key
  return 'pending'
}
