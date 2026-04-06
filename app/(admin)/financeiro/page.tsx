export default function FinanceiroPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Financeiro</h1>
      <p className="text-gray-500 text-sm">Modulo em desenvolvimento — Fase 4</p>
      <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-8 text-center">
        <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
        </div>
        <p className="text-gray-500 text-sm">Planos, assinaturas, repasses e reembolsos</p>
      </div>
    </div>
  );
}
