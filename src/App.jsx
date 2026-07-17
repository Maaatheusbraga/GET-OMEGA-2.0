// ============================================================================
// IMPORTAÇÕES (Trazendo ferramentas externas para dentro do nosso código)
// ============================================================================
// Importa o React e os "Hooks" (useState cria variáveis que atualizam a tela, useEffect executa ações automáticas)
import React, { useState, useEffect } from 'react';
// Importa os ícones visuais (lupa, porta de saída, setas, planilhas, etc.) do pacote Lucide
import { Search, LogOut, ChevronRight, FileSpreadsheet, ArrowLeft, Moon, Sun, Database, Layers, TableProperties, Box, ClipboardList, CheckCircle2, FileCode, BadgeDollarSign, FileText, } from 'lucide-react';
// Importa a função que força o navegador a fazer o download de um arquivo
import { saveAs } from 'file-saver';
// Importa a biblioteca de "Toasts" (aquelas notificações bonitinhas que aparecem no canto da tela)
import toast, { Toaster } from 'react-hot-toast';
import RessarcimentoModule from './RessarcimentoModule.jsx';

// URL da API: vazio = mesma origem (produção no servidor). Em dev/preview o Vite faz proxy de /api.
const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================================
// CONFIGURAÇÃO DOS MÓDULOS (Os "Cards" do Dashboard)
// ============================================================================
// Lista com a configuração exata de cada botão que aparece na tela principal.
// Aqui definimos o ID (que vai pro Python), o título, o ícone e quais campos (params) ele exige.
const PROCEDURES_CONFIG = [
  { id: 'efd_fiscal', title: 'EFD FISCAL', icon: <ClipboardList size={28}/>, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_cnpj', label:'CNPJ'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  // 'multiSelect: true' avisa que esse módulo precisa daquela listinha de REGs
  { id: 'efd_contribuicoes', title: 'EFD CONTRIBUIÇÕES', icon: <Layers size={28}/>, multiSelect: true, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_cnpj', label:'CNPJ'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  // 'noPreview: true' avisa que esse módulo não mostra tabela na tela, vai direto pra tela de download
  { id: 'efd_bloco_m', title: 'EFD BLOCO M', icon: <TableProperties size={28}/>, noPreview: true, params: [{name:'p_cnpj', label:'CNPJ'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'bloco_d', title: 'BLOCO D', icon: <Box size={28}/>,  params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_cnpj', label:'CNPJ'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'bloco_1000', title: 'BLOCO 1000', icon: <Database size={28}/>, multiSelect: true, params: [{name:'p_cnpj', label:'CNPJ'}, {name:'p_cliente', label:'ID Cliente'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  // 'isSpecial: true' avisa que esse módulo precisa daqueles Radio Buttons (Entrada/Saida, Proprios/Terceiros)
  { id: 'base_xml', title: 'BASE XML', icon: <FileCode size={28}/>, isSpecial: true, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'resumo_entrada_sped', title: 'RESUMO ENTRADA SPED', icon: <FileSpreadsheet size={28}/>, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_cnpj', label:'CNPJ'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'resumo_saida_sped', title: 'RESUMO SAÍDA SPED', icon: <FileSpreadsheet size={28}/>, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_cnpj', label:'CNPJ'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'resumo_valores_sped', title: 'RESUMO VALORES SPED', icon: <FileSpreadsheet size={28}/>, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'bloco_e', title: 'BLOCO E', icon: <Box size={28}/>, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'bloco_ipi', title: 'BLOCO IPI', icon: <Box size={28}/>, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'credito_gerado', title: 'CRÉDITO GERADO', icon: <BadgeDollarSign size={28}/>, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] }
];

// Dicionário que guarda as opções da lista de REGs para os módulos que precisam disso
const REG_OPTIONS = {
  efd_contribuicoes: ["A100", "C170", "C175", "C500", "D100", "D500", "F100", "F500", "F525", "F550", "F600", "F700"],
  bloco_1000: ["1100", "1500", "1300", "1700"]
};

/** Lê sessão salva sem quebrar a página se o JSON do localStorage estiver inválido */
function loadSavedUser() {
  try {
    const raw = localStorage.getItem('omega_user');
    if (!raw || raw.trim() === '') return null;
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && data.name) return data;
  } catch { /* ignore */ }
  return null;
}

// ============================================================================
// FUNÇÃO PRINCIPAL DO SISTEMA (Onde a mágica do React acontece)
// ============================================================================
export default function App() {
  // Tenta buscar no cofre do navegador (localStorage) se o usuário já estava logado antes do F5
  const savedUser = loadSavedUser();
  
  // VARIÁVEIS DE ESTADO (Se o valor delas mudar, a tela se atualiza sozinha)
  const [darkMode, setDarkMode] = useState(true); // Controla o tema claro/escuro
  const [isLoading, setIsLoading] = useState(false); // Mostra/esconde a tela de carregamento (engrenagem)
  const [isConsultOpen, setIsConsultOpen] = useState(false); // Mostra/esconde a janela de pesquisar cliente
  const [selectedProc, setSelectedProc] = useState(null); // Guarda qual Card o analista clicou
  const [view, setView] = useState('hub'); // hub → login → dashboard/params/results
  const [user, setUser] = useState(savedUser || null); // Guarda o nome e permissão do usuário logado
  const [formValues, setFormValues] = useState({}); // Guarda tudo que o usuário digita nos campos de data/CNPJ
  const [clientSearch, setClientSearch] = useState(''); // Guarda o que o usuário digita na lupa de clientes
  const [dbClients, setDbClients] = useState([]); // Guarda a lista de clientes que volta do banco de dados
  const [results, setResults] = useState([]); // Guarda as 50 linhas do preview que voltam do Python
  const [regFilter, setRegFilter] = useState(''); // Guarda o REG que o usuário selecionou na listinha
  
  const [xmlType, setXmlType] = useState('entrada_saida'); // Botão Radio do XML (Entrada/Saída)
  const [xmlEmit, setXmlEmit] = useState('proprios'); // Botão Radio do XML (Próprios/Terceiros)
  const [analistaName, setAnalistaName] = useState(''); // Campo de usuário da tela de Login
  const [password, setPassword] = useState(''); // Campo de senha da tela de Login

  // CONSTANTE DE ESTILO: Formatação visual padrão de todas as caixas de texto (inputs) do sistema
  const inputClass = `w-full p-4 rounded-xl border outline-none font-bold transition-all backdrop-blur-md ${
    darkMode 
    ? 'bg-slate-800/60 border-white/10 text-white focus:border-purple-500 focus:bg-slate-800/90' 
    : 'bg-white/60 border-slate-300 text-slate-900 focus:border-purple-500 focus:bg-white shadow-sm'
  }`;

  // ============================================================================
  // EFEITOS E FUNÇÕES DE AÇÃO
  // ============================================================================
  
  // Fica observando a barra de pesquisa de clientes. Se tiver mais de 2 letras, vai no Python buscar no banco.
  useEffect(() => {
    if (clientSearch.length > 2) {
      fetch(`${API_BASE}/api/clientes?search=${clientSearch}`).then(r => r.json()).then(d => setDbClients(d));
    }
  }, [clientSearch]);

  // Função disparada quando o usuário clica no botão "Gerar Base" (Traz o Preview)
  const handleGenerate = async () => {
    // Validação Poka-Yoke: Passa por todos os campos exigidos. Se algum estiver vazio, bloqueia e avisa.
    for (const param of selectedProc.params) {
      if (!formValues[param.name] || formValues[param.name].toString().trim() === '') {
        toast.error(`O campo "${param.label}" é de preenchimento obrigatório!`);
        return;
      }
    }
    // Validação Poka-Yoke: Se o módulo exige REG e o cara não escolheu, bloqueia.
    if (selectedProc.multiSelect && !regFilter) {
      toast.error("O campo 'Escolher Registro (REG)' é de preenchimento obrigatório!");
      return;
    }

    setIsLoading(true); // Liga a tela preta de carregamento
    try {
      // Faz o disparo (POST) dos dados preenchidos para a rota do Python que gera o Preview
      const res = await fetch(`${API_BASE}/api/generate-base`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          procedureId: selectedProc.id, 
          params: formValues, 
          reg: regFilter, 
          xmlFilters: { tipo: xmlType, emitente: xmlEmit },
          userName: user?.name 
        })
      });
      const json = await res.json(); // Pega a resposta do Python
      if (json.success) { 
        setResults(json.data); // Salva as 50 linhas na memória do React
        setView('results'); // Muda a tela para mostrar a tabela
        toast.success("Preview gerado! Clique em Baixar Excel para salvar a base completa.");
      }
      else { toast.error("Erro do servidor: " + json.error); }
    } catch { toast.error("Erro de conexão com o servidor. Verifique se o backend está rodando."); }
    setIsLoading(false); // Desliga a tela de carregamento
  };

  // Função que pega o cliente clicado na pesquisa e preenche o CNPJ e ID automaticamente nos campos
  const selectClient = (c) => {
    setFormValues({ ...formValues, p_cliente: c.id_cliente, p_cnpj: c.cnpj, id_cliente: c.id_cliente });
    setIsConsultOpen(false); // Fecha a janelinha de pesquisa
    toast.success(`Cliente ${c.nome} selecionado!`);
  };

  // Função que dispara quando clica no botão verde "Baixar Excel Completo"
  const exportToExcel = async () => {
    const loadingToast = toast.loading("Extraindo base completa no servidor (Aguarde o processamento)...");
    try {
      // Chama a rota do Python que constrói o Excel no HD do servidor
      const res = await fetch(`${API_BASE}/api/download-excel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          procedureId: selectedProc.id, 
          params: formValues, 
          reg: regFilter, 
          xmlFilters: { tipo: xmlType, emitente: xmlEmit },
          userName: user?.name 
        })
      });

      // Proteção: Verifica se o Python mandou um texto de erro ao invés do Excel. Se for erro, mostra na tela.
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorJson = await res.json();
          throw new Error(errorJson.error || "Erro desconhecido no servidor.");
      }

      if (!res.ok) throw new Error("Erro ao gerar o arquivo no servidor.");

      const blob = await res.blob(); // Transforma o pacote de dados recebido em um Arquivo Físico
      
      // Formata a data de AAAA-MM-DD para DD-MM-AAAA
      const dtI = formValues.p_periodo_i.split('-').reverse().join('-');
      const dtF = formValues.p_periodo_f.split('-').reverse().join('-');
      
      // Lógica de nomenclatura inteligente: Prepara o nome do REG ou os botões do XML
      let extraPart = regFilter ? ` - ${regFilter}` : '';
      if (selectedProc.id === 'base_xml') {
          const tipoTexto = xmlType === 'entrada_saida' ? 'ENTRADA E SAÍDA' : xmlType.toUpperCase();
          const emitTexto = xmlEmit.toUpperCase();
          extraPart = ` - ${tipoTexto} + ${emitTexto}`;
      }
      
      // Monta o nome final bonitão do arquivo Excel
      const fileName = `GET OMEGA - ${selectedProc.title}${extraPart} - ${formValues.p_cnpj || formValues.p_cliente} - ${dtI} A ${dtF}.xlsx`;
      
      saveAs(blob, fileName); // Pede pro Windows salvar o arquivo na pasta de Downloads
      toast.success("Excel gerado e baixado com sucesso!", { id: loadingToast });
    } catch (err) {
      toast.error(err.message, { id: loadingToast });
    }
  };

  // Função que dispara quando o usuário tenta entrar no sistema
  const handleLogin = async (e) => {
    e.preventDefault(); // Impede a página de recarregar (padrão de formulários HTML)
    // Validação básica se preencheu os campos
    if(analistaName.trim() === '' || password.trim() === '') { 
        toast.error("Informe usuário e senha!"); 
        return; 
    }
    
    const loadingToast = toast.loading("Autenticando no banco de dados...");
    
    try {
        // Envia o usuário e senha pro Python validar no SQL Server
        const res = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: analistaName.trim(),
              password: password.trim()
            })
        });
        
        const json = await res.json();
        
        if (json.success) {
            // Se logou, pega os dados, salva na memória RAM (setUser) e no Cofre do Navegador (localStorage)
            const userData = { name: json.user.name, permissao: json.user.permissao };
            setUser(userData); 
            localStorage.setItem('omega_user', JSON.stringify(userData)); 
            
            setView('dashboard'); // Já escolheu o Gerador no hub
            toast.success(`Bem-vindo de volta, ${json.user.name}!`, { id: loadingToast });
        } else {
            toast.error(json.error, { id: loadingToast }); // Errou a senha
        }
    } catch (err) {
        toast.error("Erro ao conectar com o servidor.", { id: loadingToast });
    }
  };

  // ============================================================================
  // RENDERIZAÇÃO VISUAL (O HTML estruturado com CSS do Tailwind)
  // ============================================================================

  const bgPulse = (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-[pulse_6s_ease-in-out_infinite] ${darkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
      <div className={`absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full mix-blend-screen filter blur-[120px] opacity-30 animate-[pulse_8s_ease-in-out_infinite_1s] ${darkMode ? 'bg-pink-900' : 'bg-pink-300'}`}></div>
    </div>
  );

  // HUB PÚBLICO (antes do login) — escolhe o módulo, depois autentica
  if (view === 'hub') return (
    <div className={`min-h-screen flex items-center justify-center p-6 font-mono relative overflow-hidden transition-colors duration-700 ${darkMode ? 'bg-[#0a0c10] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {bgPulse}
      <Toaster position="top-right" toastOptions={{ style: { background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#000', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <div className="relative z-10 w-full max-w-4xl">
        <div className="mb-10 flex flex-col items-center text-center">
          <img src="/omega.png" className="mb-4 w-28 h-28" alt="Logo" />
          <h1 className="text-3xl font-black italic uppercase tracking-tighter">
            GET OMEGA <span className="text-purple-500">2.0</span>
          </h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <button
            type="button"
            onClick={() => {
              setSelectedProc(null);
              setFormValues({});
              setRegFilter('');
              setView(user ? 'dashboard' : 'login');
            }}
            className={`p-10 rounded-[2.5rem] border text-left transition-all duration-300 group relative overflow-hidden backdrop-blur-sm
              ${darkMode
                ? 'bg-slate-900/40 border-white/10 hover:border-purple-500/50 hover:bg-slate-800/60 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)]'
                : 'bg-white/60 border-slate-200 shadow-xl hover:border-purple-400 hover:bg-white/90 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.2)]'
              }`}
          >
            <div className="mb-4 text-purple-500 group-hover:scale-110 transition-transform duration-300">
              <Database size={36} />
            </div>
            <h3 className="text-2xl font-black mb-3 italic tracking-tight font-mono uppercase group-hover:text-purple-500 transition-colors">
              Gerador de bases
            </h3>
            <p className="text-sm opacity-60 italic">
              Bases SPED, XML, blocos e exportações Excel.
            </p>
          </button>

          <button
            type="button"
            onClick={() => setView('ressarcimento')}
            className={`p-10 rounded-[2.5rem] border text-left transition-all duration-300 group relative overflow-hidden backdrop-blur-sm
              ${darkMode
                ? 'bg-slate-900/40 border-white/10 hover:border-cyan-500/50 hover:bg-slate-800/60 hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.15)]'
                : 'bg-white/60 border-slate-200 shadow-xl hover:border-cyan-400 hover:bg-white/90 hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.2)]'
              }`}
          >
            <div className="mb-4 text-cyan-400 group-hover:scale-110 transition-transform duration-300">
              <FileText size={36} />
            </div>
            <h3 className="text-2xl font-black mb-3 italic tracking-tight font-mono uppercase group-hover:text-cyan-400 transition-colors">
              Ressarcimento IPI
            </h3>
            <p className="text-sm opacity-60 italic">
              Fichas R11 / R12 / R13 — exportação TXT.
            </p>
          </button>
        </div>
      </div>
    </div>
  );

  // MÓDULO RESSARCIMENTO (login + fichas) — mesma app, sem outra porta
  if (view === 'ressarcimento') {
    return (
      <RessarcimentoModule
        darkMode={darkMode}
        onBackToHub={() => setView('hub')}
      />
    );
  }

  // LOGIN DO GERADOR (só depois de escolher o módulo)
  if (view === 'login') return (
    <div className={`min-h-screen flex items-center justify-center p-6 font-mono relative overflow-hidden transition-colors duration-700 ${darkMode ? 'bg-[#0a0c10]' : 'bg-slate-50'}`}>
      {bgPulse}
      <Toaster position="top-right" toastOptions={{ style: { background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#000', border: '1px solid rgba(255,255,255,0.1)' } }} />
      
      <div className={`w-full max-w-md p-10 rounded-[3rem] border shadow-2xl relative z-10 backdrop-blur-xl transition-colors duration-500 ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-white/40'}`}>
         <button
           type="button"
           onClick={() => setView('hub')}
           className="mb-6 text-xs uppercase text-purple-500 font-black italic flex items-center gap-2 hover:text-purple-400 font-mono transition-colors"
         >
           <ArrowLeft size={16} /> Voltar ao hub
         </button>
         <div className="flex justify-center mb-8"><img src="/omega.png" className="w-40 h-40" alt="Logo" /></div>
         <p className={`mb-6 text-center text-xs uppercase tracking-wider font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
           Login · Gerador de bases
         </p>
         <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" placeholder="Usuário (Login)" className={inputClass} value={analistaName} onChange={e => setAnalistaName(e.target.value)} required />
            <input type="password" placeholder="Senha" className={inputClass} value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black uppercase shadow-xl hover:scale-[1.02] transition-transform">Entrar</button>
         </form>
      </div>
    </div>
  );

  // Sem sessão no Gerador → tela de login
  if (!user) return (
    <div className={`min-h-screen flex items-center justify-center p-6 font-mono relative overflow-hidden transition-colors duration-700 ${darkMode ? 'bg-[#0a0c10]' : 'bg-slate-50'}`}>
      {bgPulse}
      <Toaster position="top-right" toastOptions={{ style: { background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#000', border: '1px solid rgba(255,255,255,0.1)' } }} />
      <div className={`w-full max-w-md p-10 rounded-[3rem] border shadow-2xl relative z-10 backdrop-blur-xl ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-white/40'}`}>
        <button type="button" onClick={() => setView('hub')} className="mb-6 text-xs uppercase text-purple-500 font-black italic flex items-center gap-2 hover:text-purple-400 font-mono transition-colors">
          <ArrowLeft size={16} /> Voltar ao hub
        </button>
        <p className="mb-4 text-center text-sm opacity-70">Sessão expirada. Faça login no Gerador.</p>
        <form onSubmit={handleLogin} className="space-y-6">
          <input type="text" placeholder="Usuário (Login)" className={inputClass} value={analistaName} onChange={e => setAnalistaName(e.target.value)} required />
          <input type="password" placeholder="Senha" className={inputClass} value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black uppercase shadow-xl hover:scale-[1.02] transition-transform">Entrar</button>
        </form>
      </div>
    </div>
  );

  // SEÇÃO 2: SISTEMA PRINCIPAL (Aparece após o Login do Gerador)
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-700 relative overflow-hidden ${darkMode ? 'bg-[#0a0c10] text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Luzes de fundo do sistema */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         <div className={`absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-[pulse_8s_ease-in-out_infinite] ${darkMode ? 'bg-purple-900' : 'bg-purple-300'}`}></div>
         <div className={`absolute top-[20%] right-[-10%] w-[50vw] h-[50vw] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-[pulse_10s_ease-in-out_infinite_2s] ${darkMode ? 'bg-pink-900' : 'bg-pink-300'}`}></div>
         <div className={`absolute bottom-[-20%] left-[20%] w-[55vw] h-[55vw] rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-[pulse_12s_ease-in-out_infinite_4s] ${darkMode ? 'bg-indigo-900' : 'bg-indigo-300'}`}></div>
      </div>

      <Toaster position="top-right" toastOptions={{ style: { background: darkMode ? '#1e293b' : '#fff', color: darkMode ? '#fff' : '#000', border: '1px solid rgba(255,255,255,0.1)' } }} />
      
      {/* CABEÇALHO SUPERIOR (Header) com Logo, Tema e Logout */}
      <header className="px-8 py-4 border-b border-white/10 flex justify-between items-center backdrop-blur-2xl bg-white/5 sticky top-0 z-[100]">
        {/* Clique no Logo: Volta pro Dashboard e LIMPA OS CAMPOS (Poka-Yoke) */}
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setView('hub'); setSelectedProc(null); setFormValues({}); setRegFilter(''); }}>
          <div className="p-1.5 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg shadow-purple-500/20"><img src="/omega.png" className="w-10 h-10" alt="Logo" /></div>
          <h2 className="text-sm font-black italic uppercase font-mono tracking-tighter">GET OMEGA <span className="text-purple-500">2.0</span></h2>
        </div>
        <div className="flex items-center gap-4">
           {/* Mostra o nome do Analista logado */}
           <div className="text-right hidden sm:block"><div className="text-[10px] font-black uppercase text-purple-500">Analista</div><div className="text-xs font-bold italic">{user?.name}</div></div>
           {/* Botão de Tema Claro/Escuro */}
           <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-xl transition-all ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>{darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}</button>
           {/* Botão de Sair: Destrói a sessão no cofre do navegador e volta pra tela de login */}
           <button onClick={() => {localStorage.removeItem('omega_user');setUser(null);setView('hub'); toast('Sessão encerrada.', { icon: '👋' }); }} className="p-3 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
        </div>
      </header>

      {/* POP-UP DE PESQUISAR EMPRESA (Só aparece se isConsultOpen for true) */}
      {isConsultOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
          <div className={`w-full max-w-2xl rounded-[2.5rem] border p-8 shadow-2xl animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/95 border-white/40'}`}>
             <h2 className="text-xl font-bold uppercase mb-6 font-mono text-purple-500 italic">Pesquisar Empresa</h2>
             <input type="text" placeholder="Nome ou CNPJ..." className={inputClass} value={clientSearch} onChange={e => setClientSearch(e.target.value)} autoFocus />
             {/* Lista rolável gerada a partir da busca no banco de dados */}
             <div className="mt-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                {dbClients.map(c => <button key={c.id_cliente} onClick={() => selectClient(c)} className={`w-full p-4 rounded-xl text-left font-bold border transition-all font-mono hover:scale-[1.01] ${darkMode ? 'border-white/5 hover:border-purple-500/50 hover:bg-purple-500/10' : 'border-slate-200 hover:border-purple-400 hover:bg-purple-50'}`}><div>{c.nome}</div><div className="text-[10px] opacity-50 uppercase mt-1">ID: {c.id_cliente} | CNPJ: {c.cnpj}</div></button>)}
             </div>
             <button onClick={() => setIsConsultOpen(false)} className="mt-6 text-xs font-bold uppercase opacity-40 hover:opacity-100 transition-opacity">Fechar</button>
          </div>
        </div>
      )}

      {/* ÁREA CENTRAL DO SISTEMA */}
      <main className="p-8 max-w-7xl mx-auto w-full flex-1 relative z-10">

        {/* TELA DE DASHBOARD: Desenha os Módulos */}
        {view === 'dashboard' ? (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6">
              <button
                type="button"
                onClick={() => setView('hub')}
                className="text-xs uppercase text-purple-500 font-black italic flex items-center gap-2 hover:text-purple-400 font-mono transition-colors"
              >
                <ArrowLeft size={16} /> Voltar ao hub
              </button>
            </div>
            <h1 className={`text-4xl font-black mb-10 italic uppercase font-mono tracking-tighter ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Selecione a base que deseja gerar:</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {/* Regra de Nível de Acesso: Filtra o card 'credito_gerado'. Ele só aparece se a permissão for 'alta' */}
               {PROCEDURES_CONFIG.filter(p => p.id !== 'credito_gerado' || user?.permissao === 'alta').map(p => (
                  <button key={p.id} onClick={() => { setSelectedProc(p); setView('params'); setRegFilter(''); }} 
                    // Formatação do Card: Borda arredondada grossa, sombra com efeito neon roxo ao passar o mouse
                    className={`p-8 rounded-[2.5rem] border text-left transition-all duration-300 group relative overflow-hidden backdrop-blur-sm 
                    ${darkMode 
                        ? 'bg-slate-900/40 border-white/10 hover:border-purple-500/50 hover:bg-slate-800/60 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.15)]' 
                        : 'bg-white/60 border-slate-200 shadow-xl hover:border-purple-400 hover:bg-white/90 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.2)]'
                    }`}>
                     <div className="mb-4 text-purple-500 group-hover:scale-110 transition-transform duration-300">{p.icon}</div>
                     <h3 className="text-xl font-black mb-3 italic tracking-tight font-mono uppercase group-hover:text-purple-500 transition-colors">{p.title}</h3>
                     <p className="text-sm opacity-60 italic">{p.description}</p>
                  </button>
               ))}
            </div>
          </div>

        /* TELA DE PARÂMETROS: Onde o usuário preenche CNPJ e Datas */
        ) : view === 'params' ? (
          <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-300">
             <div className={`p-10 rounded-[3.5rem] border shadow-2xl backdrop-blur-xl ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-white/40'}`}>
                {/* Título do Card e Botão de Pesquisar Empresa */}
                <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-6">
                   <h2 className="text-2xl font-black uppercase italic font-mono text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">{selectedProc.title}</h2>
                   <button onClick={() => setIsConsultOpen(true)} className="px-5 py-3 bg-purple-600/90 hover:bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 font-mono shadow-lg hover:shadow-purple-500/25 transition-all"><Search size={14}/> Pesquisar Empresa</button>
                </div>
                
                {/* Desenha os campos dinamicamente baseado na configuração do módulo */}
                <div className="grid grid-cols-2 gap-8 mb-10">
                   {selectedProc.params.map(p => (
                      <div key={p.name} className="flex flex-col gap-2">
                         <label className="text-[10px] uppercase opacity-50 ml-2 font-black italic tracking-wider">{p.label}</label>
                         <input type={p.type || 'text'} className={inputClass} value={formValues[p.name] || ''} onChange={e => setFormValues({...formValues, [p.name]: e.target.value})} />
                      </div>
                   ))}
                   
                   {/* Se for o módulo Base XML, desenha os Radio Buttons */}
                   {selectedProc.isSpecial && (
                      <div className={`col-span-2 flex flex-col gap-6 p-6 border rounded-2xl backdrop-blur-sm ${darkMode ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50/50'}`}>
                         {/* Radio Buttons: Entrada/Saída */}
                         <div className={`space-y-3 transition-all ${xmlEmit === 'terceiros' ? 'opacity-30 pointer-events-none' : ''}`}>
                            <label className="text-[10px] font-black uppercase opacity-60 italic tracking-widest text-purple-500">TIPO DA NOTA</label>
                            <div className="flex flex-col gap-3 ml-2">
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-bold uppercase tracking-tight hover:text-purple-500 transition-colors"><input type="radio" checked={xmlType === 'entrada'} onChange={() => setXmlType('entrada')} className="w-4 h-4 accent-purple-500" /> ENTRADA</label>
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-bold uppercase tracking-tight hover:text-purple-500 transition-colors"><input type="radio" checked={xmlType === 'saida'} onChange={() => setXmlType('saida')} className="w-4 h-4 accent-purple-500" /> SAÍDA</label>
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-bold uppercase tracking-tight hover:text-purple-500 transition-colors"><input type="radio" checked={xmlType === 'entrada_saida'} onChange={() => setXmlType('entrada_saida')} className="w-4 h-4 accent-purple-500" /> ENTRADA E SAÍDA</label>
                            </div>
                         </div>
                         {/* Radio Buttons: Próprios/Terceiros */}
                         <div className={`space-y-3 pt-4 border-t ${darkMode ? 'border-white/10' : 'border-slate-200'}`}>
                            <label className="text-[10px] font-black uppercase opacity-60 italic tracking-widest text-purple-500">EMITENTE</label>
                            <div className="flex flex-col gap-3 ml-2">
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-bold uppercase tracking-tight hover:text-purple-500 transition-colors"><input type="radio" checked={xmlEmit === 'proprios'} onChange={() => setXmlEmit('proprios')} className="w-4 h-4 accent-purple-500" /> PRÓPRIOS</label>
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-bold uppercase tracking-tight hover:text-purple-500 transition-colors"><input type="radio" checked={xmlEmit === 'terceiros'} onChange={() => setXmlEmit('terceiros')} className="w-4 h-4 accent-purple-500" /> TERCEIROS</label>
                            </div>
                         </div>
                      </div>
                   )}

                   {/* Se o módulo exige escolha de REG, desenha a lista suspensa (Select) */}
                   {selectedProc.multiSelect && (
                      <div className="col-span-2 flex flex-col gap-2">
                         <label className="text-[10px] uppercase opacity-50 ml-2 font-black italic text-purple-500 tracking-wider">Escolher Registro (REG)</label>
                         <select className={inputClass + ' appearance-none'} value={regFilter} onChange={e => setRegFilter(e.target.value)}>
                            <option value="" className={darkMode ? 'bg-slate-900' : 'bg-white'}>Selecione um registro...</option>
                            {REG_OPTIONS[selectedProc.id]?.map(opt => <option key={opt} value={opt} className={darkMode ? 'bg-slate-900' : 'bg-white'}>{opt}</option>)}
                         </select>
                      </div>
                   )}
                </div>

                {/* Botões do Rodapé: Voltar e Gerar Base */}
                <div className="flex gap-4">
                  {/* Botão de Voltar: Poka-Yoke aplicado limpando os formulários e a tela atual */}
                  <button onClick={() => { setView('dashboard'); setSelectedProc(null); setFormValues({}); setRegFilter(''); }} className={`flex-1 py-5 border rounded-2xl font-black uppercase text-xs hover:opacity-100 font-mono transition-all ${darkMode ? 'border-white/10 hover:bg-white/5' : 'border-slate-300 hover:bg-slate-100'}`}>Voltar</button>
                  {/* Botão Gerar Base: Destacado com gradiente e maior peso (flex-[2]) na tela */}
                  <button onClick={handleGenerate} className="flex-[2] py-5 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40 hover:scale-[1.02] transition-all font-mono">Gerar base</button>
                </div>
             </div>
          </div>

        /* TELA DE RESULTADOS: Mostra a tabela e o botão verde de Download */
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
             <div className="flex justify-between items-center bg-transparent">
                <button onClick={() => setView('params')} className="text-xs uppercase text-purple-500 font-black italic flex items-center gap-2 hover:text-purple-400 font-mono transition-colors"><ArrowLeft size={18}/> Filtros</button>
                {/* Botão de Download: Formatação em verde, ícone de planilha, cantos arredondados, efeito de clique (active:scale-95) */}
                <button onClick={exportToExcel} className="px-10 py-5 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-2xl shadow-xl shadow-green-500/20 uppercase text-xs font-black italic flex items-center gap-3 font-mono transition-all hover:scale-105 active:scale-95"><FileSpreadsheet size={20}/> Baixar Excel Completo</button>
             </div>
             
             {/* Se for o Bloco M, mostra apenas uma mensagem de sucesso, sem desenhar tabela */}
             {selectedProc.noPreview ? (
                <div className={`py-20 rounded-[3.5rem] border text-center backdrop-blur-md shadow-2xl ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-slate-200'}`}>
                   <CheckCircle2 size={50} className="text-green-500 mx-auto mb-6 animate-bounce" />
                   <h2 className="text-3xl font-black italic uppercase mb-2 font-mono text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">Pronto para Download!</h2>
                   <p className="opacity-60 uppercase text-xs font-black tracking-widest italic font-mono">Clique no botão verde acima para exportar.</p>
                </div>
             ) : 
             /* Caso contrário, cria um "Card" para cada tabela que o Python mandou e desenha o Preview */
             results.map((t, i) => (
                <div key={i} className={`p-8 rounded-[2.5rem] border shadow-2xl backdrop-blur-md ${darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-slate-200'}`}>
                   <h3 className="text-xl font-black italic text-purple-500 mb-6 uppercase border-l-4 border-purple-500 pl-4 font-mono">{t.name} (Preview 50 linhas)</h3>
                   <div className="overflow-x-auto custom-scrollbar rounded-xl border border-white/5">
                      <table className="w-full text-left text-[10px] border-collapse font-mono italic">
                         <thead className={darkMode ? 'bg-slate-800/80 text-purple-300' : 'bg-purple-100 text-purple-700'}>
                            {/* Desenha o cabeçalho dinamicamente baseado nas colunas do banco */}
                            <tr>{Object.keys(t.preview[0] || {}).map(k => <th key={k} className="p-4 whitespace-nowrap uppercase tracking-wider">{k}</th>)}</tr>
                         </thead>
                         <tbody className={`divide-y ${darkMode ? 'divide-white/5 text-slate-300' : 'divide-slate-200 text-slate-600'}`}>
                            {/* Desenha as 50 linhas de dados dinamicamente */}
                            {t.preview.map((r, ri) => <tr key={ri} className={darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}>{Object.values(r).map((v, vi) => <td key={vi} className="p-4 whitespace-nowrap">{v === null ? '-' : v.toString()}</td>)}</tr>)}
                         </tbody>
                      </table>
                   </div>
                </div>
             ))}
          </div>
        )}
      </main>

      {/* OVERLAY DE CARREGAMENTO: Cobre a tela inteira com um fundo preto transparente e a engrenagem rodando */}
      {isLoading && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center backdrop-blur-lg bg-[#0a0c10]/80 text-white font-mono transition-all duration-300">
          <div className="relative flex justify-center items-center w-28 h-28 mb-8">
            <div className="absolute inset-0 border-4 border-purple-500/20 rounded-full shadow-[0_0_50px_-10px_rgba(168,85,247,0.5)]"></div>
            <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            <img src="/omega.png" className="w-12 h-12 animate-pulse object-contain" alt="Logo" />
          </div>
          <h2 className="text-3xl font-black italic uppercase font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse">Gerando base...</h2>
        </div>
      )}
    </div>
  );
}