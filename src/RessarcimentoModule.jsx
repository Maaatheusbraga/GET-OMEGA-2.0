import React, { useEffect, useState } from 'react';
import { ArrowLeft, Download, FileText, LogOut, Search, Sparkles } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_URL || '';
const STORAGE_KEY = 'omega_ressarc_user';

function loadSavedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.name) return data;
  } catch { /* ignore */ }
  return null;
}

/**
 * Módulo Ressarcimento IPI (R11/R12/R13) — interno ao GET OMEGA.
 * Login próprio; "Voltar ao hub" volta sem depender de outra porta.
 */
export default function RessarcimentoModule({ darkMode = true, onBackToHub }) {
  const savedUser = loadSavedUser();
  const [view, setView] = useState(savedUser ? 'params' : 'login');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState(savedUser);
  const [loginLoading, setLoginLoading] = useState(false);

  const [clientSearch, setClientSearch] = useState('');
  const [dbClients, setDbClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [isConsultOpen, setIsConsultOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [periodoI, setPeriodoI] = useState('2026-04-01');
  const [periodoF, setPeriodoF] = useState('2026-06-30');
  const [processing, setProcessing] = useState(false);
  const [exports, setExports] = useState([]);
  const [processId, setProcessId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [batchDownloading, setBatchDownloading] = useState(false);

  const inputClass = `w-full p-4 rounded-xl border outline-none font-bold transition-all backdrop-blur-md ${
    darkMode
      ? 'bg-slate-800/60 border-white/10 text-white focus:border-cyan-500 focus:bg-slate-800/90'
      : 'bg-white/60 border-slate-300 text-slate-900 focus:border-cyan-500 focus:bg-white shadow-sm'
  }`;

  const toastOpts = {
    style: {
      background: darkMode ? '#1e293b' : '#fff',
      color: darkMode ? '#fff' : '#000',
      border: '1px solid rgba(255,255,255,0.1)',
    },
  };

  useEffect(() => {
    if (!isConsultOpen) return;
    if (clientSearch.trim().length < 2) {
      setDbClients([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setClientsLoading(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/clientes?search=${encodeURIComponent(clientSearch.trim())}`,
        );
        if (!res.ok) throw new Error('Falha na busca');
        const data = await res.json();
        setDbClients(data);
      } catch {
        toast.error('Erro ao buscar clientes');
        setDbClients([]);
      } finally {
        setClientsLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [clientSearch, isConsultOpen]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !password.trim()) {
      toast.error('Informe usuário e senha');
      return;
    }
    setLoginLoading(true);
    const loadingToast = toast.loading('Validando…');
    try {
      const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userName, password }),
      });
      const json = await res.json();
      if (json.success && json.user) {
        const nextUser = { name: json.user.name, permissao: json.user.permissao };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
        setUser(nextUser);
        setPassword('');
        setView('params');
        toast.success(`Bem-vindo, ${nextUser.name}`, { id: loadingToast });
      } else {
        toast.error(json.error || 'Usuário ou senha incorretos.', { id: loadingToast });
      }
    } catch {
      toast.error('Não foi possível conectar à API.', { id: loadingToast });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleProcess = async () => {
    if (!selectedClient) {
      toast.error('Selecione um cliente');
      return;
    }
    if (!periodoI || !periodoF) {
      toast.error('Informe o período');
      return;
    }
    setProcessing(true);
    toast.loading('Processando R11/R12/R13… isso pode demorar', { id: 'proc' });
    try {
      const res = await fetch(`${API_BASE}/api/processar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cliente: selectedClient.id_cliente,
          nome_cliente: selectedClient.nome,
          periodo_i: periodoI,
          periodo_f: periodoF,
          usuario: user?.name || 'Analista',
        }),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || 'Falha no processamento', { id: 'proc' });
        return;
      }
      setProcessId(json.processId);
      const nextFiles = json.files || [];
      setExports(nextFiles);
      setSelectedIds(nextFiles.map((f) => f.id));
      setView('results');
      if (nextFiles.length === 0) {
        toast.success(json.message || 'Sem linhas R11/R12/R13 no período', { id: 'proc' });
      } else {
        toast.success(`${nextFiles.length} arquivo(s) prontos (R11/R12/R13)`, { id: 'proc' });
        if (json.message) toast.error(json.message, { id: 'proc-warn' });
      }
    } catch {
      toast.error('Erro ao processar.', { id: 'proc' });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async (item, silent = false) => {
    if (!processId) {
      if (!silent) toast.error('Processe novamente antes de baixar');
      throw new Error('Processe novamente antes de baixar');
    }
    const loadingToast = silent ? null : toast.loading(`Baixando ${item.fileName}…`);
    try {
      const res = await fetch(
        `${API_BASE}/api/download/${encodeURIComponent(processId)}/${encodeURIComponent(item.id)}`,
      );
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Falha no download');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      if (loadingToast) toast.success('Download concluído', { id: loadingToast });
    } catch (err) {
      if (loadingToast) {
        toast.error(err instanceof Error ? err.message : 'Erro no download', { id: loadingToast });
      }
      throw err;
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const allSelected = exports.length > 0 && selectedIds.length === exports.length;

  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(exports.map((f) => f.id));
  };

  const handleDownloadSelected = async () => {
    const items = exports.filter((f) => selectedIds.includes(f.id));
    if (items.length === 0) {
      toast.error('Selecione ao menos um arquivo');
      return;
    }
    setBatchDownloading(true);
    const loadingToast = toast.loading(`Baixando ${items.length} arquivo(s)…`);
    let ok = 0;
    try {
      for (const item of items) {
        await handleDownload(item, true);
        ok += 1;
        await new Promise((r) => window.setTimeout(r, 250));
      }
      toast.success(`${ok} arquivo(s) baixados`, { id: loadingToast });
    } catch (err) {
      toast.error(
        ok > 0
          ? `${ok} baixado(s); falhou em seguida: ${err instanceof Error ? err.message : 'erro'}`
          : err instanceof Error
            ? err.message
            : 'Erro no download',
        { id: loadingToast },
      );
    } finally {
      setBatchDownloading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setSelectedClient(null);
    setExports([]);
    setSelectedIds([]);
    setProcessId(null);
    setDbClients([]);
    setClientSearch('');
    setView('login');
    toast('Sessão encerrada');
  };

  const shell = `min-h-screen font-mono relative overflow-hidden transition-colors duration-700 ${
    darkMode ? 'bg-[#0a0c10] text-white' : 'bg-slate-50 text-slate-900'
  }`;

  if (view === 'login') {
    return (
      <div className={`${shell} flex items-center justify-center p-6`}>
        <Toaster position="top-right" toastOptions={toastOpts} />
        <div
          className={`w-full max-w-md p-10 rounded-[3rem] border shadow-2xl relative z-10 backdrop-blur-xl ${
            darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-white/40'
          }`}
        >
          <button
            type="button"
            onClick={onBackToHub}
            className="mb-6 text-xs uppercase text-cyan-400 font-black italic flex items-center gap-2 hover:text-cyan-300 font-mono transition-colors"
          >
            <ArrowLeft size={16} /> Voltar ao hub
          </button>
          <div className="flex justify-center mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
              <FileText size={32} className="text-white" />
            </div>
          </div>
          <p className={`mb-6 text-center text-xs uppercase tracking-wider font-bold ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Login · Ressarcimento IPI
          </p>
          <form onSubmit={handleLogin} className="space-y-6">
            <input
              type="text"
              placeholder="Usuário (Login)"
              className={inputClass}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Senha"
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-black uppercase shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-60"
            >
              {loginLoading ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`${shell} flex flex-col`}>
      <Toaster position="top-right" toastOptions={toastOpts} />
      <header className="px-8 py-4 border-b border-white/10 flex justify-between items-center backdrop-blur-2xl bg-white/5 sticky top-0 z-[100]">
        <div className="flex items-center gap-4">
          <div className="p-1.5 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
            <FileText className="w-8 h-8 text-white p-1" />
          </div>
          <div>
            <h2 className="text-sm font-black italic uppercase font-mono tracking-tighter">
              Ressarcimento <span className="text-cyan-400">IPI</span>
            </h2>
            <div className="text-[10px] uppercase tracking-wider opacity-50">PER/DCOMP · R11 R12 R13</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] font-black uppercase text-cyan-400">Analista</div>
            <div className="text-xs font-bold italic">{user?.name}</div>
          </div>
          <button type="button" onClick={logout} className="p-3 hover:text-red-500 transition-colors" aria-label="Sair">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {isConsultOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-slate-950/60 backdrop-blur-md">
          <div
            className={`w-full max-w-2xl rounded-[2.5rem] border p-8 shadow-2xl ${
              darkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/95 border-white/40'
            }`}
          >
            <h2 className="text-xl font-bold uppercase mb-6 font-mono text-cyan-400 italic">Pesquisar Empresa</h2>
            <input
              type="text"
              placeholder="Nome da empresa..."
              className={inputClass}
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              autoFocus
            />
            <div className="mt-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
              {clientsLoading && <p className="px-2 py-4 text-xs opacity-50">Buscando…</p>}
              {!clientsLoading && clientSearch.trim().length < 2 && (
                <p className="px-2 py-4 text-xs opacity-50">Digite ao menos 2 caracteres</p>
              )}
              {!clientsLoading && clientSearch.trim().length >= 2 && dbClients.length === 0 && (
                <p className="px-2 py-4 text-xs opacity-50">Nenhum cliente encontrado</p>
              )}
              {dbClients.map((c) => (
                <button
                  key={c.id_cliente}
                  type="button"
                  onClick={() => {
                    setSelectedClient(c);
                    setIsConsultOpen(false);
                    setClientSearch('');
                    toast.success(`Cliente ${c.nome} selecionado`);
                  }}
                  className={`w-full p-4 rounded-xl text-left font-bold border transition-all font-mono hover:scale-[1.01] ${
                    darkMode
                      ? 'border-white/5 hover:border-cyan-500/50 hover:bg-cyan-500/10'
                      : 'border-slate-200 hover:border-cyan-400 hover:bg-cyan-50'
                  }`}
                >
                  <div>{c.nome}</div>
                  <div className="text-[10px] opacity-50 uppercase mt-1">
                    ID: {c.id_cliente} | CNPJ: {c.cnpj}
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setIsConsultOpen(false)}
              className="mt-6 text-xs font-bold uppercase opacity-40 hover:opacity-100 transition-opacity"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      <main className="p-8 max-w-4xl mx-auto w-full flex-1 relative z-10">
        <div className="mb-6">
          <button
            type="button"
            onClick={onBackToHub}
            className="text-xs uppercase text-cyan-400 font-black italic flex items-center gap-2 hover:text-cyan-300 font-mono transition-colors"
          >
            <ArrowLeft size={16} /> Voltar ao hub
          </button>
        </div>

        {view === 'params' && (
          <div
            className={`p-10 rounded-[3.5rem] border shadow-2xl backdrop-blur-xl animate-in fade-in ${
              darkMode ? 'bg-slate-900/60 border-white/10' : 'bg-white/80 border-white/40'
            }`}
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-10 border-b border-white/10 pb-6">
              <div>
                <h2 className="text-2xl font-black uppercase italic font-mono text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                  Gerar fichas
                </h2>
                <p className="mt-1 text-sm opacity-60 italic">
                  Fichas <strong className="opacity-100">R11</strong>, <strong className="opacity-100">R12</strong> e{' '}
                  <strong className="opacity-100">R13</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsConsultOpen(true)}
                className="px-5 py-3 bg-cyan-600/90 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 font-mono shadow-lg transition-all"
              >
                <Search size={14} /> Pesquisar Empresa
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10">
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-[10px] font-black uppercase opacity-50 ml-1">Cliente</label>
                <div className={`${inputClass} min-h-[56px] ${selectedClient ? '' : 'opacity-50'}`}>
                  {selectedClient
                    ? `${selectedClient.nome} · ID ${selectedClient.id_cliente} · ${selectedClient.cnpj}`
                    : 'Nenhum cliente selecionado'}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase opacity-50 ml-1">Período início</label>
                <input type="date" className={inputClass} value={periodoI} onChange={(e) => setPeriodoI(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase opacity-50 ml-1">Período fim</label>
                <input type="date" className={inputClass} value={periodoF} onChange={(e) => setPeriodoF(e.target.value)} />
              </div>
            </div>

            <button
              type="button"
              disabled={processing}
              onClick={handleProcess}
              className="inline-flex items-center justify-center gap-2 px-10 py-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-500 text-white font-black uppercase shadow-xl hover:scale-[1.02] transition-transform disabled:opacity-60"
            >
              <Sparkles size={16} />
              {processing ? 'Processando…' : 'Processar'}
            </button>
          </div>
        )}

        {view === 'results' && (
          <div className="animate-in fade-in space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase italic font-mono text-cyan-400">Arquivos disponíveis</h2>
                <p className="mt-1 text-sm opacity-60">
                  {selectedClient?.nome} · {periodoI} a {periodoF}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView('params')}
                className="text-xs font-bold uppercase tracking-wide opacity-50 hover:opacity-100 transition"
              >
                ← Voltar aos parâmetros
              </button>
            </div>

            {exports.length > 0 && (
              <div
                className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                  darkMode ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-white/60'
                }`}
              >
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 accent-cyan-500" />
                  <span>
                    {allSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    <span className="ml-2 opacity-50">
                      ({selectedIds.length}/{exports.length})
                    </span>
                  </span>
                </label>
                <button
                  type="button"
                  disabled={batchDownloading || selectedIds.length === 0}
                  onClick={handleDownloadSelected}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-cyan-300 transition hover:bg-cyan-500 hover:text-white disabled:opacity-50"
                >
                  <Download size={14} />
                  {batchDownloading ? 'Baixando…' : `Baixar selecionados (${selectedIds.length})`}
                </button>
              </div>
            )}

            <ul className="space-y-3">
              {exports.length === 0 && (
                <li
                  className={`rounded-2xl border px-5 py-6 text-sm opacity-60 ${
                    darkMode ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-white/60'
                  }`}
                >
                  Nenhum arquivo R11/R12/R13 gerado para este período.
                </li>
              )}
              {exports.map((item) => {
                const checked = selectedIds.includes(item.id);
                return (
                  <li
                    key={item.id}
                    className={`flex flex-col gap-4 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
                      darkMode ? 'border-white/10 bg-slate-900/40' : 'border-slate-200 bg-white/60'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(item.id)}
                        className="mt-2 h-4 w-4 shrink-0 accent-cyan-500"
                        aria-label={`Selecionar ${item.fileName}`}
                      />
                      <div className="mt-0.5 rounded-xl bg-cyan-500/20 p-2.5 text-cyan-400">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-bold uppercase tracking-tight">
                          Ficha {item.ficha}
                          <span className="ml-2 font-normal opacity-50">· {item.periodoLabel}</span>
                        </div>
                        <div className="mt-1 truncate font-mono text-[11px] opacity-50">{item.fileName}</div>
                        <div className="mt-2 text-xs text-cyan-400">
                          {Number(item.linhas).toLocaleString('pt-BR')} linhas
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={batchDownloading}
                      onClick={() => handleDownload(item).catch(() => undefined)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-cyan-300 transition hover:bg-cyan-500 hover:text-white disabled:opacity-50"
                    >
                      <Download size={14} /> Baixar
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
