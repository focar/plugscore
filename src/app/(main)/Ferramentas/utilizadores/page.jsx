// src/app/(main)/Ferramentas/utilizadores/page.jsx
'use client';

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';

// --- Ícones e Componentes (sem alterações) ---
const EditIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>);
const XIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>);
const LockIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>);
const Select = (props) => (<select {...props} className="block w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />);
const Input = (props) => (<input {...props} className="block w-full px-3 py-2 text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />);
function Modal({ isOpen, onClose, title, children }) { /* ... (código do Modal sem alteração) ... */ if (!isOpen) return null; return ( <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center"> <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg m-4"> <div className="flex justify-between items-center border-b p-4 dark:border-gray-600"> <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3> <button onClick={onClose} className="p-1 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"> <XIcon width={20} height={20} /> </button> </div> <div className="p-6">{children}</div> </div> </div> ); }
const AccessDenied = () => ( /* ... (código do AccessDenied sem alteração) ... */ <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-8 text-center max-w-md mx-auto"> <LockIcon className="mx-auto h-12 w-12 text-red-500" /> <h2 className="mt-4 text-xl font-bold text-gray-900 dark:text-gray-100">Acesso Negado</h2> <p className="mt-2 text-gray-600 dark:text-gray-400">Você não tem permissão para aceder a esta página. Apenas administradores.</p> </div> );

// --- Componente Badge de Perfil ---
const RoleBadge = ({ role }) => {
    const styles = {
        admin: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        membro: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        view: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return (
        <span className={`px-2 py-1 text-xs rounded-full font-semibold capitalize ${styles[role] || styles.view}`}>
            {role}
        </span>
    );
};


export default function UtilizadoresPage() {
    const { setHeaderContent, selectedClientId } = useContext(AppContext);
    const supabase = createClientComponentClient();
    
    // ... (Estados sem alterações)
    const [allUsers, setAllUsers] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // ... (useEffect, checkAuthAndFetchData, filteredUsers, handleEdit, handleSave sem alterações)
    useEffect(() => { setHeaderContent({ title: 'Gestão de Usuários' }); checkAuthAndFetchData(); return () => setHeaderContent({ title: '', controls: null }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    async function checkAuthAndFetchData() { setLoading(true); setError(null); try { const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Utilizador não autenticado."); const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single(); if (profile?.role !== 'admin') { setIsAuthorized(false); setLoading(false); return; } setIsAuthorized(true); const { data: usersData, error: usersError } = await supabase.rpc('get_all_users', { p_user_id: user.id }); if (usersError) throw usersError; setAllUsers(usersData || []); const { data: clientesData, error: clientesError } = await supabase.from('clientes').select('id, nome').order('nome'); if (clientesError) throw clientesError; setClientes(clientesData || []); } catch (err) { setError(err.message); } finally { setLoading(false); } }
    const filteredUsers = useMemo(() => { if (!selectedClientId || selectedClientId === 'all') { return allUsers; } return allUsers.filter(u => u.cliente_id === selectedClientId); }, [selectedClientId, allUsers]);
    const handleEdit = (user) => { setEditingUser({ ...user }); setIsModalOpen(true); };
    const handleSave = async (e) => { e.preventDefault(); if (isSaving) return; setIsSaving(true); setError(null); try { const { error: updateError } = await supabase .from('profiles') .update({ full_name: editingUser.full_name, role: editingUser.role, cliente_id: editingUser.cliente_id === 'null' ? null : editingUser.cliente_id, }) .eq('id', editingUser.id); if (updateError) throw updateError; setIsModalOpen(false); window.location.reload(); } catch (err) { setError('Não foi possível guardar as alterações: ' + err.message); } finally { setIsSaving(false); } };

    if (loading) return <div className="p-8 text-center text-gray-700 dark:text-gray-300">A carregar...</div>;
    if (!isAuthorized) return <div className="p-4 md:p-8"><AccessDenied /></div>;

    return (
        // *** CORREÇÃO: Adicionado overflow-hidden ***
        <div className="p-4 md:p-8 overflow-hidden">
            <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                {error && <div className="m-6 p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}
                
                {/* *** CORREÇÃO: Removido overflow-x-auto, trocado tabela por lista no mobile *** */}
                <div>
                    {loading ? <p className="text-center py-8 text-gray-500 dark:text-gray-300">A carregar...</p> :
                    filteredUsers.length === 0 ? <p className="text-center py-8 text-gray-500 dark:text-gray-400">Nenhum utilizador encontrado.</p> :
                    (
                        <>
                            {/* Tabela Desktop */}
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 hidden md:table">
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Nome</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Perfil</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Cliente Associado</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{user.full_name || <span className="italic text-gray-500 dark:text-gray-400">Sem nome</span>}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm"><RoleBadge role={user.role} /></td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">{user.cliente_nome || <span className="italic text-gray-500 dark:text-gray-400">Nenhum</span>}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 ml-auto">
                                                    <EditIcon /> Editar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Lista Mobile */}
                            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredUsers.map((user) => (
                                    <div key={user.id} className="p-4">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-lg font-semibold text-gray-900 dark:text-white truncate pr-2">{user.full_name || <span className="italic text-gray-500 dark:text-gray-400">Sem nome</span>}</span>
                                            <button onClick={() => handleEdit(user)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 text-sm flex-shrink-0">
                                                <EditIcon /> Editar
                                            </button>
                                        </div>
                                         <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-2">{user.email}</p>
                                         <div className="flex items-center gap-4 text-sm">
                                            <RoleBadge role={user.role} />
                                            <span className="text-gray-600 dark:text-gray-300">{user.cliente_nome || <span className="italic text-gray-500 dark:text-gray-400">Nenhum cliente</span>}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
                 {/* *** FIM DA CORREÇÃO *** */}

                {editingUser && (
                    <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Editar Usuário: ${editingUser.email}`}>
                        {/* ... (Conteúdo do Modal Edit sem alteração, já usa cores corretas) ... */ <form onSubmit={handleSave} className="space-y-6"> <div> <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome Completo</label> <Input id="full_name" type="text" value={editingUser.full_name || ''} onChange={(e) => setEditingUser({...editingUser, full_name: e.target.value})} /> </div> <div> <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Perfil</label> <Select id="role" value={editingUser.role} onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}> <option value="membro">Membro</option> <option value="admin">Admin</option> <option value="view">View</option> </Select> </div> <div> <label htmlFor="cliente" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Associar ao Cliente</label> <Select id="cliente" value={editingUser.cliente_id || 'null'} onChange={(e) => setEditingUser({...editingUser, cliente_id: e.target.value})}> <option value="null">Nenhum (Administrador Global)</option> {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)} </Select> </div> <div className="pt-4 flex justify-end gap-3 border-t dark:border-gray-700"> <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</button> <button type="submit" disabled={isSaving} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"> {isSaving ? 'A guardar...' : 'Guardar Alterações'} </button> </div> </form>}
                    </Modal>
                )}
            </div>
        </div>
    );
}