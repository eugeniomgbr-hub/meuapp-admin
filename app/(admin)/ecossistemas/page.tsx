'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase, getAdminUser, logAction } from '@/lib/supabase';
import type { AdminUser } from '@/lib/supabase';

interface Ecosystem {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  followers_count: number;
  following_count: number;
  postCount: number;
  groupCount: number;
  isSuspended: boolean;
}

export default function EcossistemaPage() {
  const [admin, setAdmin]       = useState<AdminUser | null>(null);
  const [list, setList]         = useState<Ecosystem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [selected, setSelected] = useState<Ecosystem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [acting, setActing]     = useState(false);

  useEffect(() => { getAdminUser().then(setAdmin); }, []);

  const fetchEcosystems = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, bio, created_at, followers_count, following_count')
        .order('created_at', { ascending: false })
        .limit(100);

      if (search.trim()) {
        query = query.or(`full_name.ilike.%${search}%,username.ilike.%${search}%`);
      }

      const { data: profiles } = await query;
      if (!profiles) return;

      // Busca contagem de posts e grupos por usuario
      const ids = profiles.map((p: any) => p.id);
      const [{ data: posts }, { data: groups }, { data: sanctions }] = await Promise.all([
        supabase.from('posts').select('author_id').in('author_id', ids).eq('is_archived', false),
        supabase.from('groups').select('owner_id').in('owner_id', ids),
        supabase.from('user_sanctions').select('user_id, type').in('user_id', ids).eq('is_active', true),
      ]);

      const postCount   = Object.fromEntries(ids.map(id => [id, 0]));
      const groupCount  = Object.fromEntries(ids.map(id => [id, 0]));
      const suspended   = new Set<string>();

      (posts || []).forEach((p: any) => { postCount[p.author_id] = (postCount[p.author_id] || 0) + 1; });
      (groups || []).forEach((g: any) => { groupCount[g.owner_id] = (groupCount[g.owner_id] || 0) + 1; });
      (sanctions || []).forEach((s: any) => {
        if (s.type === 'suspend' || s.type === 'ban') suspended.add(s.user_id);
      });

      setList(profiles.map((p: any) => ({
        ...p,
        postCount:   postCount[p.id]  || 0,
        groupCount:  groupCount[p.id] || 0,
        isSuspended: suspended.has(p.id),
      })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchEcosystems(); }, [fetchEcosystems]);

  const handleSuspend = async (eco: Ecosystem) => {
    if (!admin || acting) return;
    setActing(true);
    try {
      await supabase.from('user_sanctions').insert({
        user_id:       eco.id,
        admin_user_id: admin.id,
        admin_email:   admin.email,
        type:          'suspend',
        reason:        'Ecossistema suspenso pelo administrador',
        is_active:     true,
      });
      await logAction(admin, 'suspend_ecosystem', 'ecosystem', eco.id, { username: eco.username });
      fetchEcosystems();
      setShowDetail(false);
    } catch (e) { console.error(e); }
    finally { setActing(false); }
  };

  const handleReactivate = async (eco: Ecosystem) => {
    if (!admin || acting) return;
    setActing(true);
    try {
      await supabase.from('user_sanctions').update({ is_active: false })
        .eq('user_id', eco.id).eq('is_active', true);
      await logAction(admin, 'reactivate_ecosystem', 'ecosystem', eco.id, { username: eco.username });
      fetchEcosystems();
      setShowDetail(false);
    } catch (e) { console.error(e); }
    finally { setActing(false); }
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ecossistemas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cada usuario e seu proprio ecossistema — cadastro gera automaticamente
        </p>
      </div>

      {/* Busca */}
      <div className="flex gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou username..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-900
                       outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"/>
        </div>
      </div>

      {/* Grid de ecossistemas */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Carregando...</div>
      ) : list.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Nenhum ecossistema encontrado</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map(eco => (
            <div key={eco.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {eco.avatar_url
                    ? <img src={eco.avatar_url} className="w-full h-full object-cover" alt=""/>
                    : <span className="text-orange-600 font-bold">{eco.full_name?.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{eco.full_name}</p>
                  <p className="text-xs text-gray-400">@{eco.username}</p>
                </div>
                {eco.isSuspended && (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full font-medium flex-shrink-0">
                    Suspenso
                  </span>
                )}
              </div>

              {eco.bio && (
                <p className="text-xs text-gray-500 mb-4 line-clamp-2">{eco.bio}</p>
              )}

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-900">{eco.postCount}</p>
                  <p className="text-[10px] text-gray-500">Posts</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-900">{eco.groupCount}</p>
                  <p className="text-[10px] text-gray-500">Grupos</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-xl">
                  <p className="text-lg font-bold text-gray-900">{eco.followers_count}</p>
                  <p className="text-[10px] text-gray-500">Seguidores</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">{fmtDate(eco.created_at)}</span>
                <button onClick={() => { setSelected(eco); setShowDetail(true); }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  Gerenciar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal detalhe */}
      {showDetail && selected && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Ecossistema</h2>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-sm mb-6">
              {[
                ['Dono',       selected.full_name],
                ['Username',   `@${selected.username}`],
                ['Cadastro',   fmtDate(selected.created_at)],
                ['Posts',      String(selected.postCount)],
                ['Grupos',     String(selected.groupCount)],
                ['Seguidores', String(selected.followers_count)],
                ['Status',     selected.isSuspended ? 'Suspenso' : 'Ativo'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-900">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              {selected.isSuspended ? (
                <button onClick={() => handleReactivate(selected)} disabled={acting}
                  className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors">
                  {acting ? 'Aguarde...' : 'Reativar'}
                </button>
              ) : (
                <button onClick={() => handleSuspend(selected)} disabled={acting}
                  className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold text-sm rounded-xl transition-colors">
                  {acting ? 'Aguarde...' : 'Suspender'}
                </button>
              )}
              <button onClick={() => setShowDetail(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold text-sm rounded-xl hover:bg-gray-200 transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
