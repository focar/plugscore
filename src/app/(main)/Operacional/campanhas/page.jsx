"use client";

import React, { useState, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';

// --- Ícones ---
const EditIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>);
const Trash2Icon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>);

// --- Componentes de UI ---
const Input = (props) => (<input {...props} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-200 dark:disabled:bg-gray-800" />);

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

// --- Componente da Página ---
export default function PaginaClientes() {
    const { allClients, setAllClients } = useContext(AppContext);
    const supabase = createClientComponentClient();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    // Função para re-sincronizar os clientes do banco de dados para o estado global
    const refreshClients = async () => {
        const { data: clientsData } = await supabase.from('clientes').select('id, nome').order('nome');
        if (clientsData) setAllClients(clientsData);
    };

    const handleAdd = () => {
        setEditingClient({ nome: '', codigo: '' });
        setIsModalOpen(true);
    };
    
    const handleEdit = (client) => {
        setEditingClient(client);
        setIsModalOpen(true);
    };

    const handleDelete = async (clientId) => {
        const confirmed = confirm("Atenção! Apagar um cliente irá apagar TODOS os lançamentos e dados associados a ele. Tem a certeza?");
        if (confirmed) {
            const toastId = toast.loading('A apagar cliente...');
            try {
                const { error } = await supabase.from('clientes').delete().eq('id', clientId);
                if (error) throw error;
                toast.success('Cliente apagado com sucesso!', { id: toastId });
                await refreshClients();
            } catch (err) {
                toast.error('Não foi possível apagar o cliente.', { id: toastId });
                console.error("Erro ao apagar:", err);
            }
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (isSaving) return;
        setIsSaving(true);
        
        const toastId = toast.loading(editingClient?.id ? 'A atualizar cliente...' : 'A criar cliente...');
        
        const { id, ...dataToSave } = editingClient;

        try {
            const { error } = id 
                ? await supabase.from('clientes').update(dataToSave).eq('id', id) 
                : await supabase.from('clientes').insert(dataToSave);
            
            if (error) throw error;
            
            toast.success(id ? 'Cliente atualizado!' : 'Cliente criado!', { id: toastId });
            setIsModalOpen(false);
            await refreshClients();

        } catch (err) {
            toast.error("Não foi possível guardar o cliente. Verifique se o código já não existe.", { id: toastId });
            console.error("Erro ao guardar:", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
            <Toaster position="top-center" />
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">Gestão de Clientes (Empresas)</h1>
                <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-semibold">+ Novo Cliente</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className="p-3">Nome do Cliente</th>
                            <th className="p-3">Código</th>
                            <th className="p-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(allClients || []).map(client => (
                            <tr key={client.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                <td className="p-3 font-medium text-gray-900 dark:text-white">{client.nome}</td>
                                <td className="p-3 font-mono text-sm">{client.codigo}</td>
                                <td className="p-3 flex justify-end gap-3 items-center">
                                    <button onClick={() => handleEdit(client)} className="font-medium text-blue-600 dark:text-blue-500 hover:underline">Editar</button>
                                    <button onClick={() => handleDelete(client.id)} className="font-medium text-red-600 dark:text-red-500 hover:underline">Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingClient?.id ? 'Editar Cliente' : 'Criar Cliente'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label htmlFor="nome-cliente" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Cliente</label>
                        <Input type="text" id="nome-cliente" required value={editingClient?.nome || ''} onChange={(e) => setEditingClient({ ...editingClient, nome: e.target.value })} />
                    </div>
                    <div>
                        <label htmlFor="codigo-cliente" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Código (Ex: EDU, BRG)</label>
                        <Input type="text" id="codigo-cliente" required value={editingClient?.codigo || ''} onChange={(e) => setEditingClient({ ...editingClient, codigo: e.target.value.toUpperCase() })} />
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
