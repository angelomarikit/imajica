export interface AuditEntry {
  action: string
  entity: string
  entityId: string
  metadata?: Record<string, unknown>
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  // Demo: console. Production: insert into audit_logs via Supabase with RLS.
  console.info('[audit]', entry)
}
