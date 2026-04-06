import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

async function getMetrics() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO   = today.toISOString();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [
    { count: totalUsers },
    { count: newToday },
    { count: totalPosts },
    { count: totalGroups },
    { count: pendingReports },
    { count: suspendedUsers },
    { count: activeLives },
    { count: totalComments },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    supabase.from('groups').select('*', { count: 'exact', head: true }),
    supabase.from('user_sanctions').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('user_sanctions').select('*', { count: 'exact', head: true }).in('type', ['suspend', 'ban']).eq('is_active', true),
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('post_type', 'live').is('live_ended_at', null).not('live_started_at', 'is', null),
    supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
  ]);

  return {
    totalUsers:    totalUsers    ?? 0,
    newToday:      newToday      ?? 0,
    totalPosts:    totalPosts    ?? 0,
    totalGroups:   totalGroups   ?? 0,
    pendingReports: pendingReports ?? 0,
    suspendedUsers: suspendedUsers ?? 0,
    activeLives:   activeLives   ?? 0,
    totalComments: totalComments ?? 0,
  };
}

function StatCard({
  label, value, icon, color = 'orange', sub,
}: {
  label: string; value: number | string; icon: React.ReactNode;
  color?: 'orange' | 'blue' | 'green' | 'red' | 'purple' | 'gray';
  sub?: string;
}) {
  const colors = {
    orange: 'bg-orange-50 text-orange-600',
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    gray:   'bg-gray-100 text-gray-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value.toLocaleString('pt-BR')}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const m = await getMetrics();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Visao geral da plataforma em tempo real
        </p>
      </div>

      {/* Grid de metricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total de Usuarios" value={m.totalUsers} color="blue" sub={`+${m.newToday} hoje`}
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard label="Posts Publicados" value={m.totalPosts} color="green"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
        />
        <StatCard label="Grupos Criados" value={m.totalGroups} color="purple"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard label="Comentarios" value={m.totalComments} color="gray"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard label="Sancoes Ativas" value={m.pendingReports} color="red" sub="advertencias + suspensoes"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        />
        <StatCard label="Contas Suspensas" value={m.suspendedUsers} color="red"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>}
        />
        <StatCard label="Lives Ativas Agora" value={m.activeLives} color="orange"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="2"/><path d="M16.24 7.76a6 6 0 0 1 0 8.49m-8.48-.01a6 6 0 0 1 0-8.49m11.31-2.82a10 10 0 0 1 0 14.14m-14.14 0a10 10 0 0 1 0-14.14"/></svg>}
        />
        <StatCard label="Novos Hoje" value={m.newToday} color="green"
          icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>}
        />
      </div>

      {/* Alertas rapidos */}
      {(m.pendingReports > 0 || m.activeLives > 0) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Requer Atencao</h2>
          <div className="space-y-2">
            {m.pendingReports > 0 && (
              <div className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"/>
                <p className="text-sm text-red-700">
                  <span className="font-semibold">{m.pendingReports} sancao(oes) ativa(s)</span> — verifique o modulo de moderacao
                </p>
              </div>
            )}
            {m.activeLives > 0 && (
              <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse flex-shrink-0"/>
                <p className="text-sm text-orange-700">
                  <span className="font-semibold">{m.activeLives} live(s) acontecendo agora</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
