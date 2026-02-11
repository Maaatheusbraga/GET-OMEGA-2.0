import React, { useState, useEffect } from 'react';
import { 
  Search, 
  LogOut, 
  Calendar, 
  Filter, 
  ChevronRight, 
  FileSpreadsheet, 
  User, 
  Lock, 
  ArrowLeft, 
  Loader2, 
  Moon, 
  Sun,
  Zap,
  Server,
  Activity,
  Mail,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Layers,
  TableProperties,
  Download,
  Box,
  Database,
  ClipboardList,
  Sparkles,
  MessageSquare,
  FileText,
  TrendingUp,
  DollarSign,
  FileStack,
  Factory,
  UserSearch,
  X
} from 'lucide-react';

// --- CONFIGURAÇÃO DA API GEMINI ---
const apiKey = ""; 
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";

async function fetchGeminiInsight(dataSample, moduleTitle) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${apiKey}`;
  const systemPrompt = `Você é o "Omega AI", um consultor sênior especializado em SPED Fiscal (ICMS/IPI) e Contribuições do Brasil. Analise a amostra JSON e forneça 3 insights técnicos ou alertas fiscais (⚠️) ou pontos positivos (✨). Seja conciso e profissional em Português.`;
  const userQuery = `Módulo: ${moduleTitle}. Dados: ${JSON.stringify(dataSample)}`;
  const payload = { contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };

  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "Análise indisponível no momento.";
  } catch (error) { return "Erro ao conectar com a IA."; }
}

/**
 * CONFIGURAÇÃO DAS PROCEDURES E BASES REAIS
 * ORDEM REORGANIZADA CONFORME SOLICITAÇÃO FINAL
 */
const PROCEDURES_CONFIG = [
  {
    id: 'efd_fiscal',
    title: 'EFD Fiscal',
    description: 'Geração dos blocos C170, C590, D190 e D590. Exportação multi-aba consolidada.',
    icon: <ClipboardList className="w-7 h-7" />,
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'cnpj', label: 'CNPJ', type: 'text', placeholder: '00.000.000/0000-00' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ],
    multiResult: true
  },
  {
    id: 'efd_contribuicoes',
    title: 'EFD Contribuições',
    description: 'Processamento e extração de registros (C170, C500, F100, etc.) para o banco SPEDS.',
    icon: <Layers className="w-7 h-7" />,
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'p_cnpj', label: 'CNPJ', type: 'text', placeholder: '00.000.000/0000-00' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ],
    multiSelect: true
  },
  {
    id: 'efd_bloco_m',
    title: 'EFD Contribuições (Bloco M)',
    description: 'Geração consolidada do Bloco M com 15 abas para exportação direta.',
    icon: <TableProperties className="w-7 h-7" />,
    params: [
      { name: 'p_cnpj', label: 'CNPJ', type: 'text', placeholder: '00.000.000/0000-00' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ],
    noPreview: true 
  },
  {
    id: 'bloco_d',
    title: 'EFD Contribuições (Bloco D)',
    description: 'Extração de registros de transporte e comunicações (D200, D201, D205).',
    icon: <Box className="w-7 h-7" />,
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ],
    multiSelect: true
  },
  {
    id: 'bloco_1000',
    title: 'Bloco 1000',
    description: 'Apuração de créditos e retenções (1100, 1500, 1300, 1700) do PIS/COFINS.',
    icon: <Database className="w-7 h-7" />,
    params: [
      { name: 'p_cnpj', label: 'CNPJ', type: 'text', placeholder: '00.000.000/0000-00' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ],
    multiSelect: true
  },
  {
    id: 'base_xml',
    title: 'Base XML',
    description: 'Extração de dados de TBL_XML (Entradas, Saídas e Terceiros) do banco SPEDS.',
    icon: <FileCode className="w-7 h-7" />,
    params: [
      { name: 'id_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'data_inicio', label: 'Data Início', type: 'date' },
      { name: 'data_fim', label: 'Data Fim', type: 'date' },
    ],
    isSpecial: true
  },
  {
    id: 'resumo_entrada',
    title: 'Resumo de Entrada no SPED',
    description: 'Consolidação de entradas com detalhes de impostos (ICMS, IPI, PIS, COFINS).',
    icon: <FileText className="w-7 h-7" />,
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'p_cnpj', label: 'CNPJ', type: 'text', placeholder: '00.000.000/0000-00' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ]
  },
  {
    id: 'resumo_saida',
    title: 'Resumo de Saída no SPED',
    description: 'Consolidação de notas de saída com alíquotas calculadas e detalhes de ICMS.',
    icon: <TrendingUp className="w-7 h-7" />,
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'p_data_i', label: 'Data Início', type: 'date' },
      { name: 'p_data_f', label: 'Data Fim', type: 'date' },
    ]
  },
  {
    id: 'resumo_valores',
    title: 'Resumo de Valores no SPED',
    description: 'Totalização de valores contábeis, base de cálculo e ICMS agrupados por CFOP/CST.',
    icon: <DollarSign className="w-7 h-7" />,
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ]
  },
  {
    id: 'bloco_e',
    title: 'Bloco E',
    description: 'Apuração de ICMS e IPI (E110, E111). Exportação de débitos, créditos e ajustes.',
    icon: <FileStack className="w-7 h-7" />,
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ],
    multiResult: true
  },
  {
    id: 'bloco_ipi',
    title: 'Bloco IPI',
    description: 'Apuração do Imposto sobre Produtos Industrializados (E510, E520, E530, E531).',
    icon: <Factory className="w-7 h-7" />,
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ],
    multiResult: true
  }
];

const REG_OPTIONS_CONTRIB = ["A100", "C170", "C175", "C500", "D100", "D500", "F100", "F500", "F525", "F550", "F600", "F700"];
const REG_OPTIONS_D = ["D200", "D201", "D205"];
const REG_OPTIONS_1000 = ["1100", "1500", "1300", "1700"];
const EFD_FISCAL_BLOCKS = ["C170", "C590", "D190", "D590"];
const BLOCO_E_BLOCKS = ["E110", "E111"];
const BLOCO_IPI_BLOCKS = ["E510", "E520", "E530", "E531"];

const MOCK_CLIENTES = [
  { id_cliente: 1, nome: "AGRO INDUSTRIAL OMEGA", cnpj: "10.200.300/0001-44" },
  { id_cliente: 123, nome: "EMPRESA EXEMPLO LTDA", cnpj: "12.345.678/0001-90" },
  { id_cliente: 456, nome: "SUPERMERCADO ALPHA", cnpj: "98.765.432/0001-10" },
];

const MOCK_DB_RESULTS = {
  resumo_saida: [ { periodo: "2024-02-01", NUMERO_NOTA: "88990", CNPJ_PART: "10.200.300/0001-44", NOME_PART: "CLIENTE FINAL SA", VALOR_NOTA: 28500.00, VL_ICMS: 5130.00, CFOP: "5102" } ],
};

export default function App() {
  const [view, setView] = useState('login'); 
  const [darkMode, setDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [selectedProc, setSelectedProc] = useState(null);
  const [user, setUser] = useState(null);

  const [formValues, setFormValues] = useState({});
  const [xmlFilters, setXmlFilters] = useState({ emitente: 'proprios', tipo: 'entrada_saida' });
  const [clientSearch, setClientSearch] = useState('');
  const [activeFiscalTab, setActiveFiscalTab] = useState('');
  const [regFilter, setRegFilter] = useState('');
  const [aiInsight, setAiInsight] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      // Definindo o nome do usuário para os logs futuros
      setUser({ name: 'Matheus Braga', role: 'Administrador' });
      setView('dashboard');
      setIsLoading(false);
    }, 800);
  };

  const handleGenerate = () => {
    // VALIDAÇÃO OBRIGATÓRIA: Verifica se todos os parâmetros foram preenchidos
    const allFilled = selectedProc.params.every(p => formValues[p.name] && formValues[p.name].toString().trim() !== "");
    
    if (!allFilled) {
      setErrorMsg("Atenção: Todos os parâmetros devem ser preenchidos para gerar a base.");
      setTimeout(() => setErrorMsg(null), 4000);
      return;
    }

    setIsLoading(true);
    setAiInsight(null);
    if(selectedProc.id === 'efd_fiscal') setActiveFiscalTab('C170');
    if(selectedProc.id === 'bloco_e') setActiveFiscalTab('E110');
    if(selectedProc.id === 'bloco_ipi') setActiveFiscalTab('E510');
    setTimeout(() => { setView('results'); setIsLoading(false); }, 1200);
  };

  const runAiAnalysis = async () => {
    if (!selectedProc) return;
    setIsAiLoading(true);
    const insight = await fetchGeminiInsight(MOCK_DB_RESULTS.resumo_saida, selectedProc.title);
    setAiInsight(insight);
    setIsAiLoading(false);
  };

  const selectClient = (client) => {
    const newValues = { ...formValues };
    ['p_cliente', 'id_cliente'].forEach(name => newValues[name] = client.id_cliente);
    ['p_cnpj', 'cnpj'].forEach(name => newValues[name] = client.cnpj);
    setFormValues(newValues);
    setIsConsultOpen(false);
    setClientSearch('');
    setErrorMsg(null);
  };

  const themeClasses = {
    bg: darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900',
    card: darkMode ? 'bg-slate-900/50 border-slate-800 backdrop-blur-md' : 'bg-white border-slate-200 shadow-xl',
    input: darkMode ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400',
    accent: 'from-purple-600 to-pink-500'
  };

  if (view === 'login') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-600/20 blur-[120px] rounded-full" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-pink-600/20 blur-[120px] rounded-full" />
        </div>
        <div className={`w-full max-w-md p-10 rounded-[2.5rem] border relative z-10 transition-all ${themeClasses.card}`}>
          <div className="flex justify-between items-center mb-8">
            <div className={`p-1 rounded-2xl bg-gradient-to-br ${themeClasses.accent} shadow-lg shadow-purple-500/30 overflow-hidden`}><img src="/omega.png" alt="Logo" className="w-14 h-14 object-contain" onError={(e) => { e.target.src = "https://via.placeholder.com/60?text=Ω"; }} /></div>
            <button onClick={toggleTheme} className="p-3 rounded-xl hover:bg-white/10 transition-colors">{darkMode ? <Sun className="text-yellow-400 w-5 h-5" /> : <Moon className="text-slate-600 w-5 h-5" />}</button>
          </div>
          <h1 className={`text-4xl font-black tracking-tighter mb-2 italic text-transparent bg-clip-text bg-gradient-to-r ${themeClasses.accent}`}>GET OMEGA 2.0</h1>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-purple-500" /><input type="email" placeholder="E-mail Corporativo" className={`w-full py-4 pl-12 pr-4 rounded-2xl border outline-none focus:ring-4 focus:ring-purple-500/20 transition-all ${themeClasses.input}`} required /></div>
            <div className="relative group"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-pink-500" /><input type="password" placeholder="Senha" className={`w-full py-4 pl-12 pr-4 rounded-2xl border outline-none focus:ring-4 focus:ring-pink-500/20 transition-all ${themeClasses.input}`} required /></div>
            <button className={`w-full py-5 rounded-2xl bg-gradient-to-r ${themeClasses.accent} text-white font-black text-lg shadow-xl shadow-purple-900/30 hover:scale-[1.02] active:scale-95 transition-all`}>{isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Entrar no Sistema'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeClasses.bg}`}>
      {isConsultOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsConsultOpen(false)} />
          <div className={`w-full max-w-2xl rounded-[2.5rem] border p-8 relative z-10 animate-in zoom-in-95 duration-300 ${themeClasses.card}`}>
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3"><div className="p-3 rounded-xl bg-purple-600 text-white"><UserSearch className="w-5 h-5" /></div><div><h2 className="text-xl font-black italic uppercase tracking-tight">Consultar Cliente</h2><p className="text-[10px] font-black uppercase opacity-50 tracking-widest text-slate-400">Busca na Tabela Cliente - SPEDS</p></div></div>
              <button onClick={() => setIsConsultOpen(false)} className="p-2 rounded-lg hover:bg-white/10 text-slate-500"><X className="w-6 h-6" /></button>
            </div>
            <div className="relative mb-8"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" /><input type="text" placeholder="Digite o nome para pesquisar..." className={`w-full py-4 pl-12 pr-4 rounded-2xl border outline-none focus:ring-4 focus:ring-purple-500/20 transition-all ${themeClasses.input}`} value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} autoFocus /></div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {MOCK_CLIENTES.filter(c => c.nome.toLowerCase().includes(clientSearch.toLowerCase())).map(client => (
                <button key={client.id_cliente} onClick={() => selectClient(client)} className="w-full p-5 rounded-2xl border border-white/5 bg-white/5 hover:bg-purple-600/20 hover:border-purple-600/50 text-left transition-all group flex items-center justify-between">
                  <div><h4 className="font-black italic text-sm group-hover:text-purple-400 transition-colors">{client.nome}</h4><div className="flex gap-4 mt-1 opacity-50 text-[10px] font-bold"><span>ID: {client.id_cliente}</span><span>CNPJ: {client.cnpj}</span></div></div>
                  <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-purple-400" />
                </button>
              ))}
            </div>
            <button onClick={() => setIsConsultOpen(false)} className="w-full mt-6 py-4 rounded-xl border border-slate-700 font-black text-[10px] uppercase tracking-widest hover:bg-white/5 transition-all">Voltar</button>
          </div>
        </div>
      )}

      <header className={`sticky top-0 z-50 px-8 py-4 border-b backdrop-blur-xl flex items-center justify-between ${darkMode ? 'bg-slate-950/80 border-white/5' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-1 rounded-xl bg-gradient-to-br ${themeClasses.accent} flex items-center justify-center shadow-lg overflow-hidden`}><img src="/omega.png" alt="Ω" className="w-10 h-10 object-contain" /></div>
          <div><h2 className={`text-sm font-black uppercase italic text-transparent bg-clip-text bg-gradient-to-r ${themeClasses.accent}`}>Get Omega 2.0</h2><div className="flex items-center gap-2"><Server className="w-3 h-3 text-green-500" /><span className="text-[9px] font-black uppercase text-green-500 tracking-widest italic">SPEDS Online</span></div></div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2.5 rounded-xl hover:bg-white/10 transition-all">{darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="text-slate-600 w-5 h-5" />}</button>
          <div className="hidden md:flex flex-col items-end px-2 border-l border-white/10">
            <span className="text-xs font-black italic">{user?.name}</span>
            <span className="text-[10px] font-bold text-purple-500 uppercase">Operador</span>
          </div>
          <button onClick={() => setView('login')} className="p-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 w-full flex-1">
        {view === 'dashboard' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-black tracking-tighter mb-8 italic">Selecione a base que deseja gerar</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {PROCEDURES_CONFIG.map((proc) => (
                <button key={proc.id} onClick={() => { setSelectedProc(proc); setFormValues({}); setView('params'); if(proc.multiSelect) { setRegFilter(proc.id === 'efd_contribuicoes' ? 'C170' : proc.id === 'bloco_d' ? 'D200' : '1100'); } }} className={`group p-8 rounded-[2.5rem] border text-left transition-all ${themeClasses.card} hover:scale-[1.02]`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-purple-600/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all`}>{proc.icon}</div>
                  <h3 className="text-xl font-black mb-3 italic tracking-tight">{proc.title}</h3>
                  <p className="text-sm opacity-60 mb-8 leading-relaxed italic">{proc.description}</p>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase text-purple-500">Configurar <ChevronRight className="w-4 h-4" /></div>
                </button>
              ))}
            </div>
          </div>
        ) : view === 'params' ? (
          <div className="max-w-3xl mx-auto animate-in zoom-in-95 duration-500">
             <button onClick={() => setView('dashboard')} className="flex items-center gap-2 mb-6 text-xs font-black uppercase text-purple-500 hover:opacity-70 transition-all"><ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard</button>
             <div className={`p-10 rounded-[3.5rem] border ${themeClasses.card} relative overflow-hidden`}>
                <div className="flex justify-between items-start mb-8 border-b border-slate-700/20 pb-6">
                  <h2 className="text-2xl font-black italic tracking-tight">{selectedProc.title}</h2>
                  <button onClick={() => setIsConsultOpen(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600/10 text-purple-500 border border-purple-600/20 font-black text-[10px] uppercase tracking-widest hover:bg-purple-600 hover:text-white transition-all shadow-lg shadow-purple-900/10 italic"><UserSearch className="w-4 h-4" /> Consultar Cliente</button>
                </div>

                {errorMsg && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 text-xs font-black uppercase animate-in slide-in-from-top-2">
                    <AlertCircle className="w-4 h-4" /> {errorMsg}
                  </div>
                )}
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedProc.params.map(p => (
                      <div key={p.name} className="space-y-2">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">{p.label}</label>
                        <input type={p.type} placeholder={p.placeholder} className={`w-full py-4 px-6 rounded-2xl border outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-bold ${themeClasses.input}`} value={formValues[p.name] || ''} onChange={(e) => setFormValues({...formValues, [p.name]: e.target.value})} />
                      </div>
                    ))}
                    {selectedProc.multiSelect && (
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">Registro (REG):</label>
                        <select className={`w-full py-4 px-6 rounded-2xl border outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-bold appearance-none cursor-pointer ${themeClasses.input}`} value={regFilter} onChange={(e) => setRegFilter(e.target.value)}>
                          {selectedProc.id === 'efd_contribuicoes' && REG_OPTIONS_CONTRIB.map(reg => <option key={reg} value={reg} className="bg-slate-900 text-white">{reg}</option>)}
                          {selectedProc.id === 'bloco_d' && REG_OPTIONS_D.map(reg => <option key={reg} value={reg} className="bg-slate-900 text-white">{reg}</option>)}
                          {selectedProc.id === 'bloco_1000' && REG_OPTIONS_1000.map(reg => <option key={reg} value={reg} className="bg-slate-900 text-white">{reg}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {selectedProc.id === 'base_xml' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">Emitente:</label>
                        <div className="flex gap-4">
                          {['proprios', 'terceiros'].map(opt => (
                            <label key={opt} className={`flex-1 cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold uppercase text-xs tracking-widest ${xmlFilters.emitente === opt ? 'bg-purple-600 border-purple-500 text-white shadow-lg' : 'bg-white/5 border-slate-700 opacity-50'}`}>
                              <input type="radio" name="emitente" className="hidden" checked={xmlFilters.emitente === opt} onChange={() => setXmlFilters({...xmlFilters, emitente: opt})} />
                              {opt === 'proprios' ? 'Próprios' : 'Terceiros'}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className={`space-y-4 transition-all ${xmlFilters.emitente === 'terceiros' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">Tipo da Base:</label>
                        <div className="flex flex-wrap gap-4">
                          {[ {id: 'entrada', label: 'Entrada'}, {id: 'saida', label: 'Saída'}, {id: 'entrada_saida', label: 'Entrada e Saída'} ].map(opt => (
                            <label key={opt.id} className={`flex-1 min-w-[120px] cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-widest ${xmlFilters.tipo === opt.id ? 'bg-pink-600 border-pink-500 text-white shadow-lg' : 'bg-white/5 border-slate-700 opacity-50'}`}>
                              <input type="radio" name="tipo_xml" className="hidden" checked={xmlFilters.tipo === opt.id} onChange={() => setXmlFilters({...xmlFilters, tipo: opt.id})} />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                        {xmlFilters.emitente === 'terceiros' && <p className="text-[10px] text-pink-500 font-black uppercase text-center mt-2 italic">Filtros de tipo desabilitados para Terceiros</p>}
                      </div>
                    </div>
                  )}

                  <button onClick={handleGenerate} className={`w-full py-5 rounded-2xl bg-gradient-to-r ${themeClasses.accent} text-white font-black text-lg shadow-xl hover:opacity-90 active:scale-[0.98] transition-all italic tracking-widest uppercase`}>GERAR BASE</button>
                </div>
             </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700 space-y-8 flex flex-col flex-1">
            <div className="flex justify-between items-end flex-wrap gap-4">
              <div className="space-y-4">
                <button onClick={() => setView('params')} className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-500 hover:opacity-70 transition-all italic"><ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar aos Parâmetros</button>
                <div>
                  <h1 className="text-3xl font-black italic tracking-tight">{selectedProc?.noPreview ? 'Processamento Concluído' : `Resultados do Banco ${selectedProc?.multiResult ? `- ${activeFiscalTab}` : regFilter ? `- REG ${regFilter}` : ''}`}</h1>
                  <p className="text-sm opacity-60 italic tracking-tight">Amostra técnica extraída do SQL Server (SRV-SISTEMA).</p>
                </div>
              </div>
              <div className="flex gap-4">
                {!selectedProc?.noPreview && (
                  <button onClick={runAiAnalysis} disabled={isAiLoading} className="px-8 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black rounded-2xl flex items-center gap-3 shadow-xl hover:scale-[1.05] transition-all active:scale-95 disabled:opacity-50 text-xs tracking-widest italic">{isAiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Análise com IA ✨</button>
                )}
                <button className="px-10 py-5 bg-green-600 text-white font-black rounded-2xl flex items-center gap-3 shadow-xl hover:bg-green-700 active:scale-95 text-xs tracking-widest italic"><FileSpreadsheet className="w-5 h-5" /> EXPORTAR PARA EXCEL</button>
              </div>
            </div>

            {aiInsight && (<div className={`p-8 rounded-[2.5rem] border border-purple-500/20 bg-gradient-to-br from-purple-900/10 to-indigo-900/10 animate-in slide-in-from-top-4 relative overflow-hidden`}><div className="flex items-center gap-4 mb-4"><div className="p-3 rounded-xl bg-purple-600 text-white"><MessageSquare className="w-5 h-5" /></div><h3 className="font-black italic uppercase text-xs tracking-widest text-purple-400">Insights do Assistente Fiscal IA ✨</h3></div><div className="text-sm leading-relaxed opacity-90 whitespace-pre-wrap font-medium italic">{aiInsight}</div></div>)}

            {selectedProc?.multiResult && (
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl w-fit border border-white/5">
                {(selectedProc.id === 'efd_fiscal' ? EFD_FISCAL_BLOCKS : selectedProc.id === 'bloco_e' ? BLOCO_E_BLOCKS : BLOCO_IPI_BLOCKS).map(block => (
                  <button key={block} onClick={() => { setActiveFiscalTab(block); setAiInsight(null); }} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFiscalTab === block ? 'bg-purple-600 text-white shadow-lg' : 'opacity-40 hover:opacity-100'}`}>{block}</button>
                ))}
              </div>
            )}
            
            {!selectedProc?.noPreview ? (
              <div className={`rounded-[2.5rem] border overflow-hidden ${themeClasses.card} flex-1`}>
                <div className="overflow-x-auto h-full">
                  <table className="w-full text-left min-w-[1000px]">
                    <thead className={`${darkMode ? 'bg-white/5' : 'bg-slate-100 border-slate-200'} border-b text-[10px] font-black uppercase opacity-40 italic`}>
                      <tr><th className="p-6">periodo</th><th className="p-6">REG/MOD</th><th className="p-6">NOME/NUMERO</th><th className="p-6 text-right">VALOR/DEBITO</th><th className="p-6 text-right">ICMS/CREDITO</th><th className="p-6">CFOP/INFO</th><th className="p-6">CHAVE/REF</th></tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      <tr className="hover:bg-white/5 transition-colors text-xs font-black italic">
                        <td className="p-6 opacity-60 italic">01/02/2026</td><td className="p-6">C170</td><td className="p-6">EMPRESA OMEGA EXEMPLO</td><td className="p-6 text-right tabular-nums">R$ 15.200,00</td><td className="p-6 text-right text-pink-500 tabular-nums">R$ 2.736,00</td><td className="p-6 font-mono text-purple-400">5102</td><td className="p-6 font-mono text-[9px] opacity-40">352402123456789012345500100000450211234567890</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className={`p-12 rounded-[3rem] border flex flex-col items-center text-center gap-8 ${themeClasses.card} animate-in zoom-in-95`}><div className="w-24 h-24 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shadow-lg shadow-green-500/10"><CheckCircle2 className="w-12 h-12" /></div><h2 className="text-2xl font-black italic uppercase tracking-tighter">Processamento Concluído</h2><p className="text-slate-500 max-w-sm font-medium">Os dados foram gerados e estão prontos para a exportação multi-aba.</p><button className="w-full max-w-sm py-5 rounded-2xl bg-green-600 text-white font-black text-lg shadow-xl hover:bg-green-700 transition-all flex items-center justify-center gap-4 uppercase tracking-widest italic"><Download className="w-6 h-6" /> BAIXAR EXCEL MULTI-ABA</button></div>
            )}
          </div>
        )}
      </main>

      {isLoading && (<div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-[100] flex flex-col items-center justify-center text-white text-center p-6"><div className="relative mb-6"><div className="w-24 h-24 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin mx-auto" /><img src="/omega.png" alt="Logo" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 object-contain animate-pulse" /></div><h2 className="text-3xl font-black tracking-tighter italic mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Gerando Base...</h2><p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em] italic">Conectando ao banco SPEDS (SRV-SISTEMA)</p></div>)}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(147, 51, 234, 0.3); border-radius: 10px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(147, 51, 234, 0.5); }`}</style>
    </div>
  );
}