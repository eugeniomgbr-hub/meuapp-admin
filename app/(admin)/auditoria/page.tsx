'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface AuditLog {
  id: string;
  admin_email: string;
  admin_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

const ACTION_LABEL: Record<string, string> = {
  apply_warning:        'Advertencia aplicada',
  apply_suspend:        'Suspensao aplicada',
  apply_ban:            'Banimento aplicado',
  apply_limit:          'Limitacao aplicada',
  remove_sanction:      'Sancao removida',
  suspend_ecosystem:    'Ecossistema suspenso',
  reactivate_ecosystem: 'Ecossistema reativado',
  delete_post:          'Post removido',
  delete_comment:       'Comentario removido',
};

const ACTION_COLOR: Record<string, string> = {
  apply_warning:        'bg-yellow-100 text-yellow-700',
  apply_suspend:        'bg-orange-100 text-orange-700',
  apply_ban:            'bg-red-100 text-red-700',
  remove_sanction:      'bg-green-100 text-green-700',
  suspend_ecosystem:    'bg-red-100 text-red-700',
  reactivate_ecosystem: 'bg-green-100 text-green-700',
  delete_post:          'bg-gray-100 text-gray-700',
  delete_comment:       'bg-gray-100 text-gray-700',
};

const ROLE_LABEL: Record<string, string> = {
  super_admin:       'Super Admin',
  admin_operacional: 'Admin Op.',
  moderador:         'Moderador',
  suporte:           'Suporte',
  financeiro:        'Financeiro',
  auditoria:         'Auditoria',
};

export default function AuditoriaPage() {
  const [logs, setLogs]         = useState<AuditLog[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (search.trim()) {
        query = query.or(`admin_email.ilike.%${search}%,action.ilike.%${search}%,entity_id.ilike.%${search}%`);
      }
      if (entityFilter !== 'all') {
        query = query.eq('entity_type', entityFilter);
      }

      const { data } = await query;
      setLogs(data || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, entityFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const fmtDate = (d: string) =>
    new Date(d).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const entities = ['all', 'user', 'ecosystem', 'post', 'comment', 'group'];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Auditoria</h1>
        <p className="text-gray-500 text-sm mt-1">
          Historico de todas as acoes administrativas · Retencao: 90 dias
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por admin, acao ou id..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900
                       outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"/>
        </div>
        <div className="flex gap-2 flex-wrap">
          {entities.map(e => (
            <button key={e} onClick={() => setEntityFilter(e)}
              className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-colors capitalize ${
                entityFilter === e ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
              }`}>
              {e === 'all' ? 'Todos' : e}
            </button>
          ))}
        </div>
      </div>

      {/* Stats rapidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total de logs', value: logs.length },
          { label: 'Sancoes', value: logs.filter(l => l.action.startsWith('apply_')).length },
          { label: 'Remocoes', value: logs.filter(l => l.action.startsWith('delete_')).length },
          { label: 'Reativacoes', value: logs.filter(l => l.action.includes('reactivate')).length },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">Nenhum log encontrado</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Admin</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acao</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Entidade</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(log.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[160px]">{log.admin_email}</p>
                      <p className="text-xs text-gray-400">{ROLE_LABEL[log.admin_role] || log.admin_role}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      ACTION_COLOR[log.action] || 'bg-gray-100 text-gray-600'
                    }`}>
                      {ACTION_LABEL[log.action] || log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-xs font-medium text-gray-700 capitalize">{log.entity_type}</p>
                    {log.entity_id && (
                      <p className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{log.entity_id}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {log.details && (
                      <button onClick={() => setSelected(log)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        Ver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalhes do log */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Detalhe do Log</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ['Data',      fmtDate(selected.created_at)],
                ['Admin',     selected.admin_email],
                ['Papel',     ROLE_LABEL[selected.admin_role] || selected.admin_role],
                ['Acao',      ACTION_LABEL[selected.action] || selected.action],
                ['Entidade',  selected.entity_type],
                ['ID',        selected.entity_id || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-900 text-right max-w-[240px] truncate">{v}</span>
                </div>
              ))}
              {selected.details && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Dados adicionais</p>
                  <pre className="text-xs bg-gray-50 rounded-xl p-3 overflow-auto text-gray-700 font-mono">
                    {JSON.stringify(selected.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            <button onClick={() => setSelected(null)}
              className="w-full mt-5 py-2.5 bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-200 transition-colors">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
