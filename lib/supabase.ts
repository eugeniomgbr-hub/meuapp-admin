import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type AdminRole =
  | 'super_admin'
  | 'admin_operacional'
  | 'moderador'
  | 'suporte'
  | 'financeiro'
  | 'auditoria';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: AdminRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
}

/** Verifica se o usuario autenticado e um admin ativo e retorna seus dados */
export async function getAdminUser(): Promise<AdminUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('admin_users')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  return data ?? null;
}

/** Registra uma acao no audit log */
export async function logAction(
  admin: AdminUser,
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  await supabase.from('admin_audit_logs').insert({
    admin_user_id: admin.id,
    admin_email:   admin.email,
    admin_role:    admin.role,
    action,
    entity_type:   entityType,
    entity_id:     entityId ?? null,
    details:       details ?? null,
  });
}
