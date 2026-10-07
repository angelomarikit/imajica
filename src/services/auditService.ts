export interface AuditEntry {
  action: string
  entity: string
  entityId: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  // Production: insert into audit_logs via Supabase with RLS.
  // Keep console quiet — spam here freezes DevTools when browsing customer profiles.
  if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_AUDIT === '1') {
    console.info('[audit]', entry)
  }
}
