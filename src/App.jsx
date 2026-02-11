import React, { useState, useEffect } from 'react';
import { 
  Search, LogOut, ChevronRight, FileSpreadsheet, ArrowLeft, Loader2, Moon, Sun, Server, UserSearch, X, AlertCircle, Database, Layers, TableProperties, Box, ClipboardList, FileText, TrendingUp, DollarSign, FileStack, Factory, CheckCircle2, FileCode
} from 'lucide-react';

/**
 * CONFIGURAÇÃO DOS MÓDULOS (CARDS)
 * Sincronizado com o mapeamento do backend.py
 */
const PROCEDURES_CONFIG = [
  { 
    id: 'efd_fiscal', 
    title: 'EFD Fiscal', 
    description: 'Geração dos blocos C170, C590, D190 e D590 consolidado.', 
    icon: <ClipboardList className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_cnpj', label: 'CNPJ', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' }
    ] 
  },
  { 
    id: 'efd_contribuicoes', 
    title: 'EFD Contribuições', 
    description: 'Registros C170, C500, F100, etc.', 
    icon: <Layers className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_cnpj', label: 'CNPJ', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' }
    ] 
  },
  { 
    id: 'resumo_entrada', 
    title: 'Resumo de Entrada', 
    description: 'Detalhes de ICMS, IPI, PIS e COFINS das entradas.', 
    icon: <FileText className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_cnpj', label: 'CNPJ', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' }
    ] 
  },
  { 
    id: 'resumo_saida', 
    title: 'Resumo de Saída', 
    description: 'Faturamento de notas de saída e alíquotas calculadas.', 
    icon: <TrendingUp className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' }
    ] 
  }
];

export default function App() {
  const [view, setView] = useState('login');
  const [darkMode, setDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [selectedProc, setSelectedProc] = useState(null);
  const [user, setUser] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [clientSearch, setClientSearch] = useState('');
  const [dbClients, setDbClients] = useState([]);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  // Busca de clientes na Engine Python (backend.py)
  useEffect(() => {
    if (clientSearch.length > 2) {
      fetch(`http://localhost:3001/api/clientes?search=${clientSearch}`)
        .then(res => res.json())
        .then(data => setDbClients(data))
        .catch(() => setErrorMsg("Python Engine offline. Verifique o terminal."));
    }
  }, [clientSearch]);

  const handleGenerate = async () => {
    setErrorMsg(null);
    const allFilled = selectedProc.params.every(p => formValues[p.name]);
    if (!allFilled) { setErrorMsg("Por favor, preencha todos os campos obrigatórios."); return; }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/generate-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          procedureId: selectedProc.id, 
          params: formValues, 
          userName: user.name 
        })
      });
      const json = await res.json();
      if (json.success) { 
        setResults(json.data); 
        setView('results'); 
      } else { 
        setErrorMsg(json.error); 
      }
    } catch (err) { 
        setErrorMsg("Erro de rede. Verifique se o backend.py está rodando."); 
    }
    setIsLoading(false);
  };

  const selectClient = (client) => {
    setFormValues({ ...formValues, p_cliente: client.id_cliente, p_cnpj: client.cnpj });
    setIsConsultOpen(false);
    setClientSearch('');
    setErrorMsg(null);
  };

  const themeClasses = { 
    bg: darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900', 
    card: darkMode ? 'bg-slate-900/50 border-slate-800 backdrop-blur-md' : 'bg-white border-slate-200 shadow-xl', 
    input: darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900' 
  };

  if (view === 'login') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <div className={`w-full max-w-md p-10 rounded-[2.5rem] border ${themeClasses.card}`}>
          <div className="flex justify-between items-center mb-10">
            <div className="p-1 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg"><img src="/omega.png" className="w-14 h-14" alt="Ω" /></div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-xl hover:bg-white/10 transition-all">{darkMode ? <Sun className="text-yellow-400 w-5" /> : <Moon className="text-slate-600 w-5" />}</button>
          </div>
          <h1 className="text-4xl font-black mb-10 italic text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 text-center tracking-tighter">GET OMEGA 2.0</h1>
          <form onSubmit={(e) => { e.preventDefault(); setUser({ name: e.target[0].value || 'Matheus' }); setView('dashboard'); }} className="space-y-6">
            <input type="text" placeholder="Nome do Analista" className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold ${themeClasses.input}`} required />
            <input type="password" placeholder="Senha da Engine" className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold ${themeClasses.input}`} required />
            <button className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-lg shadow-xl active:scale-95 transition-all">ACESSAR ENGINE</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-all ${themeClasses.bg}`}>
      {isConsultOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsConsultOpen(false)} />
          <div className={`w-full max-w-2xl rounded-[2.5rem] border p-8 relative z-10 ${themeClasses.card}`}>
             <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-purple-600 text-white"><UserSearch className="w-5 h-5" /></div><h2 className="text-xl font-black italic">Consultar Empresa</h2></div><button onClick={() => setIsConsultOpen(false)} className="p-2 text-slate-500 hover:text-white"><X /></button></div>
             <input type="text" placeholder="Pesquisar..." className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold ${themeClasses.input}`} value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} autoFocus />
             <div className="mt-6 space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {dbClients.map(c => <button key={c.id_cliente} onClick={() => selectClient(c)} className="w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-purple-600/20 text-left transition-all font-bold italic"><div>{c.nome}</div><div className="text-[10px] opacity-40 uppercase tracking-widest not-italic">ID: {c.id_cliente} | CNPJ: {c.cnpj}</div></button>)}
             </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 px-8 py-4 border-b backdrop-blur-xl flex items-center justify-between border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-1 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg"><img src="/omega.png" className="w-10 h-10" alt="Ω" /></div>
          <h2 className="text-sm font-black italic tracking-tighter uppercase">GET OMEGA 2.0 <span className="ml-2 text-[8px] bg-purple-500/20 px-2 py-1 rounded text-purple-400">PYTHON ENGINE</span></h2>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl hover:bg-white/10">{darkMode ? <Sun className="text-yellow-400 w-5" /> : <Moon className="text-slate-600 w-5" />}</button>
          <div className="text-right hidden sm:block"><div className="text-xs font-black italic">{user?.name}</div><div className="text-[9px] text-purple-500 font-black uppercase tracking-tighter">Administrador</div></div>
          <button onClick={() => setView('login')} className="p-3 hover:text-red-500 transition-colors"><LogOut className="w-5" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 w-full flex-1">
        {view === 'dashboard' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-black mb-10 italic text-slate-400 tracking-tighter">Módulos de Extração</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {PROCEDURES_CONFIG.map((proc) => (
                <button key={proc.id} onClick={() => { setSelectedProc(proc); setFormValues({}); setView('params'); }} className={`p-8 rounded-[2.5rem] border text-left transition-all ${themeClasses.card} hover:scale-[1.02] group`}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-purple-600/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">{proc.icon}</div>
                  <h3 className="text-xl font-black mb-3 italic tracking-tight">{proc.title}</h3>
                  <p className="text-sm opacity-60 mb-8 italic">{proc.description}</p>
                  <div className="text-[10px] font-black uppercase text-purple-500 group-hover:translate-x-1 transition-all flex items-center gap-2">Configurar Engine <ChevronRight className="w-4 h-4" /></div>
                </button>
              ))}
            </div>
          </div>
        ) : view === 'params' ? (
          <div className="max-w-3xl mx-auto animate-in zoom-in-95 duration-500">
             <button onClick={() => setView('dashboard')} className="mb-6 text-xs font-black uppercase text-purple-500 flex items-center gap-2 hover:opacity-70"><ArrowLeft className="w-4 h-4" /> Voltar</button>
             <div className={`p-10 rounded-[3.5rem] border ${themeClasses.card} shadow-2xl`}>
                <div className="flex justify-between items-start mb-10 border-b border-white/5 pb-8">
                  <h2 className="text-3xl font-black italic tracking-tighter">{selectedProc.title}</h2>
                  <button onClick={() => setIsConsultOpen(true)} className="px-5 py-3 rounded-xl bg-purple-600/10 text-purple-500 border border-purple-600/20 font-black text-[10px] uppercase hover:bg-purple-600 hover:text-white shadow-lg italic flex items-center gap-2"><Search className="w-4 h-4" /> Buscar Cliente</button>
                </div>
                {errorMsg && <div className="mb-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black uppercase flex items-center gap-4 animate-pulse"><AlertCircle className="w-6 h-6 shrink-0" /> <span className="leading-relaxed">{errorMsg}</span></div>}
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedProc.params.map(p => (
                      <div key={p.name} className="space-y-2">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic tracking-tighter">{p.label}</label>
                        <input type={p.type} className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold transition-all ${themeClasses.input} focus:ring-4 focus:ring-purple-500/20`} value={formValues[p.name] || ''} onChange={(e) => setFormValues({...formValues, [p.name]: e.target.value})} />
                      </div>
                    ))}
                  </div>
                  <button onClick={handleGenerate} className="w-full py-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-xl shadow-xl shadow-purple-500/20 uppercase italic tracking-widest hover:scale-[1.01] active:scale-95 transition-all">EXECUTAR ENGINE NO BANCO</button>
                </div>
             </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700 space-y-8 flex flex-col flex-1 h-full">
            <div className="flex justify-between items-end flex-wrap gap-4">
              <button onClick={() => setView('params')} className="text-xs font-black uppercase text-purple-500 flex items-center gap-2 italic hover:opacity-70 transition-all"><ArrowLeft className="w-4 h-4" /> Parâmetros</button>
              <button className="px-10 py-5 bg-green-600 text-white font-black rounded-2xl shadow-xl hover:bg-green-700 active:scale-95 transition-all uppercase text-xs tracking-widest italic flex items-center gap-3"><FileSpreadsheet className="w-5 h-5" /> EXPORTAR PARA EXCEL</button>
            </div>
            <div className={`rounded-[3rem] border overflow-hidden ${themeClasses.card} flex-1 shadow-2xl min-h-[500px]`}>
              <div className="overflow-x-auto h-full custom-scrollbar p-8">
                 {results.length > 0 ? (
                   <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-md border-b border-white/10 text-[10px] font-black uppercase opacity-60 italic">
                        <tr>{Object.keys(results[0]).map(key => <th key={key} className="p-6 whitespace-nowrap tracking-widest">{key}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {results.map((row, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-colors text-[11px] font-medium italic">
                            {Object.values(row).map((val, j) => <td key={j} className="p-6 whitespace-nowrap opacity-80">{val === null ? <span className="opacity-20 italic">null</span> : val.toString()}</td>)}
                          </tr>
                        ))}
                      </tbody>
                   </table>
                 ) : <div className="h-full flex flex-col items-center justify-center py-40 gap-6 italic opacity-20 uppercase font-black text-center tracking-widest">A Engine Python processou os dados.<br/>Clique no botão verde para gerar o Excel final.</div>}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* OVERLAY DE LOADING PYTHON ENGINE */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/90 z-[120] flex flex-col items-center justify-center text-white backdrop-blur-md">
          <div className="relative mb-10">
            <div className="w-24 h-24 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin" />
            <img src="/omega.png" className="absolute top-0 left-0 w-24 h-24 p-6 object-contain animate-pulse" alt="Ω" />
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter mb-2">PYTHON ENGINE ATIVA</h2>
          <p className="text-slate-500 uppercase text-[10px] font-black tracking-[0.4em]">Aguardando Resposta do SQL Server via ODBC...</p>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(147, 51, 234, 0.3); border-radius: 10px; }`}</style>
    </div>
  );
}