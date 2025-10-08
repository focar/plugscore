"use client";

import React, { useState, useEffect, useMemo } from 'react';

// --- Configuração do Cliente Supabase ---
let supabase = null;
const supabaseUrl = 'https://qmnhgbdkgnbvfdxhbtst.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtbmhnYmRrZ25idmZkeGhidHN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MzQ3MjEsImV4cCI6MjA3NTAxMDcyMX0.h9X-JGEloX_KXo2V9bBV0n6fvUS6zzVfmv7PzXsMq7k';

// =================================================================================
// --- SEÇÃO DE ÍCONES (ICON COMPONENTS) ---
// =================================================================================
const SunIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>);
const MoonIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>);
const SearchIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>);
const PlusCircleIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>);
const EditIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>);
const Trash2Icon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>);
const ChevronsUpDownIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>);
const ArrowUpDownIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/></svg>);
const XIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);

// =================================================================================
// --- SEÇÃO DE COMPONENTES GLOBAIS (SHARED COMPONENTS) ---
// =================================================================================

const Input = (props) => (<input {...props} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-200 dark:disabled:bg-gray-800" />);
const Select = (props) => (<select {...props} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-200 dark:disabled:bg-gray-800" />);
const Textarea = (props) => (<textarea {...props} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />);

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    if (!isOpen) return null;
    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-10 overflow-y-auto">
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full m-4 ${sizeClasses[size]}`}>
                <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-gray-600">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-3xl leading-none">&times;</button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
}

function Sidebar({ activePage, setActivePage }) {
    const dashboards = ['Visão Geral', 'Análise de Campanha', 'Lead Scoring'];
    const operacional = ['Campanhas', 'Lançamentos', 'Perguntas', 'Regras de Pontuação'];
    return (
        <div className="w-64 bg-gray-800 text-gray-300 flex flex-col p-4 shrink-0 h-full">
            <div className="flex items-center gap-3 mb-8 px-2">
                <img src="https://qmnhgbdkgnbvfdxhbtst.supabase.co/storage/v1/object/public/img/logo_mini01.png" alt="Logótipo do PlugScore" className="h-10 w-10" />
                <div>
                    <h1 className="text-white text-xl font-bold">PlugScore</h1>
                    <p className="text-xs text-gray-400">v 1.0 by Focar</p>
                </div>
            </div>
            <nav className="flex-grow">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Dashboards</h3>
                <ul>{dashboards.map(item => (<li key={item} onClick={() => setActivePage(item)} className={`p-2 rounded-md cursor-pointer mb-1 transition-colors ${activePage === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>{item}</li>))}</ul>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-2 px-2">Operacional</h3>
                <ul>{operacional.map(item => (<li key={item} onClick={() => setActivePage(item)} className={`p-2 rounded-md cursor-pointer mb-1 transition-colors ${activePage === item ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}>{item}</li>))}</ul>
            </nav>
        </div>
    );
}

function CampaignSelector({ campaigns, selectedCampaign, onCampaignChange, visible }) {
    if (!visible) return <div className="w-64 h-10"></div>;
    if (!campaigns || campaigns.length === 0) return <div className="text-sm text-gray-500">Nenhuma campanha encontrada.</div>;
    return (
        <div className="relative">
            <select value={selectedCampaign ? selectedCampaign.id : ''} onChange={(e) => { const c = campaigns.find(c => c.id.toString() === e.target.value); onCampaignChange(c); }} className="appearance-none w-full md:w-64 bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500">
                {campaigns.map(c => (<option key={c.id} value={c.id}>{c.nome}</option>))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300"><ChevronsUpDownIcon /></div>
        </div>
    );
}

// =================================================================================
// --- SEÇÃO DE PÁGINAS (PAGES) ---
// =================================================================================

function PaginaLeadScoring() {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'descending' });

    useEffect(() => {
        fetchLeads();
    }, []);

    async function fetchLeads() {
        if (!supabase) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.from('leads').select('id, nome, email, telefone, score, perfil');
            if (error) throw error;
            setLeads(data || []);
        } catch (err) { setError("Não foi possível carregar os leads."); } finally { setLoading(false); }
    }

    const sortedLeads = useMemo(() => {
        let sortableLeads = [...leads];
        if (sortConfig.key !== null) {
            sortableLeads.sort((a, b) => {
                const valA = a[sortConfig.key] || '';
                const valB = b[sortConfig.key] || '';
                if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableLeads.filter(lead =>
            lead.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [leads, sortConfig, searchTerm]);

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Lead Scoring</h1>
                <div className="w-full md:w-auto flex gap-4">
                     <div className="relative w-full md:w-64">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input type="text" placeholder="Pesquisar por nome ou email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10"/>
                    </div>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-semibold" onClick={() => alert('Funcionalidade de recalcular scores em desenvolvimento.')}>Recalcular Scores</button>
                </div>
            </div>
            {loading && <p>A carregar leads...</p>}
            {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('nome')}>Nome <ArrowUpDownIcon className="inline-block" /></th>
                            <th className="p-3">Email</th>
                            <th className="p-3 cursor-pointer text-center" onClick={() => requestSort('score')}>Score <ArrowUpDownIcon className="inline-block" /></th>
                            <th className="p-3 cursor-pointer" onClick={() => requestSort('perfil')}>Perfil <ArrowUpDownIcon className="inline-block" /></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedLeads.map(lead => (
                            <tr key={lead.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="p-3 font-medium text-gray-900 dark:text-white">{lead.nome || '-'}</td>
                                <td className="p-3 text-gray-600 dark:text-gray-300">{lead.email}</td>
                                <td className="p-3 font-mono text-center text-lg">{lead.score}</td>
                                <td className="p-3"><span className="px-2 py-1 text-sm rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">{lead.perfil || '-'}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PaginaCampanhas({ campanhas = [], fetchCampaigns }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCampanha, setEditingCampanha] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleAdd = () => { setEditingCampanha({ nome: '', codigo: '' }); setIsModalOpen(true); };
    const handleEdit = (campanha) => { setEditingCampanha(campanha); setIsModalOpen(true); };

    const handleDelete = async (campanhaId) => {
        if (!supabase) return;
        if (window.confirm("Atenção! Apagar uma campanha irá apagar TODOS os lançamentos, regras e dados associados. Tem a certeza?")) {
            setLoading(true);
            try {
                const { error } = await supabase.from('campanhas').delete().eq('id', campanhaId);
                if (error) throw error;
                fetchCampaigns();
            } catch (err) { setError("Não foi possível apagar a campanha."); } finally { setLoading(false); }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving || !supabase) return;
        setIsSaving(true);
        setError(null);
        const { id, ...dataToSave } = editingCampanha;
        try {
            const { error } = id ? await supabase.from('campanhas').update(dataToSave).eq('id', id) : await supabase.from('campanhas').insert(dataToSave);
            if (error) throw error;
            setIsModalOpen(false);
            fetchCampaigns();
        } catch (err) { setError("Não foi possível guardar a campanha. Verifique se o código já não existe."); } finally { setIsSaving(false); }
    };

    return (
         <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Gestão de Campanhas (Empresas)</h1>
                <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">+ Nova Campanha</button>
            </div>
            {loading && <p>A processar...</p>}
            {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                     <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="p-3">Nome da Campanha</th><th className="p-3">Código</th><th className="p-3 text-right">Ações</th></tr></thead>
                    <tbody>
                        {campanhas.map(c => (
                            <tr key={c.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="p-3 font-medium text-gray-900 dark:text-white">{c.nome}</td>
                                <td className="p-3 font-mono text-sm">{c.codigo}</td>
                                <td className="p-3 flex justify-end gap-3 items-center">
                                    <button onClick={() => handleEdit(c)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Editar</button>
                                    <button onClick={() => handleDelete(c.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCampanha?.id ? 'Editar Campanha' : 'Criar Campanha'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="nome-campanha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome da Campanha</label>
                        <Input type="text" id="nome-campanha" required value={editingCampanha?.nome || ''} onChange={(e) => setEditingCampanha({...editingCampanha, nome: e.target.value})} />
                    </div>
                     <div>
                        <label htmlFor="codigo-campanha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código (Ex: EDU, BRG)</label>
                        <Input type="text" id="codigo-campanha" required value={editingCampanha?.codigo || ''} onChange={(e) => setEditingCampanha({...editingCampanha, codigo: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-600">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'A guardar...' : 'Guardar'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function PaginaLancamentos({ campanhas = [] }) {
    const [lancamentos, setLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLancamento, setEditingLancamento] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { fetchLancamentos(); }, []);

    async function fetchLancamentos() {
        if (!supabase) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.from('lancamentos').select('id, nome, codigo, campanha_id, campanhas(nome)').order('nome', { ascending: true });
            if (error) throw error;
            setLancamentos(data || []);
        } catch (err) { setError("Não foi possível carregar os lançamentos."); } finally { setLoading(false); }
    }

    const handleAdd = () => { setEditingLancamento({ nome: '', codigo: '', campanha_id: campanhas[0]?.id || '' }); setIsModalOpen(true); };
    const handleEdit = (lancamento) => { setEditingLancamento(lancamento); setIsModalOpen(true); };

    const handleDelete = async (lancamentoId) => {
        if (!supabase) return;
        if (window.confirm("Tem a certeza que deseja apagar este lançamento?")) {
            try {
                const { error } = await supabase.from('lancamentos').delete().eq('id', lancamentoId);
                if (error) throw error;
                fetchLancamentos();
            } catch (err) { setError("Não foi possível apagar o lançamento."); }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving || !supabase) return;
        setIsSaving(true);
        setError(null);
        const { id, ...dataToSave } = editingLancamento;
        delete dataToSave.campanhas;
        try {
            const { error } = id ? await supabase.from('lancamentos').update(dataToSave).eq('id', id) : await supabase.from('lancamentos').insert(dataToSave);
            if (error) throw error;
            setIsModalOpen(false);
            fetchLancamentos();
        } catch (err) { setError("Não foi possível guardar o lançamento."); } finally { setIsSaving(false); }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Gestão de Lançamentos</h1>
                <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">+ Novo Lançamento</button>
            </div>
            {loading && <p>A carregar...</p>}
            {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                     <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="p-3">Nome do Lançamento</th><th className="p-3">Código</th><th className="p-3">Campanha</th><th className="p-3 text-right">Ações</th></tr></thead>
                    <tbody>
                        {lancamentos.map(l => (
                            <tr key={l.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="p-3 font-medium text-gray-900 dark:text-white">{l.nome}</td>
                                <td className="p-3 font-mono text-sm">{l.codigo}</td>
                                <td className="p-3">{l.campanhas?.nome || 'N/A'}</td>
                                <td className="p-3 flex justify-end gap-3 items-center">
                                    <button onClick={() => handleEdit(l)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Editar</button>
                                    <button onClick={() => handleDelete(l.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingLancamento?.id ? 'Editar Lançamento' : 'Criar Lançamento'}>
                <form onSubmit={handleSave} className="space-y-4">
                     <div>
                        <label htmlFor="campanha" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Campanha</label>
                        <Select id="campanha" required value={editingLancamento?.campanha_id || ''} onChange={(e) => setEditingLancamento({ ...editingLancamento, campanha_id: e.target.value })}>
                            {campanhas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </Select>
                    </div>
                    <div>
                        <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Lançamento</label>
                        <Input type="text" id="nome" required value={editingLancamento?.nome || ''} onChange={(e) => setEditingLancamento({ ...editingLancamento, nome: e.target.value })} />
                    </div>
                     <div>
                        <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código</label>
                        <Input type="text" id="codigo" required value={editingLancamento?.codigo || ''} onChange={(e) => setEditingLancamento({ ...editingLancamento, codigo: e.target.value.toUpperCase() })} />
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-600">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'A guardar...' : 'Guardar'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function BancoDePerguntas() {
    const [perguntas, setPerguntas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('Todos');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPergunta, setEditingPergunta] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { fetchPerguntas(); }, []);

    async function fetchPerguntas() {
        if (!supabase) return;
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.from('perguntas').select('id, texto, tipo, classe, opcoes').order('texto', { ascending: true });
            if (error) throw error;
            setPerguntas(data || []);
        } catch (err) { setError("Não foi possível carregar o banco de perguntas."); } finally { setLoading(false); }
    }

    const filteredPerguntas = useMemo(() => perguntas.filter(p => filter === 'Todos' || p.classe === filter.toLowerCase()), [perguntas, filter]);

    const handleAdd = () => { setEditingPergunta({ texto: '', tipo: 'Múltipla Escolha', classe: 'score', opcoes: [''] }); setIsModalOpen(true); };
    const handleEdit = (pergunta) => { setEditingPergunta({ ...pergunta, opcoes: pergunta.opcoes || [''] }); setIsModalOpen(true); };

    const handleDelete = async (perguntaId) => {
        if (!supabase) return;
        if (window.confirm("Tem a certeza que deseja apagar esta pergunta? As regras associadas não serão apagadas, mas podem ficar órfãs.")) {
            try {
                const { error } = await supabase.from('perguntas').delete().eq('id', perguntaId);
                if (error) throw error;
                fetchPerguntas();
            } catch (err) { setError("Não foi possível apagar a pergunta."); }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving || !supabase) return;
        setIsSaving(true);
        setError(null);
        const perguntaData = { ...editingPergunta, opcoes: editingPergunta.opcoes.filter(opt => opt && opt.trim() !== '') };
        try {
            const { id, ...dataToSave } = perguntaData;
            const { error } = id ? await supabase.from('perguntas').update(dataToSave).eq('id', id) : await supabase.from('perguntas').insert(dataToSave);
            if (error) throw error;
            setIsModalOpen(false);
            setEditingPergunta(null);
            fetchPerguntas();
        } catch (err) { setError("Não foi possível guardar a pergunta."); } finally { setIsSaving(false); }
    };
    
    const handleOptionChange = (index, value) => {
        const newOptions = [...editingPergunta.opcoes];
        newOptions[index] = value;
        setEditingPergunta({ ...editingPergunta, opcoes: newOptions });
    };
    
    const addOption = () => { setEditingPergunta({ ...editingPergunta, opcoes: [...editingPergunta.opcoes, ''] }); };
    const removeOption = (index) => { setEditingPergunta({ ...editingPergunta, opcoes: editingPergunta.opcoes.filter((_, i) => i !== index) }); };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Banco de Perguntas</h1>
                <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold">+ Criar Nova Pergunta</button>
            </div>
            <div className="flex gap-2 mb-4">
                {['Todos', 'Score', 'Perfil'].map(f => (<button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-md text-sm font-medium ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}>{f}</button>))}
            </div>
            {loading && <p>A carregar...</p>}
            {error && <p className="text-red-500 p-4 bg-red-100 rounded-md">{error}</p>}
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700"><tr><th className="p-3">Texto da Pergunta</th><th className="p-3">Tipo</th><th className="p-3">Classe (Uso)</th><th className="p-3 text-right">Ações</th></tr></thead>
                    <tbody>
                        {filteredPerguntas.map(p => (
                            <tr key={p.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="p-3 font-medium text-gray-900 dark:text-white">{p.texto}</td>
                                <td className="p-3">{p.tipo}</td>
                                <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full ${p.classe === 'score' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>{p.classe}</span></td>
                                <td className="p-3 flex justify-end gap-3 items-center">
                                    <button onClick={() => handleEdit(p)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Editar</button>
                                    <button onClick={() => handleDelete(p.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPergunta?.id ? 'Editar Pergunta' : 'Criar Nova Pergunta'} size="lg">
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="texto" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Texto da Pergunta</label>
                        <Textarea id="texto" rows="3" required value={editingPergunta?.texto || ''} onChange={(e) => setEditingPergunta({...editingPergunta, texto: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
                           <Select id="tipo" required value={editingPergunta?.tipo || 'Múltipla Escolha'} onChange={(e) => setEditingPergunta({...editingPergunta, tipo: e.target.value})}>
                               <option>Múltipla Escolha</option><option>Verdadeiro/Falso</option><option>Sim/Não</option>
                           </Select>
                        </div>
                        <div>
                           <label htmlFor="classe" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Classe (Uso Principal)</label>
                           <Select id="classe" required value={editingPergunta?.classe || 'score'} onChange={(e) => setEditingPergunta({...editingPergunta, classe: e.target.value})}>
                               <option value="score">Score</option><option value="perfil">Perfil</option>
                           </Select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Opções de Resposta</label>
                        <div className="space-y-2 mt-1">
                            {editingPergunta?.opcoes?.map((opt, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <Input type="text" value={opt} onChange={(e) => handleOptionChange(index, e.target.value)} />
                                    <button type="button" onClick={() => removeOption(index)} className="text-red-500 hover:text-red-700"><XIcon /></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={addOption} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Adicionar Opção</button>
                    </div>
                    <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-600">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'A guardar...' : 'Guardar'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function RegrasDePontuacao({ campaignId }) {
    const [perguntas, setPerguntas] = useState([]);
    const [regras, setRegras] = useState([]);
    const [selectedPergunta, setSelectedPergunta] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingPerguntas, setLoadingPerguntas] = useState(true);
    const [loadingRegras, setLoadingRegras] = useState(false);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingRegra, setEditingRegra] = useState(null);

    useEffect(() => {
        async function fetchPerguntas() {
            if (!supabase) return;
            setLoadingPerguntas(true);
            setError(null);
            try {
                let { data, error } = await supabase.from('perguntas').select('id, texto, opcoes').order('texto', { ascending: true });
                if (error) throw error;
                setPerguntas(data || []);
            } catch (err) { setError("Não foi possível carregar as perguntas."); } finally { setLoadingPerguntas(false); }
        }
        fetchPerguntas();
    }, [campaignId]);

    useEffect(() => { setSelectedPergunta(null); setRegras([]); }, [campaignId]);

    useEffect(() => {
        if (!selectedPergunta || !supabase) { setRegras([]); return; }
        async function fetchRegras() {
            setLoadingRegras(true);
            setError(null);
            try {
                let { data, error } = await supabase.from('campanha_regras_pontuacao').select('id, criterio, classe, peso').eq('campanha_id', campaignId).eq('pergunta_id', selectedPergunta.id);
                if (error) throw error;
                setRegras(data || []);
            } catch (err) { setError("Não foi possível carregar as regras para esta pergunta."); } finally { setLoadingRegras(false); }
        }
        fetchRegras();
    }, [selectedPergunta, campaignId]);

    const filteredPerguntas = useMemo(() => perguntas.filter(p => p.texto && p.texto.toLowerCase().includes(searchTerm.toLowerCase())), [perguntas, searchTerm]);
    const handleSelectPergunta = (pergunta) => { setSelectedPergunta(pergunta); };
    const handleAddRegra = () => { const lockedClass = regras.length > 0 ? regras[0].classe : 'score'; setEditingRegra({ criterio: '', classe: lockedClass, peso: 0 }); setIsModalOpen(true); };
    const handleEditRegra = (regra) => { setEditingRegra(regra); setIsModalOpen(true); };
    
    const handleDeleteRegra = async (regraId) => {
        if (!supabase) return;
        setError(null);
        try {
            const { error } = await supabase.from('campanha_regras_pontuacao').delete().eq('id', regraId);
            if (error) throw error;
            setRegras(regras.filter(r => r.id !== regraId));
        } catch (err) { setError("Não foi possível apagar a regra."); }
    };

    const handleSaveRegra = async (e) => {
        e.preventDefault();
        if (isSaving || !supabase) return;
        setIsSaving(true);
        setError(null);
        try {
            if (editingRegra.id) {
                const { error } = await supabase.from('campanha_regras_pontuacao').update({ peso: editingRegra.peso, classe: editingRegra.classe, criterio: editingRegra.criterio }).eq('id', editingRegra.id);
                if (error) throw error;
            } else {
                const { id, ...newRuleData } = editingRegra;
                const { error } = await supabase.from('campanha_regras_pontuacao').insert([{ campanha_id: campaignId, pergunta_id: selectedPergunta.id, ...newRuleData }]);
                if (error) throw error;
            }
            const { data: updatedRegras } = await supabase.from('campanha_regras_pontuacao').select('id, criterio, classe, peso').eq('campanha_id', campaignId).eq('pergunta_id', selectedPergunta.id);
            setRegras(updatedRegras || []);
            setIsModalOpen(false);
            setEditingRegra(null);
        } catch (err) { setError("Não foi possível guardar a regra."); } finally { setIsSaving(false); }
    };
    
    return (
        <div className="flex flex-col h-full">
            {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
            <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-col">
                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Banco de Perguntas</h2>
                    <div className="relative mb-4"><SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input type="text" placeholder="Pesquisar pergunta..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2" /></div>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {loadingPerguntas ? <p className="text-gray-500">A carregar perguntas...</p> : filteredPerguntas.map(p => (<div key={p.id} onClick={() => handleSelectPergunta(p)} className={`p-3 rounded-md cursor-pointer mb-2 transition-colors ${selectedPergunta?.id === p.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{p.texto}</div>))}
                    </div>
                </div>
                <div className="md:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex flex-col">
                    {!selectedPergunta ? <div className="flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">Selecione uma pergunta à esquerda para ver ou adicionar regras.</div> :
                        (<>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Regras para: <span className="text-blue-600 dark:text-blue-400">{selectedPergunta.texto}</span></h2>
                                <button onClick={handleAddRegra} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"><PlusCircleIcon />Nova Regra</button>
                            </div>
                            <div className="flex-grow overflow-y-auto">
                               {loadingRegras ? <p>A carregar regras...</p> : regras.length === 0 ? <p className="text-center py-8 text-gray-500">Nenhuma regra definida para esta pergunta.</p> :
                                <table className="w-full text-left">
                                    <thead className="text-sm text-gray-500 dark:text-gray-400"><tr><th className="p-2">Critério (Resposta)</th><th className="p-2">Classe</th><th className="p-2">Peso</th><th className="p-2 text-right">Ações</th></tr></thead>
                                    <tbody>
                                        {regras.map(regra => (
                                            <tr key={regra.id} className="border-t border-gray-200 dark:border-gray-700">
                                                <td className="p-2 font-medium">{regra.criterio}</td>
                                                <td className="p-2"><span className={`px-2 py-1 text-xs rounded-full ${regra.classe === 'score' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>{regra.classe}</span></td>
                                                <td className="p-2 font-mono">{regra.peso}</td>
                                                <td className="p-2 flex justify-end gap-2">
                                                    <button onClick={() => handleEditRegra(regra)} className="p-1 text-gray-500 hover:text-blue-500"><EditIcon /></button>
                                                    <button onClick={() => handleDeleteRegra(regra.id)} className="p-1 text-gray-500 hover:text-red-500"><Trash2Icon /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>}
                            </div>
                        </>)}
                </div>
            </div>
            <Modal isOpen={isModalOpen} onClose={() => {setIsModalOpen(false); setEditingRegra(null);}} title={editingRegra?.id ? "Editar Regra" : "Adicionar Nova Regra"}>
                <form onSubmit={handleSaveRegra}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="criterio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Critério (Resposta)</label>
                            <Select id="criterio" value={editingRegra?.criterio || ''} onChange={(e) => setEditingRegra({ ...editingRegra, criterio: e.target.value })} disabled={!!editingRegra?.id} required>
                                <option value="" disabled>Selecione uma opção</option>
                                {selectedPergunta?.opcoes?.map((opt, index) => (<option key={index} value={opt}>{opt}</option>))}
                            </Select>
                        </div>
                        <div>
                            <label htmlFor="classe" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Classe</label>
                            <Select id="classe" value={editingRegra?.classe || 'score'} onChange={(e) => setEditingRegra({ ...editingRegra, classe: e.target.value })} disabled={regras.length > 0 && !editingRegra?.id} required>
                                <option value="score">Score</option><option value="perfil">Perfil</option>
                            </Select>
                            {(regras.length > 0 && !editingRegra?.id) && (<p className="mt-1 text-xs text-gray-500">A classe não pode ser alterada após a criação da primeira regra.</p>)}
                        </div>
                        <div>
                            <label htmlFor="peso" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Peso</label>
                            <Input type="number" id="peso" value={editingRegra?.peso ?? 0} onChange={(e) => setEditingRegra({ ...editingRegra, peso: parseInt(e.target.value, 10) || 0 })} required />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={() => {setIsModalOpen(false); setEditingRegra(null);}} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-600">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 disabled:bg-blue-300">{isSaving ? 'A guardar...' : 'Guardar Regra'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}


// =================================================================================
// --- ARQUIVO: src/app/layout.js ---
// =================================================================================
function Layout({ children, activePage, setActivePage, theme, toggleTheme, campaigns, selectedCampaign, onCampaignChange }) {
    return (
        <div className={`flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 ${theme}`}>
            <Sidebar activePage={activePage} setActivePage={setActivePage} />
            <main className="flex-1 flex flex-col h-screen">
                <header className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <CampaignSelector campaigns={campaigns} selectedCampaign={selectedCampaign} onCampaignChange={onCampaignChange} visible={!['Perguntas', 'Lançamentos', 'Campanhas', 'Lead Scoring'].includes(activePage)} />
                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">{theme === 'dark' ? <SunIcon /> : <MoonIcon />}</button>
                </header>
                <div className="flex-1 p-6 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}

// =================================================================================
// --- ARQUIVO: src/app/page.js ---
// =================================================================================
export default function App() {
    const [theme, setTheme] = useState('light');
    const [activePage, setActivePage] = useState('Lead Scoring');
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [isSupabaseReady, setIsSupabaseReady] = useState(false);

    useEffect(() => {
        const scriptId = 'supabase-sdk';
        if (document.getElementById(scriptId)) {
            if (window.supabase && !supabase) {
                supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
                setIsSupabaseReady(true);
            } else if (supabase) {
                setIsSupabaseReady(true);
            }
            return;
        }
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://unpkg.com/@supabase/supabase-js@2';
        script.async = true;
        script.onload = () => {
            if (window.supabase) {
                supabase = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
                setIsSupabaseReady(true);
            } else { console.error("Falha ao inicializar Supabase."); }
        };
        script.onerror = () => { console.error("Falha ao carregar o script do Supabase."); };
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
        const storedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setTheme(storedTheme);
    }, []);

    useEffect(() => {
        document.documentElement.className = theme;
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    const fetchCampaigns = async () => {
        if (!isSupabaseReady) return;
        try {
            let { data, error } = await supabase.from('campanhas').select('id, nome, codigo').order('nome', { ascending: true });
            if (error) throw error;
            setCampaigns(data || []);
            const selectedExists = data && data.some(c => c.id === selectedCampaign?.id);
            if (data && data.length > 0 && (!selectedCampaign || !selectedExists)) {
                setSelectedCampaign(data[0]);
            } else if (data.length === 0) {
                setSelectedCampaign(null);
            }
        } catch (error) { console.error("Erro ao carregar campanhas:", error); }
    };

    useEffect(() => { fetchCampaigns(); }, [isSupabaseReady]);

    const toggleTheme = () => { setTheme(theme === 'light' ? 'dark' : 'light'); };

    const renderActivePage = () => {
        if (!isSupabaseReady) {
            return <div className="flex justify-center items-center h-full"><p>A inicializar e carregar dados...</p></div>;
        }
        switch (activePage) {
            case 'Lead Scoring':
                return <PaginaLeadScoring />;
            case 'Regras de Pontuação':
                if (!selectedCampaign) return <div className="flex justify-center items-center h-full text-center p-4">Não há nenhuma campanha selecionada. Por favor, crie ou selecione uma campanha na página 'Campanhas'.</div>;
                return <RegrasDePontuacao campaignId={selectedCampaign.id} />;
            case 'Perguntas':
                return <BancoDePerguntas />;
            case 'Lançamentos':
                return <PaginaLancamentos campanhas={campaigns} />;
            case 'Campanhas':
                return <PaginaCampanhas campanhas={campaigns} fetchCampaigns={fetchCampaigns} />;
            default:
                return <div className="p-8">Página "{activePage}" em construção.</div>;
        }
    };

    return (
        <Layout 
            activePage={activePage} 
            setActivePage={setActivePage} 
            theme={theme} 
            toggleTheme={toggleTheme}
            campaigns={campaigns}
            selectedCampaign={selectedCampaign}
            onCampaignChange={setSelectedCampaign}
        >
            {renderActivePage()}
        </Layout>
    );
}

