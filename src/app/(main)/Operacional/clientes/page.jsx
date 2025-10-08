// src/app/(main)/Operacional/clientes/page.jsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';

// --- Ícones ---
const PlusCircleIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>);
const EditIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>);
const TrashIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
const XIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);

// --- Componentes ---
const Input = (props) => (<input {...props} className="block w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />);
function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4">
                <div className="flex justify-between items-center border-b p-4 dark:border-gray-600">
                    {/* --- CORREÇÃO DE COR --- */}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"><XIcon width={20} height={20} /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
}

export default function ClientesPage() {
    const { setHeaderContent } = useContext(AppContext);
    const supabase = createClientComponentClient();
    
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingCliente, setEditingCliente] = useState(null);

    useEffect(() => {
        setHeaderContent({
            title: 'Gestão de Clientes',
            controls: (
                <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold transition-colors">
                    <PlusCircleIcon /> Novo Cliente
                </button>
            )
        });
        fetchData();
        return () => setHeaderContent({ title: '', controls: null });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchData() {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.from('clientes').select('*, lancamentos(codigo, nome)').order('nome', { ascending: true });
            if (error) throw error;
            setClientes(data || []);
        } catch (err) {
            setError('Erro ao carregar clientes: ' + err.message);
        } finally {
            setLoading(false);
        }
    }

    const handleAddNew = () => {
        setEditingCliente({ nome: '', codigo: '', lancamentos: [] });
        setIsModalOpen(true);
    };

    const handleEdit = (cliente) => {
        setEditingCliente({ ...cliente });
        setIsModalOpen(true);
    };

    const handleDelete = async (clienteId) => {
        if (!window.confirm("Tem a certeza que deseja apagar este cliente? Todos os lançamentos e dados associados podem ser afetados.")) return;
        try {
            await supabase.from('clientes').delete().eq('id', clienteId).throwOnError();
            fetchData();
        } catch (err) {
            setError("Não foi possível apagar o cliente. Verifique se existem lançamentos associados a ele.");
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        setError(null);

        const { lancamentos, ...dataToSave } = editingCliente;
        dataToSave.codigo = dataToSave.codigo.toUpperCase();

        try {
            if (dataToSave.id) {
                await supabase.from('clientes').update({ nome: dataToSave.nome, codigo: dataToSave.codigo }).eq('id', dataToSave.id).throwOnError();
            } else {
                await supabase.from('clientes').insert({ nome: dataToSave.nome, codigo: dataToSave.codigo }).throwOnError();
            }
            setIsModalOpen(false);
            fetchData();
        } catch (err) {
            setError("Não foi possível guardar o cliente: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-700 dark:text-gray-300">A carregar...</div>;

    return (
        <div className="p-4 md:p-8">
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                {error && <div className="m-6 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nome do Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Código do Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Códigos de Lançamento</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-200">
                            {clientes.map((cliente) => (
                                <tr key={cliente.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{cliente.nome}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{cliente.codigo}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400">
                                        {cliente.lancamentos.map(l => l.codigo).join(', ')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end items-center gap-4">
                                        <button onClick={() => handleEdit(cliente)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"><EditIcon /> Editar</button>
                                        <button onClick={() => handleDelete(cliente.id)} className="text-red-600 hover:text-red-800 dark:text-red-500 dark:hover:text-red-400 flex items-center gap-1"><TrashIcon /> Excluir</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {editingCliente && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCliente.id ? `Editar Cliente: ${editingCliente.nome}` : 'Novo Cliente'}>
                        <form onSubmit={handleSave} className="space-y-6">
                            <div>
                                {/* --- CORREÇÃO DE COR --- */}
                                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Cliente</label>
                                <Input id="nome" type="text" required value={editingCliente.nome || ''} onChange={(e) => setEditingCliente({ ...editingCliente, nome: e.target.value })} />
                            </div>
                            <div>
                                {/* --- CORREÇÃO DE COR --- */}
                                <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código do Cliente</label>
                                <Input id="codigo" type="text" required value={editingCliente.codigo || ''} onChange={(e) => setEditingCliente({ ...editingCliente, codigo: e.target.value.toUpperCase() })} placeholder="Ex: BRG, EDU" />
                            </div>
                            
                            {editingCliente.id && editingCliente.lancamentos.length > 0 && (
                                <div>
                                    {/* --- CORREÇÃO DE COR --- */}
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lançamentos Associados</label>
                                    <div className="border rounded-md p-3 bg-gray-50 dark:bg-gray-900/50 space-y-2 border-gray-200 dark:border-gray-600">
                                        {editingCliente.lancamentos.map(l => (
                                            <div key={l.codigo} className="flex justify-between items-center text-sm text-gray-900 dark:text-gray-200">
                                                <span className="font-semibold">{l.nome}</span>
                                                <span className="font-mono bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded">{l.codigo}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-700">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
                                    {isSaving ? 'A guardar...' : 'Guardar Cliente'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}
            </div>
        </div>
    );
}