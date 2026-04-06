'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase, getAdminUser, logAction } from '@/lib/supabase';
import type { AdminUser } from '@/lib/supabase';

type UserStatus = 'all' | 'active' | 'suspended' | 'banned';

interface Profile {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  followers_count: number;
  following_count: number;
  sanction?: { type: string; reason: string; created_at: string } | null;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  warning:  { label: 'Advertido',  color: 'bg-yellow-100 text-yellow-700' },
  suspend:  { label: 'Suspenso',   color: 'bg-orange-100 text-orange-700' },
  ban:      { label: 'Banido',     color: 'bg-red-100 text-red-700' },
  limit:    { label: 'Limitado',   color: 'bg-gray-100 text-gray-600' },
};

export default function UsuariosPage() {
  const [admin, setAdmin]       = useState<AdminUser | null>(null);
  const [users, setUsers]       = useState<Profile[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState<UserStatus>('all');
  const [selected, setSelected] = useState<Profile | null>(null);
  const [modal, setModal]       = useState<'sanction' | 'detail' | null>(null);
  const [sanctionType, setSanctionType] = useState<'warning' | 'suspend' | 'ban'>('warning');
  const [sanctionReason, setSanctionReason] = useState('');
  const [applying, setApplying] = useState(false);

  useEffect(() => { getAdminUser().then(setAdmin); }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select(`
          id, full_name, username, avatar_url, created_at,
          followers_count, following_count,
          sanction:user_sanctions(type, reason, created_at)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);
      }

      const { data } = await query;
      let list = (data || []).map((u: any) => ({
        ...u,
        sanction: Array.isArray(u.sanction) && u.sanction.length > 0 ? u.sanction[u.sanction.length - 1] : null,
      }));

      if (status === 'suspended') list = list.filter(u => u.sanction?.type === 'suspend');
      else if (status === 'banned') list = list.filter(u => u.sanction?.type === 'ban');
      else if (status === 'active') list = list.filter(u => !u.sanction);

      setUsers(list);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search, status]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleApplySanction = async () => {
    if (!selected || !admin || !sanctionReason.trim()) return;
    setApplying(true);
    try {
      await supabase.from('user_sanctions').insert({
        user_id:       selected.id,
        admin_user_id: admin.id,
        admin_email:   admin.email,
        type:          sanctionType,
        reason:        sanctionReason.trim(),
        is_active:     true,
      });

      await logAction(admin, `apply_${sanctionType}`, 'user', selected.id, {
        reason: sanctionReason, target: selected.username,
      });

      setModal(null);
      setSanctionReason('');
      fetchUsers();
    } catch (e) { console.error(e); }
    finally { setApplying(false); }
  };

  const handleRemoveSanction = async (user: Profile) => {
    if (!admin) return;
    await supabase.from('user_sanctions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('is_active', true);

    await logAction(admin, 'remove_sanction', 'user', user.id, { target: user.username });
    fetchUsers();
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie todos os usuarios da plataforma</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1 min-w-[200px] relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou username..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900
                       outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'suspended', 'banned'] as UserStatus[]).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                status === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
              }`}>
              {{ all: 'Todos', active: 'Ativos', suspended: 'Suspensos', banned: 'Banidos' }[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Carregando...</div>
        ) : users.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Nenhum usuario encontrado</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Cadastro</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {user.avatar_url
                          ? <img src={user.avatar_url} className="w-full h-full object-cover" alt=""/>
                          : <span className="text-orange-600 text-xs font-bold">{user.full_name?.charAt(0)}</span>}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{user.full_name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">@{user.username}</td>
                  <td className="px-5 py-4 text-sm text-gray-500">{fmtDate(user.created_at)}</td>
                  <td className="px-5 py-4">
                    {user.sanction ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_LABEL[user.sanction.type]?.color}`}>
                        {STATUS_LABEL[user.sanction.type]?.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        Ativo
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => { setSelected(user); setModal('detail'); }}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                        Ver
                      </button>
                      {user.sanction ? (
                        <button onClick={() => handleRemoveSanction(user)}
                          className="px-3 py-1.5 text-xs font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors">
                          Reativar
                        </button>
                      ) : (
                        <button onClick={() => { setSelected(user); setModal('sanction'); }}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                          Sancionar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal — Detalhe do usuario */}
      {modal === 'detail' && selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Perfil do Usuario</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Nome</span>
                <span className="font-medium text-gray-900">{selected.full_name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Username</span>
                <span className="font-medium text-gray-900">@{selected.username}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Cadastro</span>
                <span className="font-medium text-gray-900">{fmtDate(selected.created_at)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Seguidores</span>
                <span className="font-medium text-gray-900">{selected.followers_count}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">Seguindo</span>
                <span className="font-medium text-gray-900">{selected.following_count}</span>
              </div>
              {selected.sanction && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl">
                  <p className="text-xs font-semibold text-red-700 mb-1">
                    Sancao ativa: {STATUS_LABEL[selected.sanction.type]?.label}
                  </p>
                  <p className="text-xs text-red-600">{selected.sanction.reason}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setModal('sanction'); }}
                className="flex-1 py-2.5 bg-red-50 text-red-600 font-semibold text-sm rounded-xl hover:bg-red-100 transition-colors">
                Sancionar
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-200 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Aplicar sancao */}
      {modal === 'sanction' && selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Aplicar Sancao</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-5">
              Usuario: <span className="font-semibold text-gray-900">@{selected.username}</span>
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de sancao</label>
              <div className="grid grid-cols-3 gap-2">
                {(['warning', 'suspend', 'ban'] as const).map(t => (
                  <button key={t} onClick={() => setSanctionType(t)}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                      sanctionType === t ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {{ warning: 'Advertencia', suspend: 'Suspensao', ban: 'Banimento' }[t]}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Motivo (obrigatorio)</label>
              <textarea
                value={sanctionReason}
                onChange={e => setSanctionReason(e.target.value)}
                placeholder="Descreva o motivo da sancao..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm text-gray-900
                           outline-none focus:border-orange-500 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button onClick={handleApplySanction} disabled={applying || !sanctionReason.trim()}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors">
                {applying ? 'Aplicando...' : 'Confirmar Sancao'}
              </button>
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
