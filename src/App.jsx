import React, { useState, useEffect } from 'react';
import { Search, LogOut, ChevronRight, FileSpreadsheet, ArrowLeft, Moon, Sun, Database, Layers, TableProperties, Box, ClipboardList, CheckCircle2, FileCode } from 'lucide-react';
import * as XLSX from 'xlsx';

const PROCEDURES_CONFIG = [
  { id: 'efd_fiscal', title: 'EFD FISCAL', icon: <ClipboardList size={28}/>, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_cnpj', label:'CNPJ'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'efd_contribuicoes', title: 'EFD CONTRIBUIÇÕES', icon: <Layers size={28}/>, multiSelect: true, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_cnpj', label:'CNPJ'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'efd_bloco_m', title: 'EFD BLOCO M', icon: <TableProperties size={28}/>, noPreview: true, params: [{name:'p_cnpj', label:'CNPJ'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'bloco_d', title: 'BLOCO D', icon: <Box size={28}/>, multiSelect: true, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'bloco_1000', title: 'BLOCO 1000', icon: <Database size={28}/>, multiSelect: true, params: [{name:'p_cnpj', label:'CNPJ'}, {name:'p_cliente', label:'ID Cliente'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] },
  { id: 'base_xml', title: 'BASE XML', icon: <FileCode size={28}/>, isSpecial: true, params: [{name:'p_cliente', label:'ID Cliente'}, {name:'p_periodo_i', label:'Início', type:'date'}, {name:'p_periodo_f', label:'Fim', type:'date'}] }
];

const REG_OPTIONS = {
  efd_contribuicoes: ["A100", "C170", "C175", "C500", "D100", "D500", "F100", "F500", "F525", "F550", "F600", "F700"],
  bloco_d: ["D200", "D201", "D205"],
  bloco_1000: ["1100", "1500", "1300", "1700"]
};

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
  const [regFilter, setRegFilter] = useState('');
  
  // States do BASE XML
  const [xmlType, setXmlType] = useState('entrada_saida');
  const [xmlEmit, setXmlEmit] = useState('proprios');
  
  const [analistaName, setAnalistaName] = useState('');

  useEffect(() => {
    if (clientSearch.length > 2) {
      fetch(`http://localhost:3001/api/clientes?search=${clientSearch}`).then(r => r.json()).then(d => setDbClients(d));
    }
  }, [clientSearch]);

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/generate-base', {
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
      const json = await res.json();
      if (json.success) { setResults(json.data); setView('results'); }
      else alert(json.error);
    } catch { alert("Erro de conexão."); }
    setIsLoading(false);
  };

  const selectClient = (c) => {
    setFormValues({ ...formValues, p_cliente: c.id_cliente, p_cnpj: c.cnpj, id_cliente: c.id_cliente });
    setIsConsultOpen(false);
  };

  if (view === 'login') return (
    <div className={`min-h-screen flex items-center justify-center p-6 font-mono ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
      <div className={`w-full max-w-md p-10 rounded-[3rem] border shadow-2xl ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white'}`}>
         <div className="flex justify-center mb-8"><img src="/omega.png" className="w-20 h-20" alt="Logo" /></div>
         <h1 className="text-3xl font-black mb-8 italic text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-500 text-center uppercase">GET OMEGA 2.0</h1>
         <form onSubmit={e => { e.preventDefault(); setUser({name: analistaName}); setView('dashboard'); }} className="space-y-6">
            <input type="text" placeholder="Nome do Analista" className="w-full py-4 px-6 rounded-2xl bg-slate-800 border border-white/10 outline-none font-bold text-white" value={analistaName} onChange={e => setAnalistaName(e.target.value)} required />
            <input type="password" placeholder="Senha" className="w-full py-4 px-6 rounded-2xl bg-slate-800 border border-white/10 outline-none font-bold text-white" required />
            <button className="w-full py-5 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black uppercase">Entrar</button>
         </form>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className="px-8 py-4 border-b border-white/5 flex justify-between items-center backdrop-blur-xl sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="p-1.5 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg"><img src="/omega.png" className="w-10 h-10" alt="Logo" /></div>
          <h2 className="text-sm font-black italic uppercase font-mono tracking-tighter">GET OMEGA <span className="text-purple-500">2.0</span></h2>
        </div>
        <div className="flex items-center gap-4">
           <div className="text-right"><div className="text-[10px] font-black uppercase text-purple-500">Analista</div><div className="text-xs font-bold italic">{user?.name}</div></div>
           <button onClick={() => setDarkMode(!darkMode)} className="p-2.5 rounded-xl hover:bg-white/10 transition-all">{darkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} />}</button>
           <button onClick={() => setView('login')} className="p-3 hover:text-red-500"><LogOut size={20}/></button>
        </div>
      </header>

      {isConsultOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
          <div className={`w-full max-w-2xl rounded-[2.5rem] border p-8 shadow-2xl ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white'}`}>
             <h2 className="text-xl font-bold uppercase italic mb-6 text-purple-400">Pesquisar Empresa</h2>
             <input type="text" placeholder="Nome ou CNPJ..." className="w-full py-4 px-6 rounded-2xl bg-slate-800 border border-white/10 font-bold outline-none text-white" value={clientSearch} onChange={e => setClientSearch(e.target.value)} autoFocus />
             <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {dbClients.map(c => <button key={c.id_cliente} onClick={() => selectClient(c)} className="w-full p-4 rounded-xl text-left border border-white/10 hover:bg-purple-600/20 transition-all font-mono"><div>{c.nome}</div><div className="text-[10px] opacity-40 uppercase">ID: {c.id_cliente} | CNPJ: {c.cnpj}</div></button>)}
             </div>
             <button onClick={() => setIsConsultOpen(false)} className="mt-6 text-xs uppercase opacity-40">Fechar</button>
          </div>
        </div>
      )}

      <main className="p-8 max-w-7xl mx-auto w-full">
        {view === 'dashboard' ? (
          <div>
            <h1 className="text-4xl font-black mb-10 italic text-slate-500 uppercase font-mono tracking-tighter">Módulos de Extração</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {PROCEDURES_CONFIG.map(p => (
                  <button key={p.id} onClick={() => { setSelectedProc(p); setView('params'); setRegFilter(''); }} className={`p-8 rounded-[2.5rem] border text-left hover:scale-[1.02] transition-all group ${darkMode ? 'bg-slate-900/50 border-white/10' : 'bg-white shadow-lg'}`}>
                     <div className="mb-4 text-purple-500">{p.icon}</div>
                     <h3 className="text-xl font-black mb-3 italic tracking-tight font-mono uppercase">{p.title}</h3>
                     <p className="text-sm opacity-60 italic">{p.description}</p>
                  </button>
               ))}
            </div>
          </div>
        ) : view === 'params' ? (
          <div className="max-w-3xl mx-auto">
             <div className={`p-10 rounded-[3.5rem] border shadow-2xl ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white'}`}>
                <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-6">
                   <h2 className="text-2xl font-black uppercase italic text-purple-500 font-mono">{selectedProc.title}</h2>
                   <button onClick={() => setIsConsultOpen(true)} className="px-5 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 font-mono"><Search size={14}/> Pesquisar Empresa</button>
                </div>
                <div className="grid grid-cols-2 gap-6 mb-8">
                   {selectedProc.params.map(p => (
                      <div key={p.name} className="flex flex-col gap-2">
                         <label className="text-[10px] uppercase opacity-40 ml-2 font-black italic">{p.label}</label>
                         <input type={p.type || 'text'} className="p-4 rounded-xl bg-slate-800 border border-white/10 outline-none font-bold text-white" value={formValues[p.name] || ''} onChange={e => setFormValues({...formValues, [p.name]: e.target.value})} />
                      </div>
                   ))}

                   {/* INSERÇÃO DO FORMULARIO XML CONFORME IMAGEM */}
                   {selectedProc.isSpecial && (
                      <div className="col-span-2 flex flex-col gap-6">
                         <fieldset className={`border border-white/40 p-5 rounded-lg relative ${xmlEmit === 'terceiros' ? 'opacity-30 pointer-events-none' : ''}`}>
                            <legend className="text-[11px] font-mono tracking-widest px-2 text-white/80">TIPO</legend>
                            <div className="flex flex-col gap-3 ml-2">
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-mono tracking-tight text-white">
                                  <input type="radio" name="xmlType" value="entrada" checked={xmlType === 'entrada'} onChange={() => setXmlType('entrada')} className="w-4 h-4 cursor-pointer accent-white" />
                                  ENTRADA
                               </label>
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-mono tracking-tight text-white">
                                  <input type="radio" name="xmlType" value="saida" checked={xmlType === 'saida'} onChange={() => setXmlType('saida')} className="w-4 h-4 cursor-pointer accent-white" />
                                  SAÍDA
                               </label>
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-mono tracking-tight text-white">
                                  <input type="radio" name="xmlType" value="entrada_saida" checked={xmlType === 'entrada_saida'} onChange={() => setXmlType('entrada_saida')} className="w-4 h-4 cursor-pointer accent-white" />
                                  ENTRADA E SAÍDA
                               </label>
                            </div>
                         </fieldset>
                         
                         <fieldset className="border border-white/40 p-5 rounded-lg relative">
                            <legend className="text-[11px] font-mono tracking-widest px-2 text-white/80">EMITENTE</legend>
                            <div className="flex flex-col gap-3 ml-2">
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-mono tracking-tight text-white">
                                  <input type="radio" name="xmlEmit" value="proprios" checked={xmlEmit === 'proprios'} onChange={() => setXmlEmit('proprios')} className="w-4 h-4 cursor-pointer accent-white" />
                                  PRÓPRIOS
                               </label>
                               <label className="flex items-center gap-3 cursor-pointer text-xs font-mono tracking-tight text-white">
                                  <input type="radio" name="xmlEmit" value="terceiros" checked={xmlEmit === 'terceiros'} onChange={() => setXmlEmit('terceiros')} className="w-4 h-4 cursor-pointer accent-white" />
                                  TERCEIROS
                               </label>
                            </div>
                         </fieldset>
                      </div>
                   )}

                   {selectedProc.multiSelect && (
                      <div className="col-span-2 flex flex-col gap-2">
                         <label className="text-[10px] uppercase opacity-40 ml-2 font-black italic text-purple-400">Escolher Registro (REG)</label>
                         <select className="p-4 rounded-xl bg-slate-800 border border-white/10 outline-none font-bold text-white appearance-none" value={regFilter} onChange={e => setRegFilter(e.target.value)}>
                            <option value="">Selecione um registro...</option>
                            {REG_OPTIONS[selectedProc.id]?.map(opt => <option key={opt} value={opt} className="bg-slate-900">{opt}</option>)}
                         </select>
                      </div>
                   )}
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setView('dashboard')} className="flex-1 py-5 border border-white/10 rounded-2xl font-black uppercase text-xs opacity-50 hover:opacity-100 transition-all font-mono">Voltar</button>
                  <button onClick={handleGenerate} className="flex-[2] py-5 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-black uppercase tracking-widest shadow-xl font-mono">Gerar Base</button>
                </div>
             </div>
          </div>
        ) : (
          <div className="space-y-8">
             <div className="flex justify-between items-center">
                <button onClick={() => setView('params')} className="text-xs uppercase text-purple-500 font-black italic flex items-center gap-2 hover:opacity-50 font-mono"><ArrowLeft size={18}/> Filtros</button>
                <button onClick={() => {
                   const wb = XLSX.utils.book_new();
                   results.forEach((t, i) => {
                       // O único tratamento feito foi aqui para impedir que o Excel trave com nomes repetidos (problema relatado no Fiscal)
                       let sheetName = t.name ? t.name.substring(0, 31) : `Aba_${i + 1}`;
                       if (wb.SheetNames.includes(sheetName)) {
                           sheetName = `${sheetName}_${i + 1}`.substring(0, 31);
                       }
                       XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(t.full), sheetName);
                   });
                   XLSX.writeFile(wb, `GET OMEGA - ${formValues.p_cnpj} - ${selectedProc.title}.xlsx`);
                }} className="px-10 py-5 bg-green-600 text-white rounded-2xl shadow-xl uppercase text-xs font-black italic flex items-center gap-3 font-mono transition-all active:scale-95"><FileSpreadsheet size={20}/> Baixar Excel</button>
             </div>
             {selectedProc.noPreview ? (
                <div className={`py-20 rounded-[3.5rem] border text-center ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white'}`}>
                   <CheckCircle2 size={40} className="text-green-500 mx-auto mb-6" />
                   <h2 className="text-3xl font-black italic uppercase text-white mb-2 font-mono">Processamento Concluído!</h2>
                   <p className="text-slate-500 uppercase text-[10px] font-black tracking-widest italic font-mono">O arquivo está pronto para extração.</p>
                </div>
             ) : results.map((t, i) => (
                <div key={i} className={`p-8 rounded-[2.5rem] border shadow-2xl ${darkMode ? 'bg-slate-900 border-white/10' : 'bg-white'}`}>
                   <h3 className="text-xl font-black italic text-purple-500 mb-6 uppercase border-l-4 border-purple-500 pl-4 font-mono">{t.name}</h3>
                   <div className="overflow-x-auto custom-scrollbar"><table className="w-full text-left text-[10px] border-collapse font-mono italic opacity-80"><thead><tr className="opacity-40 uppercase border-b">{Object.keys(t.preview[0] || {}).map(k => <th key={k} className="p-4 whitespace-nowrap">{k}</th>)}</tr></thead><tbody className="divide-y">{t.preview.map((r, ri) => <tr key={ri}>{Object.values(r).map((v, vi) => <td key={vi} className="p-4 whitespace-nowrap">{v === null ? '-' : v.toString()}</td>)}</tr>)}</tbody></table></div>
                </div>
             ))}
          </div>
        )}
      </main>

      {isLoading && (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] flex flex-col items-center justify-center text-white backdrop-blur-md font-mono">
          <div className="relative mb-10">
            <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-6" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black italic text-lg uppercase font-mono">Ω</div>
          </div>
          <h2 className="text-3xl font-black italic uppercase font-mono tracking-tighter">Carregando Base...</h2>
        </div>
      )}
    </div>
  );
}