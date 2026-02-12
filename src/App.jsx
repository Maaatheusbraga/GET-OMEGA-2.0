import React, { useState, useEffect } from 'react';
import { 
  Search, LogOut, ChevronRight, FileSpreadsheet, ArrowLeft, Loader2, Moon, Sun, Server, UserSearch, X, AlertCircle, Database, Layers, TableProperties, Box, ClipboardList, FileText, TrendingUp, DollarSign, FileStack, Factory, CheckCircle2, FileCode
} from 'lucide-react';
import * as XLSX from 'xlsx';

/**
 * CONFIGURAÇÃO DOS MÓDULOS - TEXTOS COMERCIAIS
 */
const PROCEDURES_CONFIG = [
  { 
    id: 'efd_fiscal', 
    title: 'Escrituração Fiscal Digital', 
    description: 'Consolidação completa dos blocos C170, C190, D190 e D590.', 
    icon: <ClipboardList className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_cnpj', label: 'CNPJ da Empresa', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ] 
  },
  { 
    id: 'efd_contribuicoes', 
    title: 'EFD Contribuições', 
    description: 'Detalhamento de registros C170, C500, F100 e demais obrigações.', 
    icon: <Layers className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_cnpj', label: 'CNPJ da Empresa', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ],
    multiSelect: true 
  },
  { 
    id: 'efd_bloco_m', 
    title: 'Apuração Bloco M', 
    description: 'Geração consolidada em múltiplas abas (M200 a M620).', 
    icon: <TableProperties className="w-7 h-7" />, 
    params: [
      { name: 'p_cnpj', label: 'CNPJ da Empresa', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ],
    noPreview: true 
  },
  { 
    id: 'bloco_d', 
    title: 'Transporte (Bloco D)', 
    description: 'Análise de documentos de transporte (D200, D201, D205).', 
    icon: <Box className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_cnpj', label: 'CNPJ da Empresa', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ],
    multiSelect: true 
  },
  { 
    id: 'bloco_1000', 
    title: 'Retenções Bloco 1000', 
    description: 'Relatório de créditos e retenções de PIS/COFINS.', 
    icon: <Database className="w-7 h-7" />, 
    params: [
      { name: 'p_cnpj', label: 'CNPJ da Empresa', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ],
    multiSelect: true 
  },
  { 
    id: 'base_xml', 
    title: 'Base de Documentos XML', 
    description: 'Extração detalhada de entradas, saídas e terceiros via XML.', 
    icon: <FileCode className="w-7 h-7" />, 
    params: [
      { name: 'id_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'data_inicio', label: 'Período Inicial', type: 'date' }, 
      { name: 'data_fim', label: 'Período Final', type: 'date' }
    ],
    isSpecial: true
  },
  { 
    id: 'resumo_entrada', 
    title: 'Resumo de Entradas', 
    description: 'Visão consolidada de entradas com destaque de impostos.', 
    icon: <FileText className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_cnpj', label: 'CNPJ da Empresa', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ] 
  },
  { 
    id: 'resumo_saida', 
    title: 'Resumo de Saídas', 
    description: 'Faturamento detalhado com alíquotas calculadas.', 
    icon: <TrendingUp className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_cnpj', label: 'CNPJ da Empresa', type: 'text' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ] 
  },
  { 
    id: 'resumo_valores', 
    title: 'Resumo de Valores SPED', 
    description: 'Agrupamento financeiro por CFOP e CST.', 
    icon: <DollarSign className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ] 
  },
  { 
    id: 'bloco_e', 
    title: 'Apuração Mensal ICMS', 
    description: 'Relatório resumido dos registros E110 e E111.', 
    icon: <FileStack className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ] 
  },
  { 
    id: 'bloco_ipi', 
    title: 'Apuração IPI', 
    description: 'Demonstrativo de apuração do IPI (E510 a E531).', 
    icon: <Factory className="w-7 h-7" />, 
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number' }, 
      { name: 'p_periodo_i', label: 'Período Inicial', type: 'date' }, 
      { name: 'p_periodo_f', label: 'Período Final', type: 'date' }
    ] 
  }
];

const REG_OPTIONS_CONTRIB = ["A100", "C170", "C175", "C500", "D100", "D500", "F100", "F500", "F525", "F550", "F600", "F700"];
const REG_OPTIONS_D = ["D200", "D201", "D205"];
const REG_OPTIONS_1000 = ["1100", "1500", "1300", "1700"];

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
  const [totalRows, setTotalRows] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isMultiTable, setIsMultiTable] = useState(false);

  const [xmlFilters, setXmlFilters] = useState({ emitente: 'proprios', tipo: 'entrada_saida' });
  const [regFilter, setRegFilter] = useState('');

  useEffect(() => {
    if (clientSearch.length > 2) {
      fetch(`http://localhost:3001/api/clientes?search=${clientSearch}`)
        .then(res => res.json())
        .then(data => setDbClients(data))
        .catch(() => setErrorMsg("Sistema de busca indisponível."));
    }
  }, [clientSearch]);

  const handleGenerate = async () => {
    setErrorMsg(null);
    setIsMultiTable(false);
    
    const allFilled = selectedProc.params.every(p => formValues[p.name]);
    
    if (selectedProc.multiSelect && !regFilter) {
      setErrorMsg("Selecione um Registro (REG) para continuar.");
      return;
    }
    if (!allFilled) { setErrorMsg("Por favor, preencha todos os campos obrigatórios."); return; }

    const dtInicio = formValues.p_periodo_i || formValues.data_inicio;
    const dtFim = formValues.p_periodo_f || formValues.data_fim;
    if (dtInicio && dtFim && new Date(dtInicio) > new Date(dtFim)) {
      setErrorMsg("Período Inválido: A data inicial não pode ser posterior à data final.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = { 
        procedureId: selectedProc.id, 
        params: formValues, 
        userName: user?.name || 'Analista',
        reg: regFilter,
        xmlFilters: selectedProc.id === 'base_xml' ? xmlFilters : null
      };

      const res = await fetch('http://localhost:3001/api/generate-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      
      if (json.success) { 
        setResults(json.data);
        setTotalRows(json.total || 0);
        setIsMultiTable(json.isMulti || false);
        setView('results'); 
      } else { setErrorMsg(json.error); }
    } catch (err) { setErrorMsg("Não foi possível conectar ao servidor de dados."); }
    setIsLoading(false);
  };

  const handleExportExcel = () => {
    if (!results || results.length === 0) return;
    const wb = XLSX.utils.book_new();
    
    if (isMultiTable) {
      results.forEach((table) => {
        if (table.full && table.full.length > 0) {
          const ws = XLSX.utils.json_to_sheet(table.full);
          XLSX.utils.book_append_sheet(wb, ws, table.name.substring(0, 31));
        }
      });
    } else {
      const ws = XLSX.utils.json_to_sheet(results);
      XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    }

    XLSX.writeFile(wb, `GET_OMEGA_${selectedProc.id}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const selectClient = (client) => {
    setFormValues({ ...formValues, p_cliente: client.id_cliente, p_cnpj: client.cnpj, id_cliente: client.id_cliente });
    setIsConsultOpen(false);
    setClientSearch('');
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
            <div className="p-1 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg"><img src="/omega.png" className="w-14 h-14" alt="Logo" /></div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-3 rounded-xl hover:bg-white/10 transition-all">{darkMode ? <Sun className="text-yellow-400 w-5" /> : <Moon className="text-slate-600 w-5" />}</button>
          </div>
          <h1 className="text-4xl font-black mb-10 italic text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 text-center tracking-tighter uppercase font-mono">GET OMEGA 2.0</h1>
          <form onSubmit={(e) => { e.preventDefault(); setUser({ name: 'Analista' }); setView('dashboard'); }} className="space-y-6">
            <input type="text" placeholder="Identificação do Analista" className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold ${themeClasses.input}`} required />
            <input type="password" placeholder="Senha de Acesso" className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold ${themeClasses.input}`} required />
            <button className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-lg shadow-xl active:scale-95 transition-all uppercase tracking-widest">Acessar Plataforma</button>
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
             <div className="flex justify-between items-center mb-8"><div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-purple-600 text-white"><Search className="w-5 h-5" /></div><h2 className="text-xl font-black italic">Pesquisa de Portfólio</h2></div><button onClick={() => setIsConsultOpen(false)} className="p-2 text-slate-500 hover:text-white"><X /></button></div>
             <input type="text" placeholder="Digite o nome da empresa ou CNPJ..." className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold ${themeClasses.input}`} value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} autoFocus />
             <div className="mt-6 space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {dbClients.map(c => <button key={c.id_cliente} onClick={() => selectClient(c)} className="w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-purple-600/20 text-left transition-all font-bold italic"><div>{c.nome}</div><div className="text-[10px] opacity-40 tracking-widest not-italic uppercase font-sans">ID: {c.id_cliente} | CNPJ: {c.cnpj}</div></button>)}
             </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 px-8 py-4 border-b backdrop-blur-xl flex items-center justify-between border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-1 rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg"><img src="/omega.png" className="w-10 h-10" alt="Ω" /></div>
          <h2 className="text-sm font-black italic tracking-tighter uppercase font-mono">GET OMEGA <span className="text-purple-500">2.0</span></h2>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl hover:bg-white/10">{darkMode ? <Sun className="text-yellow-400 w-5" /> : <Moon className="text-slate-600 w-5" />}</button>
          <button onClick={() => setView('login')} className="p-3 hover:text-red-500 transition-colors"><LogOut className="w-5" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 w-full flex-1">
        {view === 'dashboard' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-black mb-10 italic text-slate-400 tracking-tighter uppercase font-mono">Módulos Disponíveis</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {PROCEDURES_CONFIG.map((proc) => (
                <button key={proc.id} onClick={() => { setSelectedProc(proc); setFormValues({}); setRegFilter(''); setView('params'); }} className={`p-8 rounded-[2.5rem] border text-left transition-all ${themeClasses.card} hover:scale-[1.02] group`}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-purple-600/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all">{proc.icon}</div>
                  <h3 className="text-xl font-black mb-3 italic tracking-tight font-mono">{proc.title}</h3>
                  <p className="text-sm opacity-60 mb-8 italic leading-relaxed">{proc.description}</p>
                  <div className="text-[10px] font-black uppercase text-purple-500 group-hover:translate-x-1 transition-all flex items-center gap-2">Acessar Relatório <ChevronRight className="w-4 h-4" /></div>
                </button>
              ))}
            </div>
          </div>
        ) : view === 'params' ? (
          <div className="max-w-3xl mx-auto animate-in zoom-in-95 duration-500">
             <button onClick={() => setView('dashboard')} className="mb-6 text-xs font-black uppercase text-purple-500 flex items-center gap-2 hover:opacity-70 font-mono"><ArrowLeft className="w-4 h-4" /> Painel Principal</button>
             <div className={`p-10 rounded-[3.5rem] border ${themeClasses.card} shadow-2xl`}>
                <div className="flex justify-between items-start mb-10 border-b border-white/5 pb-8">
                  <h2 className="text-3xl font-black italic tracking-tighter font-mono uppercase">{selectedProc.title}</h2>
                  <button onClick={() => setIsConsultOpen(true)} className="px-5 py-3 rounded-xl bg-purple-600/10 text-purple-500 border border-purple-600/20 font-black text-[10px] uppercase hover:bg-purple-600 hover:text-white shadow-lg italic flex items-center gap-2 font-mono"><Search className="w-4 h-4" /> Selecionar Empresa</button>
                </div>
                {errorMsg && <div className="mb-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-black uppercase flex items-center gap-4"><AlertCircle className="w-6 h-6 shrink-0" /> <span className="leading-relaxed">{errorMsg}</span></div>}
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono">
                    {selectedProc.params.map(p => (
                      <div key={p.name} className="space-y-2">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">{p.label}</label>
                        <input type={p.type} className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold transition-all ${themeClasses.input}`} value={formValues[p.name] || ''} onChange={(e) => setFormValues({...formValues, [p.name]: e.target.value})} />
                      </div>
                    ))}
                    {selectedProc.multiSelect && (
                      <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">Registro de Apuração</label>
                        <select className={`w-full py-4 px-6 rounded-2xl border outline-none font-bold ${themeClasses.input} appearance-none`} value={regFilter} onChange={(e) => setRegFilter(e.target.value)}>
                          <option value="">Escolha uma opção...</option>
                          {selectedProc.id === 'efd_contribuicoes' && REG_OPTIONS_CONTRIB.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                          {selectedProc.id === 'bloco_d' && REG_OPTIONS_D.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                          {selectedProc.id === 'bloco_1000' && REG_OPTIONS_1000.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {selectedProc.isSpecial && (
                    <div className="space-y-8 pt-4 border-t border-white/5">
                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">Emitente:</label>
                        <div className="flex gap-4">
                          {['proprios', 'terceiros'].map(opt => (
                            <label key={opt} className={`flex-1 cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold uppercase text-xs ${xmlFilters.emitente === opt ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-slate-700 opacity-50'}`}>
                              <input type="radio" name="emitente" className="hidden" checked={xmlFilters.emitente === opt} onChange={() => setXmlFilters({...xmlFilters, emitente: opt})} />
                              {opt === 'proprios' ? 'Próprios' : 'Terceiros'}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className={`space-y-4 ${xmlFilters.emitente === 'terceiros' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">Fluxo de Dados:</label>
                        <div className="flex flex-wrap gap-4">
                          {[ {id: 'entrada', label: 'Entradas'}, {id: 'saida', label: 'Saídas'}, {id: 'entrada_saida', label: 'Ambos'} ].map(opt => (
                            <label key={opt.id} className={`flex-1 min-w-[120px] cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold uppercase text-[10px] ${xmlFilters.tipo === opt.id ? 'bg-pink-600 border-pink-500 text-white' : 'bg-white/5 border-slate-700 opacity-50'}`}>
                              <input type="radio" name="tipo_xml" className="hidden" checked={xmlFilters.tipo === opt.id} onChange={() => setXmlFilters({...xmlFilters, tipo: opt.id})} />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <button onClick={handleGenerate} className="w-full py-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black text-xl shadow-xl uppercase italic font-mono tracking-widest">Processar Dados</button>
                </div>
             </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700 space-y-8 flex flex-col flex-1">
            <div className="flex justify-between items-end flex-wrap gap-4 font-mono">
              <button onClick={() => setView('params')} className="text-xs font-black uppercase text-purple-500 flex items-center gap-2 italic"><ArrowLeft className="w-4 h-4" /> Alterar Filtros</button>
              <div className="flex gap-4">
                <div className="bg-white/5 border border-white/5 rounded-2xl px-6 py-4 flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase opacity-40">Registros Identificados</span>
                    <span className="text-xl font-black italic text-purple-400">{totalRows.toLocaleString()}</span>
                </div>
                <button onClick={handleExportExcel} className="px-10 py-5 bg-green-600 text-white font-black rounded-2xl shadow-xl hover:bg-green-700 uppercase text-xs italic flex items-center gap-3 transition-all">
                  <FileSpreadsheet className="w-5 h-5" /> Exportar para Excel
                </button>
              </div>
            </div>
            
            <div className={`rounded-[3rem] border overflow-hidden ${themeClasses.card} flex-1 shadow-2xl min-h-[500px]`}>
              <div className="overflow-x-auto h-full custom-scrollbar p-8">
                 {results && results.length > 0 ? (
                   <div className="space-y-12">
                      {results.map((table, tIdx) => (
                        <div key={tIdx} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                          <h3 className="text-xl font-black italic text-purple-500 mb-4 font-mono uppercase border-l-4 border-purple-500 pl-4">
                            {table.name} <span className="ml-2 text-[10px] opacity-40">(Amostra Inicial)</span>
                          </h3>
                          <div className="rounded-2xl border border-white/5 overflow-hidden">
                            <table className="w-full text-left border-collapse font-mono">
                              <thead className="bg-slate-900/95 border-b border-white/10 text-[10px] font-black uppercase opacity-60 italic">
                                <tr>{Object.keys(table.preview[0] || {}).map(key => <th key={key} className="p-4 whitespace-nowrap">{key}</th>)}</tr>
                              </thead>
                              <tbody className="divide-y divide-white/5">
                                {table.preview.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-white/5 transition-colors text-[11px]">
                                    {Object.values(row).map((val, vIdx) => <td key={vIdx} className="p-4 whitespace-nowrap opacity-80">{val === null ? '-' : val.toString()}</td>)}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                   </div>
                 ) : (
                   <div className="h-full flex flex-col items-center justify-center py-40 gap-6 italic opacity-20 uppercase font-black text-center font-mono">
                      Geração Finalizada com Sucesso.<br/>Clique em Exportar para baixar o arquivo completo.
                   </div>
                 )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* OVERLAY COMERCIAL DE LOADING */}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/90 z-[120] flex flex-col items-center justify-center text-white backdrop-blur-md">
          <div className="relative mb-10">
            <div className="w-24 h-24 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin" />
            <img src="/omega.png" className="absolute top-0 left-0 w-24 h-24 p-6 object-contain animate-pulse" alt="Ω" />
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter mb-2 font-mono uppercase">Carregando Base</h2>
          <p className="text-slate-500 uppercase text-[10px] font-black tracking-[0.4em] font-mono text-center px-10 italic">Consolidando informações fiscais...</p>
        </div>
      )}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(147, 51, 234, 0.3); border-radius: 10px; }`}</style>
    </div>
  );
}