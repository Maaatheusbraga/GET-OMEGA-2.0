import React, { useState } from 'react';
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
  Layers
} from 'lucide-react';

/**
 * CONFIGURAÇÃO DAS BASES REAIS
 */
const PROCEDURES_CONFIG = [
  {
    id: 'base_xml',
    title: 'Base de XML',
    description: 'Extração de dados de TBL_XML (Entradas, Saídas e Terceiros) do banco SPEDS.',
    icon: <FileCode className="w-7 h-7" />,
    params: [
      { name: 'id_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'data_inicio', label: 'Data Início', type: 'date' },
      { name: 'data_fim', label: 'Data Fim', type: 'date' },
    ]
  },
  {
    id: 'efd_contribuicoes',
    title: 'EFD Contribuições',
    description: 'Processamento e extração de registos (C170, C500, F100, etc.) para o banco SPEDS.',
    icon: <Layers className="w-7 h-7" />,
    params: [
      { name: 'p_cliente', label: 'ID Cliente', type: 'number', placeholder: 'Ex: 123' },
      { name: 'p_cnpj', label: 'CNPJ', type: 'text', placeholder: '00.000.000/0000-00' },
      { name: 'p_periodo_i', label: 'Data Início', type: 'date' },
      { name: 'p_periodo_f', label: 'Data Fim', type: 'date' },
    ]
  }
];

const REG_OPTIONS = [
  "A100", "C170", "C175", "C500", "D100", "D500", 
  "F100", "F500", "F525", "F550", "F600", "F700"
];

// Mock de dados simulando o retorno real das colunas do banco (SQL Server)
const MOCK_DB_RESULTS = {
  base_xml: [
    { id_cliente: 123, periodo: "2024-02-01", modelo: "55", serie: "1", numero: "45021", nome_empresa: "EMPRESA EXEMPLO LTDA", valcontabil: 15200.50, chave: "35240212345678901234550010000450211234567890" },
    { id_cliente: 123, periodo: "2024-02-02", modelo: "55", serie: "1", numero: "45022", nome_empresa: "EMPRESA EXEMPLO LTDA", valcontabil: 8450.00, chave: "35240212345678901234550010000450221234567890" },
  ],
  efd_contribuicoes: [
    { ID_CLIENTE: 123, PERIODO: "2024-02-10", REG: "C170", NUMERO_NOTA: "8892", CNPJ: "12.345.678/0001-90", VALOR_NOTA: 1250.30, CHAVE: "35240212345678901234550010000088921234567890" },
    { ID_CLIENTE: 123, PERIODO: "2024-02-11", REG: "C170", NUMERO_NOTA: "8893", CNPJ: "12.345.678/0001-90", VALOR_NOTA: 450.00, CHAVE: "35240212345678901234550010000088931234567890" },
  ]
};

export default function App() {
  const [view, setView] = useState('login'); 
  const [darkMode, setDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProc, setSelectedProc] = useState(null);
  const [user, setUser] = useState(null);

  // Estados dos Filtros
  const [xmlFilters, setXmlFilters] = useState({ emitente: 'proprios', tipo: 'entrada_saida' });
  const [efdFilters, setEfdFilters] = useState({ reg: 'C170' });
  const [msg, setMsg] = useState({ type: '', text: '' });

  const toggleTheme = () => setDarkMode(!darkMode);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setUser({ name: 'Matheus', role: 'Administrador' });
      setView('dashboard');
      setIsLoading(false);
    }, 1000);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setMsg({ type: 'success', text: 'Utilizador cadastrado com sucesso!' });
      setTimeout(() => { setView('login'); setIsLoading(false); }, 1500);
    }, 1000);
  };

  const handleGenerate = () => {
    setIsLoading(true);
    setTimeout(() => {
      setView('results');
      setIsLoading(false);
    }, 1500);
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
            <div className={`p-1 rounded-2xl bg-gradient-to-br ${themeClasses.accent} shadow-lg shadow-purple-500/30 overflow-hidden`}>
              <img src="/omega.png" alt="Logo" className="w-14 h-14 object-contain" onError={(e) => { e.target.src = "https://via.placeholder.com/60?text=Ω"; }} />
            </div>
            <button onClick={toggleTheme} className="p-3 rounded-xl hover:bg-white/10 transition-colors">
              {darkMode ? <Sun className="text-yellow-400 w-5 h-5" /> : <Moon className="text-slate-600 w-5 h-5" />}
            </button>
          </div>
          <h1 className={`text-4xl font-black tracking-tighter mb-2 italic text-transparent bg-clip-text bg-gradient-to-r ${themeClasses.accent}`}>
            GET OMEGA 2.0
          </h1>
          <p className="text-slate-500 font-bold text-[10px] uppercase tracking-[0.3em] mb-10 italic">Intelligence Data Extraction</p>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-purple-500 transition-colors" />
              <input type="email" placeholder="E-mail Corporativo" className={`w-full py-4 pl-12 pr-4 rounded-2xl border outline-none focus:ring-4 focus:ring-purple-500/20 transition-all ${themeClasses.input}`} required />
            </div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5 group-focus-within:text-pink-500 transition-colors" />
              <input type="password" placeholder="Senha" className={`w-full py-4 pl-12 pr-4 rounded-2xl border outline-none focus:ring-4 focus:ring-pink-500/20 transition-all ${themeClasses.input}`} required />
            </div>
            <button className={`w-full py-5 rounded-2xl bg-gradient-to-r ${themeClasses.accent} text-white font-black text-lg shadow-xl shadow-purple-900/30 hover:scale-[1.02] active:scale-95 transition-all`}>
              {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Entrar no Sistema'}
            </button>
          </form>
          <div className="mt-8 text-center pt-6 border-t border-slate-700/30">
            <button onClick={() => setView('register')} className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-purple-500 transition-colors flex items-center justify-center gap-2 mx-auto">
              <UserPlus className="w-4 h-4" /> Criar nova conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 transition-colors duration-500 ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <div className={`w-full max-w-2xl p-10 rounded-[3rem] border relative z-10 transition-all ${themeClasses.card}`}>
          <div className="flex items-center gap-4 mb-8">
            <img src="/omega.png" alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h2 className="text-2xl font-black italic tracking-tighter mb-1">Novo Utilizador</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Cadastro SPEDS.TBL_USUARIO</p>
            </div>
          </div>
          <form onSubmit={handleRegister} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-xs font-black uppercase opacity-60 ml-1 italic">Nome Completo</label>
                <input type="text" className={`w-full py-4 px-6 rounded-2xl border outline-none focus:ring-4 focus:ring-purple-500/10 transition-all ${themeClasses.input}`} required />
              </div>
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="text-xs font-black uppercase opacity-60 ml-1 italic">E-mail</label>
                <input type="email" className={`w-full py-4 px-6 rounded-2xl border outline-none focus:ring-4 focus:ring-purple-500/10 transition-all ${themeClasses.input}`} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase opacity-60 ml-1 italic">Senha</label>
                <input type="password" className={`w-full py-4 px-6 rounded-2xl border outline-none focus:ring-4 focus:ring-pink-500/10 transition-all ${themeClasses.input}`} required />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase opacity-60 ml-1 italic">Confirmar Senha</label>
                <input type="password" className={`w-full py-4 px-6 rounded-2xl border outline-none focus:ring-4 focus:ring-pink-500/10 transition-all ${themeClasses.input}`} required />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setView('login')} className="flex-1 py-5 rounded-2xl border border-slate-700 font-black text-xs uppercase tracking-widest hover:bg-white/5 transition-all">Voltar</button>
              <button type="submit" className={`flex-[2] py-5 rounded-2xl bg-gradient-to-r ${themeClasses.accent} text-white font-black text-xs uppercase tracking-widest shadow-xl`}>Concluir Cadastro</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${themeClasses.bg}`}>
      <header className={`sticky top-0 z-50 px-8 py-4 border-b backdrop-blur-xl flex items-center justify-between ${darkMode ? 'bg-slate-950/80 border-white/5' : 'bg-white/80 border-slate-200'}`}>
        <div className="flex items-center gap-4">
          <div className={`p-1 rounded-xl bg-gradient-to-br ${themeClasses.accent} flex items-center justify-center shadow-lg shadow-purple-500/20 overflow-hidden`}>
            <img src="/omega.png" alt="Ω" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h2 className={`text-sm font-black tracking-tight uppercase italic text-transparent bg-clip-text bg-gradient-to-r ${themeClasses.accent}`}>Get Omega 2.0</h2>
            <div className="flex items-center gap-2">
              <Server className="w-3 h-3 text-green-500" />
              <span className="text-[9px] font-black uppercase text-green-500 tracking-widest italic tracking-tight">SPEDS Online</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2.5 rounded-xl hover:bg-white/10 transition-all">
            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="text-slate-600 w-5 h-5" />}
          </button>
          <button onClick={() => setView('login')} className="p-3 rounded-xl hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"><LogOut className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 w-full flex-1">
        {view === 'dashboard' ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl font-black tracking-tighter mb-8 italic">Qual base deseja gerar hoje?</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {PROCEDURES_CONFIG.map((proc) => (
                <button key={proc.id} onClick={() => { setSelectedProc(proc); setView('params'); }} className={`group p-8 rounded-[2.5rem] border text-left transition-all ${themeClasses.card} hover:scale-[1.02]`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-purple-600/10 text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-all`}>
                    {proc.icon}
                  </div>
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
             <div className={`p-10 rounded-[3.5rem] border ${themeClasses.card}`}>
                <h2 className="text-2xl font-black mb-8 italic border-b border-slate-700/20 pb-4 tracking-tight">{selectedProc.title}</h2>
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedProc.params.map(p => (
                      <div key={p.name} className="space-y-2">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">{p.label}</label>
                        <input type={p.type} placeholder={p.placeholder} className={`w-full py-4 px-6 rounded-2xl border outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-bold ${themeClasses.input}`} />
                      </div>
                    ))}
                    
                    {selectedProc.id === 'efd_contribuicoes' && (
                      <div className="space-y-2 col-span-1 md:col-span-2">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">Selecionar Registro (REG):</label>
                        <select 
                          className={`w-full py-4 px-6 rounded-2xl border outline-none focus:ring-4 focus:ring-purple-500/10 transition-all font-bold appearance-none cursor-pointer ${themeClasses.input}`}
                          value={efdFilters.reg}
                          onChange={(e) => setEfdFilters({...efdFilters, reg: e.target.value})}
                        >
                          {REG_OPTIONS.map(reg => <option key={reg} value={reg} className="bg-slate-900 text-white">{reg}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {selectedProc.id === 'base_xml' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                      <div className="space-y-4">
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">Selecione o Emitente:</label>
                        <div className="flex gap-4">
                          {['proprios', 'terceiros'].map(opt => (
                            <label key={opt} className={`flex-1 cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold uppercase text-xs tracking-widest ${xmlFilters.emitente === opt ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-slate-700 opacity-50'}`}>
                              <input type="radio" name="emitente" className="hidden" checked={xmlFilters.emitente === opt} onChange={() => setXmlFilters({...xmlFilters, emitente: opt})} />
                              {opt === 'proprios' ? 'Próprios' : 'Terceiros'}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className={`space-y-4 transition-all ${xmlFilters.emitente === 'terceiros' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        <label className="text-xs font-black uppercase opacity-60 ml-2 italic">Tipo da Base:</label>
                        <div className="flex flex-wrap gap-4">
                          {[
                            {id: 'entrada', label: 'Entrada'},
                            {id: 'saida', label: 'Saída'},
                            {id: 'entrada_saida', label: 'Entrada e Saída'}
                          ].map(opt => (
                            <label key={opt.id} className={`flex-1 min-w-[120px] cursor-pointer p-4 rounded-2xl border transition-all flex items-center justify-center gap-3 font-bold uppercase text-[10px] tracking-widest ${xmlFilters.tipo === opt.id ? 'bg-pink-600 border-pink-500 text-white' : 'bg-white/5 border-slate-700 opacity-50'}`}>
                              <input type="radio" name="tipo_xml" className="hidden" checked={xmlFilters.tipo === opt.id} onChange={() => setXmlFilters({...xmlFilters, tipo: opt.id})} />
                              {opt.label}
                            </label>
                          ))}
                        </div>
                        {xmlFilters.emitente === 'terceiros' && <p className="text-[10px] text-pink-500 font-black italic uppercase text-center">Opções desabilitadas para Terceiros</p>}
                      </div>
                    </div>
                  )}

                  <button onClick={handleGenerate} className={`w-full py-5 rounded-2xl bg-gradient-to-r ${themeClasses.accent} text-white font-black text-lg shadow-xl hover:opacity-90 transition-all active:scale-[0.98]`}>
                    GERAR BASE NO SQL
                  </button>
                </div>
             </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-700 space-y-8">
            <div className="flex justify-between items-end flex-wrap gap-4">
              <div className="space-y-4">
                <button onClick={() => setView('params')} className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-purple-500 hover:opacity-70 transition-all">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Voltar aos Parâmetros
                </button>
                <div>
                  <h1 className="text-3xl font-black italic tracking-tight">Resultados do Banco {selectedProc?.id === 'efd_contribuicoes' ? `- REG ${efdFilters.reg}` : ''}</h1>
                  <p className="text-sm opacity-60 italic tracking-tight">Amostra técnica das colunas extraídas do SQL Server.</p>
                </div>
              </div>
              <button className="px-10 py-5 bg-green-600 text-white font-black rounded-2xl flex items-center gap-3 shadow-xl hover:bg-green-700 transition-all active:scale-95 uppercase text-xs tracking-widest">
                <FileSpreadsheet className="w-5 h-5" /> EXPORTAR PARA EXCEL
              </button>
            </div>
            
            <div className={`rounded-[2.5rem] border overflow-hidden ${themeClasses.card}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className={`${darkMode ? 'bg-white/5' : 'bg-slate-50'} border-b border-white/5`}>
                    {selectedProc?.id === 'base_xml' ? (
                      <tr>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">periodo</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">modelo</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">serie</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">numero</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">nome_empresa</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 text-right italic">valcontabil</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">chave</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">PERIODO</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">REG</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">NUMERO_NOTA</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">CNPJ</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 text-right italic">VALOR_NOTA</th>
                        <th className="p-6 text-[10px] font-black uppercase opacity-40 italic">CHAVE</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {selectedProc?.id === 'base_xml' ? (
                      MOCK_DB_RESULTS.base_xml.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="p-6 text-xs font-bold opacity-60">{row.periodo}</td>
                          <td className="p-6 text-xs font-black">{row.modelo}</td>
                          <td className="p-6 text-xs font-black">{row.serie}</td>
                          <td className="p-6 text-xs font-black">{row.numero}</td>
                          <td className="p-6 text-sm font-black italic">{row.nome_empresa}</td>
                          <td className="p-6 text-sm font-bold text-right tabular-nums">{row.valcontabil.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="p-6 font-mono text-[10px] text-purple-500 font-bold">{row.chave}</td>
                        </tr>
                      ))
                    ) : (
                      MOCK_DB_RESULTS.efd_contribuicoes.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="p-6 text-xs font-bold opacity-60">{row.PERIODO}</td>
                          <td className="p-6 text-xs font-black text-pink-500">{row.REG}</td>
                          <td className="p-6 text-xs font-black">{row.NUMERO_NOTA}</td>
                          <td className="p-6 text-xs font-black">{row.CNPJ}</td>
                          <td className="p-6 text-sm font-bold text-right tabular-nums">{row.VALOR_NOTA.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                          <td className="p-6 font-mono text-[10px] text-purple-500 font-bold">{row.CHAVE}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-lg z-[100] flex flex-col items-center justify-center text-white text-center p-6">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin mx-auto" />
            <img src="/omega.png" alt="Logo" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 object-contain animate-pulse" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter italic mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            Executando Procedure...
          </h2>
          <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em] italic">Acedendo ao SRV-SISTEMA (Banco SPEDS)</p>
        </div>
      )}
    </div>
  );
}