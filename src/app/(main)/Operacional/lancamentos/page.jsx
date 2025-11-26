// src/app/(main)/Operacional/lancamentos/page.jsx
'use client';

import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';

// --- ÍCONES ---
const PlusCircleIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>);
const EditIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>);
const TrashIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>);
const ClipboardListIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M9 12h6" /><path d="M9 16h6" /></svg>);
const CalculatorIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="4" y="2" width="16" height="20" rx="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="16" y1="14" x2="16" y2="18" /><path d="M16 10h.01" /><path d="M12 10h.01" /><path d="M8 10h.01" /><path d="M12 14h.01" /><path d="M8 14h.01" /><path d="M12 18h.01" /><path d="M8 18h.01" /></svg>);
const XIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const ImportIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3v12"/><path d="m8 11 4 4 4-4"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/></svg>);

// --- Componentes Reutilizáveis ---
const Input = React.forwardRef((props, ref) => (<input {...props} ref={ref} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-700/50" />));
Input.displayName = 'Input';
const Select = React.forwardRef((props, ref) => (<select {...props} ref={ref} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />));
Select.displayName = 'Select';

function Modal({ isOpen, onClose, title, children, size = 'md' }) {
    if (!isOpen) return null;
    const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl' };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-start pt-10 overflow-y-auto">
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full m-4 ${sizeClasses[size]}`}>
                <div className="flex justify-between items-center border-b p-4 dark:border-gray-600">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
                        <XIcon width={20} height={20} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

const StatusBadge = ({ status }) => {
    const statusStyles = { 'Planejado': 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300', 'Em andamento': 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200', 'Concluido': 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200', 'Cancelado': 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200', };
    return <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[status] || 'bg-gray-200 text-gray-800'}`}>{status}</span>
};

// --- NOVO COMPONENTE: BADGE DE MODALIDADE ---
const ModalidadeBadge = ({ modalidade }) => {
    const styles = {
        'CLASSICO': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200 border border-purple-200 dark:border-purple-800',
        'PERPETUO': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800'
    };
    // Se vier null/vazio, assume Clássico (compatibilidade)
    const tipo = modalidade || 'CLASSICO'; 
    return (
        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wide font-bold rounded ${styles[tipo] || styles['CLASSICO']}`}>
            {tipo === 'CLASSICO' ? 'Clássico' : 'Perpétuo'}
        </span>
    );
};

const PerguntaItem = ({ pergunta, onAction, actionIcon }) => (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
        <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${pergunta.classe === 'score' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'}`}>
                {pergunta.classe}
            </span>
            <span className="text-sm text-gray-800 dark:text-gray-200">{pergunta.texto}</span>
        </div>
        <button onClick={() => onAction(pergunta)} className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-2xl" title={actionIcon === '→' ? "Adicionar ao Lançamento" : "Remover do Lançamento"}>
            {actionIcon}
        </button>
    </div>
);

// --- Página Principal ---
export default function LancamentosPage() {
    const { setHeaderContent, selectedClientId, allClients } = useContext(AppContext);
    const router = useRouter();
    const supabase = createClientComponentClient();
    
    const [allLancamentos, setAllLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingLancamento, setEditingLancamento] = useState(null);
    const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
    const [managingLancamento, setManagingLancamento] = useState(null);
    const [availablePerguntas, setAvailablePerguntas] = useState([]);
    const [linkedPerguntas, setLinkedPerguntas] = useState([]);
    const [loadingPerguntas, setLoadingPerguntas] = useState(false);
    const [importableLaunches, setImportableLaunches] = useState([]);
    const [selectedImportId, setSelectedImportId] = useState('');

    useEffect(() => {
        fetchLancamentos();
    }, []);

    const handleAddNew = useCallback(() => {
        if (!selectedClientId || selectedClientId === 'all') { toast.error("Por favor, selecione um cliente no filtro do topo para criar um novo lançamento."); return; }
        const client = allClients.find(c => c.id === selectedClientId);
        if (!client) { toast.error("Cliente selecionado não encontrado. Por favor, atualize a página."); return; }
        // Default: CLASSICO
        setEditingLancamento({ nome: '', codigo: '', cliente_id: client.id, clientes: { id: client.id, nome: client.nome, codigo: client.codigo }, status: 'Planejado', modalidade: 'CLASSICO' });
        setIsEditModalOpen(true);
    }, [selectedClientId, allClients]);

    useEffect(() => { setHeaderContent({ title: 'Gestão de Lançamentos', controls: ( <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition-colors"> <PlusCircleIcon /> Novo Lançamento </button> ) }); return () => setHeaderContent({ title: '', controls: null }); }, [setHeaderContent, handleAddNew]);

    async function fetchLancamentos() {
        setLoading(true); setError(null);
        try {
            // Agora buscamos também a coluna 'modalidade'
            const { data, error } = await supabase.from('lancamentos').select('*, clientes(id, nome, codigo)').order('nome', { ascending: true });
            if (error) throw error;
            setAllLancamentos(data || []);
        } catch (err) { setError("Erro ao carregar lançamentos: " + err.message); }
        finally { setLoading(false); }
    }

    const filteredLancamentos = useMemo(() => {
        if (!selectedClientId || selectedClientId === 'all') { return allLancamentos; }
        return allLancamentos.filter(l => l.clientes?.id === selectedClientId);
    }, [selectedClientId, allLancamentos]);

    const handleEdit = (lancamento) => {
        // Garante que modalidade tenha um valor default se vier null
        setEditingLancamento({ ...lancamento, modalidade: lancamento.modalidade || 'CLASSICO' });
        setIsEditModalOpen(true);
    };

    const handleDelete = async (lancamentoId) => {
        if (!window.confirm("Atenção! Apagar um lançamento é uma ação irreversível e removerá todos os dados associados.")) return;
        try {
            await supabase.from('lancamento_perguntas').delete().eq('lancamento_id', lancamentoId);
            await supabase.from('lancamentos').delete().eq('id', lancamentoId).throwOnError();
            toast.success('Lançamento apagado com sucesso.');
            fetchLancamentos();
        } catch (err) { toast.error("Não foi possível apagar o lançamento: " + err.message); }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true); setError(null);
        
        const dataToSave = {
            nome: editingLancamento.nome,
            codigo: editingLancamento.codigo,
            cliente_id: editingLancamento.cliente_id,
            status: editingLancamento.status,
            modalidade: editingLancamento.modalidade // Salva o tipo (Clássico/Perpétuo)
        };

        const toastId = toast.loading('A guardar...');
        try {
            let { error } = editingLancamento.id ? await supabase.from('lancamentos').update(dataToSave).eq('id', editingLancamento.id) : await supabase.from('lancamentos').insert(dataToSave);
            if (error) throw error;
            toast.success('Lançamento guardado!', { id: toastId });
            setIsEditModalOpen(false);
            setEditingLancamento(null);
            fetchLancamentos();
        } catch (err) { toast.error("Não foi possível guardar: " + err.message, { id: toastId }); }
        finally { setIsSaving(false); }
    };

    // ... (handleManageQuestions, handleImport, linkPergunta, unlinkPergunta, handleSaveChanges mantidos iguais)
    const handleManageQuestions = async (lancamento) => { setError(null); setManagingLancamento(lancamento); setIsQuestionsModalOpen(true); setLoadingPerguntas(true); try { if (!lancamento.clientes?.id) { throw new Error("Lançamento sem cliente associado."); } const { data: allPerguntas, error: allPerguntasError } = await supabase.from('perguntas').select('id, texto, classe').or(`cliente_id.is.null,cliente_id.eq.${lancamento.clientes.id}`); if (allPerguntasError) throw allPerguntasError; const { data: linkedData, error: linkedError } = await supabase.from('lancamento_perguntas').select('pergunta_id').eq('lancamento_id', lancamento.id); if (linkedError) throw linkedError; const linkedIds = new Set(linkedData.map(item => item.pergunta_id)); setLinkedPerguntas(allPerguntas.filter(p => linkedIds.has(p.id))); setAvailablePerguntas(allPerguntas.filter(p => !linkedIds.has(p.id))); const { data: otherLaunches, error: otherLaunchesError } = await supabase.from('lancamentos').select('id, nome').eq('cliente_id', lancamento.clientes.id).neq('id', lancamento.id); if(otherLaunchesError) throw otherLaunchesError; setImportableLaunches(otherLaunches || []); setSelectedImportId(''); } catch (err) { setError(err.message); toast.error(err.message); setAvailablePerguntas([]); setLinkedPerguntas([]); setImportableLaunches([]); } finally { setLoadingPerguntas(false); } };
    const handleImport = async () => { if (!selectedImportId) { toast.error("Selecione um lançamento para importar."); return; } const toastId = toast.loading('A importar perguntas...'); try { const { data: sourceLinks, error: sourceError } = await supabase.from('lancamento_perguntas').select('pergunta_id').eq('lancamento_id', selectedImportId); if (sourceError) throw sourceError; const sourceQuestionIds = sourceLinks.map(l => l.pergunta_id); if (sourceQuestionIds.length === 0) { toast.error("O lançamento selecionado não tem perguntas."); return; } const { data: questionsToImport, error: questionsError } = await supabase.from('perguntas').select('id, texto, classe').in('id', sourceQuestionIds); if (questionsError) throw questionsError; const currentLinkedIds = new Set(linkedPerguntas.map(p => p.id)); const newQuestions = questionsToImport.filter(p => !currentLinkedIds.has(p.id)); setLinkedPerguntas([...linkedPerguntas, ...newQuestions].sort((a,b) => a.texto.localeCompare(b.texto))); setAvailablePerguntas(availablePerguntas.filter(p => !newQuestions.some(nq => nq.id === p.id))); toast.success(`${newQuestions.length} perguntas importadas!`, { id: toastId }); } catch (err) { toast.error("Erro ao importar: " + err.message, { id: toastId }); } };
    const linkPergunta = (pergunta) => { setAvailablePerguntas(availablePerguntas.filter(p => p.id !== pergunta.id)); setLinkedPerguntas([...linkedPerguntas, pergunta].sort((a,b) => a.texto.localeCompare(b.texto))); };
    const unlinkPergunta = (pergunta) => { setLinkedPerguntas(linkedPerguntas.filter(p => p.id !== pergunta.id)); setAvailablePerguntas([...availablePerguntas, pergunta].sort((a,b) => a.texto.localeCompare(b.texto))); };
    const handleSaveChanges = async () => { setIsSaving(true); const toastId = toast.loading('A guardar alterações...'); try { await supabase.from('lancamento_perguntas').delete().eq('lancamento_id', managingLancamento.id).throwOnError(); if (linkedPerguntas.length > 0) { const newLinks = linkedPerguntas.map(p => ({ lancamento_id: managingLancamento.id, pergunta_id: p.id })); await supabase.from('lancamento_perguntas').insert(newLinks).throwOnError(); } toast.success('Perguntas guardadas!', { id: toastId }); setIsQuestionsModalOpen(false); setManagingLancamento(null); } catch (err) { toast.error("Erro ao guardar perguntas: " + err.message, { id: toastId }); } finally { setIsSaving(false); } };
    
    const handleDefinePontos = (lancamento) => { router.push(`/Operacional/regras-de-pontuacao?lancamentoId=${lancamento.id}`); };

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 overflow-hidden">
            <Toaster position="top-center" />
            {error && !isQuestionsModalOpen && <div className="mb-4 p-4 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-lg">{error}</div>}
            
            <div>
                {loading ? <p className="text-center py-8 text-gray-500 dark:text-gray-300">A carregar...</p> :
                 filteredLancamentos.length === 0 ? <p className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum lançamento encontrado.</p> :
                (
                    <>
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 hidden md:table">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cod. do Lanç.</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Nome do Lançamento</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Tipo</th> {/* Nova Coluna */}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredLancamentos.map((lancamento) => (
                                    <tr key={lancamento.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{lancamento.clientes?.nome || 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">{lancamento.codigo}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{lancamento.nome}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><ModalidadeBadge modalidade={lancamento.modalidade} /></td> {/* Badge de Tipo */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm"><StatusBadge status={lancamento.status} /></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center gap-4">
                                            <button onClick={() => handleDefinePontos(lancamento)} className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-200 flex items-center gap-1"><CalculatorIcon/> Definir Pontos</button>
                                            <button onClick={() => handleManageQuestions(lancamento)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200 flex items-center gap-1"><ClipboardListIcon/> Gerir Perguntas</button>
                                            <button onClick={() => handleEdit(lancamento)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 flex items-center gap-1"><EditIcon /> Editar</button>
                                            <button onClick={() => handleDelete(lancamento.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 flex items-center gap-1"><TrashIcon /> Excluir</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Card Mobile */}
                        <div className="md:hidden space-y-4">
                            {filteredLancamentos.map((lancamento) => (
                                <div key={lancamento.id} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mr-2 truncate">{lancamento.nome}</h3>
                                        <div className="flex flex-col gap-1 items-end">
                                            <StatusBadge status={lancamento.status} />
                                            <ModalidadeBadge modalidade={lancamento.modalidade} />
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                        <span className="font-mono bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded mr-2">
                                            <span className="text-xs">Cod: </span>{lancamento.codigo}
                                        </span>
                                        <span><span className="text-xs">Cliente: </span>{lancamento.clientes?.nome || 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col space-y-2 items-start text-sm border-t border-gray-200 dark:border-gray-600 pt-3">
                                        <button onClick={() => handleDefinePontos(lancamento)} className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-200 flex items-center gap-1 w-full justify-start p-1"><CalculatorIcon/> Definir Pontos</button>
                                        <button onClick={() => handleManageQuestions(lancamento)} className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200 flex items-center gap-1 w-full justify-start p-1"><ClipboardListIcon/> Gerir Perguntas</button>
                                        <button onClick={() => handleEdit(lancamento)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 flex items-center gap-1 w-full justify-start p-1"><EditIcon /> Editar</button>
                                        <button onClick={() => handleDelete(lancamento.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 flex items-center gap-1 w-full justify-start p-1"><TrashIcon /> Excluir</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
            
            {/* MODAL DE EDIÇÃO ATUALIZADO */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={editingLancamento?.id ? 'Editar Lançamento' : 'Novo Lançamento'}>
                <form onSubmit={handleSave} className="space-y-6">
                    <div> <label htmlFor="cliente_nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente</label> <Input id="cliente_nome" type="text" disabled value={editingLancamento?.clientes?.nome || ''} /> </div>
                    <div> <label htmlFor="cliente_codigo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código do Cliente</label> <Input id="cliente_codigo" type="text" disabled value={editingLancamento?.clientes?.codigo || ''} /> </div>
                    
                    {/* SELETOR DE MODALIDADE (NOVO) */}
                    <div> 
                        <label htmlFor="modalidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo de Lançamento</label> 
                        <Select id="modalidade" required value={editingLancamento?.modalidade || 'CLASSICO'} onChange={(e) => setEditingLancamento({ ...editingLancamento, modalidade: e.target.value })}> 
                            <option value="CLASSICO">Clássico (Lista de Leads)</option> 
                            <option value="PERPETUO">Perpétuo (Tráfego Diário)</option> 
                        </Select> 
                        <p className="text-xs text-gray-500 mt-1">Define qual Dashboard e qual Tabela de Dados este lançamento usará.</p>
                    </div>

                    <div> <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Lançamento</label> <Input id="nome" type="text" required value={editingLancamento?.nome || ''} onChange={(e) => setEditingLancamento({ ...editingLancamento, nome: e.target.value })} /> </div>
                    <div> <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código do Lançamento</label> <Input id="codigo" type="text" required value={editingLancamento?.codigo || ''} onChange={(e) => setEditingLancamento({ ...editingLancamento, codigo: e.target.value })} /> </div>
                    <div> <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label> <Select id="status" required value={editingLancamento?.status || 'Planejado'} onChange={(e) => setEditingLancamento({ ...editingLancamento, status: e.target.value })}> <option>Planejado</option> <option>Em andamento</option> <option>Concluido</option> <option>Cancelado</option> </Select> </div>
                    
                    <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-700"> <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button> <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'A guardar...' : 'Guardar Lançamento'}</button> </div>
                </form>
            </Modal>
            
            <Modal isOpen={isQuestionsModalOpen} onClose={() => setIsQuestionsModalOpen(false)} title={`Gerir Perguntas para: ${managingLancamento?.nome}`} size="3xl">
                {/* ... (Conteúdo do modal de perguntas mantido igual) ... */}
                <div className="flex flex-col h-[70vh]">
                    {error && <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg shrink-0">{error}</div>}
                    {loadingPerguntas ? <p className="text-center py-8 text-gray-500 dark:text-gray-300 flex-grow">A carregar...</p> : !error && <>
                        {importableLaunches.length > 0 && (
                            <div className="mb-4 p-3 border rounded-lg dark:border-gray-600 flex items-center gap-4 shrink-0">
                                <label htmlFor="import-select" className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Importar de outro lançamento:</label>
                                <Select id="import-select" value={selectedImportId} onChange={e => setSelectedImportId(e.target.value)} className="flex-grow">
                                    <option value="" disabled>Selecione...</option>
                                    {importableLaunches.map(l => (<option key={l.id} value={l.id}>{l.nome}</option>))}
                                </Select>
                                <button onClick={handleImport} className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-semibold rounded-md hover:bg-gray-300 dark:hover:bg-gray-600">
                                    <ImportIcon /> Importar
                                </button>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-6 flex-grow min-h-0">
                            <div className="flex flex-col border rounded-lg p-4 dark:border-gray-600 min-h-0">
                                <h4 className="font-semibold mb-2 shrink-0 text-gray-900 dark:text-gray-100">Perguntas Disponíveis</h4>
                                <div className="overflow-y-auto flex-grow">
                                    {availablePerguntas.map(p => <PerguntaItem key={p.id} pergunta={p} onAction={linkPergunta} actionIcon="→" />)}
                                </div>
                            </div>
                            <div className="flex flex-col border rounded-lg p-4 dark:border-gray-600 min-h-0">
                                <h4 className="font-semibold mb-2 shrink-0 text-gray-900 dark:text-gray-100">Perguntas no Lançamento</h4>
                                <div className="overflow-y-auto flex-grow">
                                    {linkedPerguntas.map(p => <PerguntaItem key={p.id} pergunta={p} onAction={unlinkPergunta} actionIcon="←" />)}
                                </div>
                            </div>
                        </div>
                    </>}
                    <div className="mt-6 flex justify-end gap-3 border-t dark:border-gray-600 pt-4 shrink-0">
                        <button type="button" onClick={() => setIsQuestionsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
                        <button type="button" onClick={handleSaveChanges} disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50">{isSaving ? 'A guardar...' : 'Guardar Alterações'}</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}