// src/app/(main)/Operacional/banco-de-perguntas/page.jsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
// --- ALTERAÇÃO: Trocamos o import do Supabase para o correto ---
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';

// --- Ícones ---
const PlusCircleIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>);
const EditIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>);
const TrashIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
const XIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);

// --- Componentes ---
const Input = (props) => (<input {...props} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />);
const Select = (props) => (<select {...props} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />);
const Textarea = (props) => (<textarea {...props} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />);

function Modal({ isOpen, onClose, title, children, size = 'lg' }) {
    if (!isOpen) return null;
    const sizeClasses = { lg: 'max-w-lg', xl: 'max-w-xl' };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${sizeClasses[size]} flex flex-col max-h-full`}>
                <div className="flex-shrink-0 flex justify-between items-center p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"><XIcon width={20} height={20} /></button>
                </div>
                <div className="p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default function BancoDePerguntasPage() {
    const { setHeaderContent } = useContext(AppContext);
    // --- ALTERAÇÃO: Inicializamos o cliente Supabase da forma correta ---
    const supabase = createClientComponentClient();

    const [perguntas, setPerguntas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPergunta, setEditingPergunta] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setHeaderContent({
            title: 'Banco de Perguntas',
            controls: (
                <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition-colors">
                    <PlusCircleIcon /> Nova Pergunta
                </button>
            )
        });
        fetchData();
        return () => setHeaderContent(null);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const { data: perguntasData, error: perguntasError } = await supabase.from('perguntas').select('*, clientes(id, nome)').order('texto', { ascending: true });
            if (perguntasError) throw perguntasError;
            setPerguntas(perguntasData || []);

            const { data: clientesData, error: clientesError } = await supabase.from('clientes').select('id, nome').order('nome', { ascending: true });
            if (clientesError) throw clientesError;
            setClientes(clientesData || []);
        } catch (err) {
            setError("Erro ao carregar dados: " + err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleAddNew = () => {
        setEditingPergunta({ texto: '', tipo: 'Múltipla Escolha', classe: 'score', opcoes: [''], cliente_id: null });
        setIsModalOpen(true);
    };

    const handleEdit = (pergunta) => {
        setEditingPergunta({ ...pergunta, opcoes: pergunta.opcoes || [''] });
        setIsModalOpen(true);
    };

    const handleDelete = async (perguntaId) => {
        if (!window.confirm("Tem a certeza que deseja apagar esta pergunta?")) return;
        try {
            await supabase.from('perguntas').delete().eq('id', perguntaId).throwOnError();
            fetchData();
        } catch (err) {
            setError("Não foi possível apagar a pergunta: " + err.message);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        setError(null);

        const dataToSave = {
            texto: editingPergunta.texto,
            tipo: editingPergunta.tipo,
            classe: editingPergunta.classe,
            opcoes: editingPergunta.tipo === 'Texto Livre' ? [] : (editingPergunta.opcoes || []).filter(opt => opt && opt.trim() !== ''),
            cliente_id: editingPergunta.cliente_id === 'global' ? null : editingPergunta.cliente_id,
        };

        try {
            if (editingPergunta.id) {
                await supabase.from('perguntas').update(dataToSave).eq('id', editingPergunta.id).throwOnError();
            } else {
                await supabase.from('perguntas').insert(dataToSave).throwOnError();
            }
            setIsModalOpen(false);
            fetchData(); 
        } catch (err) {
            setError("Não foi possível guardar a pergunta: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOptionChange = (index, value) => {
        const newOptions = [...editingPergunta.opcoes];
        newOptions[index] = value;
        setEditingPergunta({ ...editingPergunta, opcoes: newOptions });
    };

    const addOption = () => setEditingPergunta({ ...editingPergunta, opcoes: [...(editingPergunta.opcoes || []), ''] });
    const removeOption = (index) => setEditingPergunta({ ...editingPergunta, opcoes: editingPergunta.opcoes.filter((_, i) => i !== index) });

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
             <div className="overflow-x-auto">
                {loading ? <p>A carregar...</p> : (
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Texto da Pergunta</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Classe</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cliente Associado</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {perguntas.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-900 dark:text-white">{p.texto}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
                                            p.classe === 'score' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                            p.classe === 'perfil' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                            p.classe === 'livre' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''
                                        }`}>
                                            {p.classe}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {p.clientes ? p.clientes.nome : <span className="italic text-gray-400">Global</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center gap-4">
                                        <button onClick={() => handleEdit(p)} className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 flex items-center gap-1"><EditIcon /> Editar</button>
                                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 flex items-center gap-1"><TrashIcon /> Excluir</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPergunta?.id ? 'Editar Pergunta' : 'Criar Nova Pergunta'}>
                <form onSubmit={handleSave} className="space-y-6">
                    {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}
                    <div>
                        <label className="block text-sm font-medium">Texto da Pergunta</label>
                        <Textarea rows="3" required value={editingPergunta?.texto || ''} onChange={(e) => setEditingPergunta({...editingPergunta, texto: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Tipo</label>
                            <Select 
                                required 
                                value={editingPergunta?.tipo || 'Múltipla Escolha'} 
                                onChange={(e) => {
                                    const newType = e.target.value;
                                    setError(null);
                                    if (newType === 'Texto Livre') {
                                        setEditingPergunta({...editingPergunta, tipo: newType, classe: 'livre', opcoes: [] });
                                    } else {
                                        setEditingPergunta({...editingPergunta, tipo: newType, opcoes: editingPergunta?.opcoes && editingPergunta.opcoes.length > 0 ? editingPergunta.opcoes : [''] });
                                    }
                                }}
                            >
                                <option>Múltipla Escolha</option>
                                <option>Sim/Não</option>
                                <option>Texto Livre</option>
                            </Select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Classe</label>
                            <Select 
                                required 
                                value={editingPergunta?.classe || 'score'} 
                                onChange={(e) => setEditingPergunta({...editingPergunta, classe: e.target.value})} 
                                disabled={editingPergunta?.tipo === 'Texto Livre'}
                            >
                                <option value="score">Score</option>
                                <option value="perfil">Perfil</option>
                                <option value="livre">Livre</option>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Associar a um Cliente (Opcional)</label>
                        <Select value={editingPergunta?.cliente_id || 'global'} onChange={(e) => setEditingPergunta({...editingPergunta, cliente_id: e.target.value})}>
                            <option value="global">Global (visível para todos)</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                        </Select>
                    </div>

                    {editingPergunta?.tipo !== 'Texto Livre' && (
                        <div>
                            <label className="block text-sm font-medium">Opções de Resposta</label>
                            <div className="space-y-2 mt-1">
                                {(editingPergunta?.opcoes || []).map((opt, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input type="text" value={opt} onChange={(e) => handleOptionChange(index, e.target.value)} />
                                        <button type="button" onClick={() => removeOption(index)} className="text-red-500 hover:text-red-700 p-1"><XIcon width={16} height={16}/></button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addOption} className="mt-2 text-sm text-blue-600 hover:text-blue-800">+ Adicionar Opção</button>
                        </div>
                    )}
                    
                    <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-700">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">{isSaving ? 'A guardar...' : 'Guardar Pergunta'}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}