export default function SuportePage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Suporte</h1>
      <p className="text-gray-500 text-sm">Modulo em desenvolvimento — Fase 2</p>
      <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Tickets, atendimento e transferencia entre setores</p>
      </div>
    </div>
  );
}
