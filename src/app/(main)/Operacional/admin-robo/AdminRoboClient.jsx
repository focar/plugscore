// Arquivo: /src/app/(main)/Operacional/admin-robo/AdminRoboClient.jsx (100% Completo)
'use client';

import { useState, useEffect, useContext, useTransition, useRef } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { FaTrash, FaPlus, FaSpinner, FaSync, FaDownload } from 'react-icons/fa';
import { AppContext } from '@/context/AppContext';
import { addGroupAction, deleteGroupAction, importGroupMembersAction } from './actions';
import toast, { Toaster } from 'react-hot-toast';
import { unparse } from 'papaparse';

// --- Componente do Modal de Confirmação ---
const ConfirmationModal = ({ groupName, onConfirm, onCancel, isPending }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-8 rounded-lg shadow-2xl max-w-md w-full border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Confirmar Sincronização</h3>
                <p className="text-gray-300 mb-6">
                    Você tem certeza que deseja iniciar a sincronização de todos os membros do grupo <strong className="text-blue-400">{groupName}</strong>? 
                    Esta ação pode levar alguns minutos e irá consumir recursos do servidor.
                </p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} disabled={isPending} className="px-6 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 disabled:opacity-50">
                        Cancelar
                    </button>
                    <button onClick={onConfirm} disabled={isPending} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 inline-flex items-center">
                        {isPending && <FaSpinner className="animate-spin mr-2" />}
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default function AdminRoboClient() {
    const { setHeaderContent, selectedClientId } = useContext(AppContext);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const supabase = createClientComponentClient();
    const formRef = useRef(null);
    const [isPending, startTransition] = useTransition();
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [groupToImport, setGroupToImport] = useState(null);

    useEffect(() => { setHeaderContent({ title: 'Administração do Robô Monitor' }); }, [setHeaderContent]);
    useEffect(() => {
        const fetchGroups = async () => {
            setLoading(true);
            let query = supabase.from('grupos_monitorados').select('*');
            if (selectedClientId && selectedClientId !== 'all') {
                query = query.eq('client_id', selectedClientId);
            }
            const { data, error } = await query.order('nome_do_grupo', { ascending: true });
            if (error) { console.error("Erro ao buscar grupos:", error); setGroups([]); } 
            else { setGroups(data || []); }
            setLoading(false);
        };
        if (selectedClientId) { fetchGroups(); } else { setGroups([]); setLoading(false); }
    }, [selectedClientId, supabase]);

    const handleFormAction = (action, formData) => {
        startTransition(async () => {
            let result;
            if (action === 'add') {
                result = await addGroupAction(formData, selectedClientId);
            } else if (action === 'delete') {
                result = await deleteGroupAction(formData);
            }
            if (result?.error) { toast.error(`Falha: ${result.error}`); } 
            else {
                toast.success(`Operação realizada com sucesso!`);
                if (action === 'add' && formRef.current) { formRef.current.reset(); }
            }
        });
    };
    
    const handleConfirmImport = () => {
        if (!groupToImport) return;
        startTransition(async () => {
            setShowConfirmModal(false);
            toast.loading('Enviando comando de importação...');
            const result = await importGroupMembersAction(groupToImport.nome_do_grupo, groupToImport.client_id);
            toast.dismiss();
            if (result?.error) { toast.error(`Falha: ${result.error}`); } 
            else { toast.success(result.message || 'Comando enviado com sucesso!'); }
            setGroupToImport(null);
        });
    };

    const openConfirmationModal = (group) => {
        setGroupToImport(group);
        setShowConfirmModal(true);
    };

    const handleExportCSV = async () => {
        if (!selectedClientId || selectedClientId === 'all') {
            toast.error("Por favor, selecione um cliente específico para exportar os dados.");
            return;
        }
        setIsExporting(true);
        toast.loading('Buscando dados para exportação...');
        try {
            const { data: entradas, error } = await supabase
                .from('entradas_grupo')
                .select('telefone, created_at, processado')
                .eq('client_id', selectedClientId)
                .order('created_at', { ascending: false });
            
            toast.dismiss(); // Fecha o toast de carregamento ANTES de processar
            
            if (error) {
                console.error("Supabase error fetching entradas_grupo:", error); // Log específico
                throw new Error(`Erro do Supabase: ${error.message}`);
            }

            if (!entradas || entradas.length === 0) {
                toast.error('Nenhum dado de entrada encontrado para este cliente.');
                setIsExporting(false); 
                return;
            }

            const csvData = unparse(entradas, { header: true, quotes: true });
            const blob = new Blob([`\uFEFF${csvData}`], { type: 'text/csv;charset=utf-8;' }); // Adiciona BOM para Excel
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `entradas_grupo_${selectedClientId}_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`${entradas.length} registros exportados com sucesso!`);
        } catch (error) {
            toast.dismiss();
            console.error("Erro ao exportar CSV:", error);
            toast.error(`Falha na exportação: ${error.message}`);
        } finally {
            setIsExporting(false);
        }
    };
    
    return (
        <div className="space-y-8">
            <Toaster position="top-center" toastOptions={{
                style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' },
                success: { iconTheme: { primary: '#22c55e', secondary: '#1e293b' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#1e293b' } },
            }} />

            {showConfirmModal && groupToImport && (
                <ConfirmationModal 
                    groupName={groupToImport.nome_do_grupo}
                    onConfirm={handleConfirmImport}
                    onCancel={() => setShowConfirmModal(false)}
                    isPending={isPending}
                />
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-100">Administração do Robô Monitor</h1>
                <button 
                    onClick={handleExportCSV}
                    disabled={isExporting || selectedClientId === 'all'}
                    className="inline-flex items-center justify-center px-5 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={selectedClientId === 'all' ? "Selecione um cliente para exportar" : "Exportar dados de entrada para CSV"}
                >
                    {isExporting ? <FaSpinner className="animate-spin mr-2" /> : <FaDownload className="mr-2" />}
                    Exportar Entradas (CSV)
                </button>
            </div>

            <div className="bg-slate-900 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">Grupos Monitorados</h2>
                <p className="text-sm text-gray-400 mb-6">Esta é a lista de grupos que o robô está vigiando. Adicione ou remova nomes de grupos para controlar o monitoramento em tempo real.</p>
                <form ref={formRef} action={(formData) => handleFormAction('add', formData)} className="flex items-center gap-4 mb-8">
                    <input
                        type="text"
                        name="groupName"
                        className="flex-grow p-2 border border-gray-600 rounded-md bg-gray-700 text-gray-100 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={selectedClientId === 'all' ? "Selecione um cliente para adicionar um grupo" : "Nome exato do grupo no WhatsApp"}
                        required
                        disabled={selectedClientId === 'all' || isPending}
                    />
                    <button 
                        type="submit"
                        className="inline-flex items-center justify-center px-5 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={selectedClientId === 'all' || isPending}
                    >
                        {isPending ? <FaSpinner className="animate-spin mr-2" /> : <FaPlus className="mr-2" />}
                        Adicionar Grupo
                    </button>
                </form>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-400 uppercase bg-gray-700">
                            <tr>
                                <th className="px-4 py-3">Nome do Grupo</th>
                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {loading ? (
                                <tr><td colSpan="2" className="text-center py-10"><FaSpinner className="animate-spin text-gray-500 mx-auto text-2xl" /></td></tr>
                            ) : groups && groups.length > 0 ? (
                                groups.map((group) => (
                                    <tr key={group.id}>
                                        <td className="px-4 py-3 font-medium text-gray-200">{group.nome_do_grupo}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-4">
                                                <button onClick={() => openConfirmationModal(group)} disabled={isPending} className="text-blue-400 hover:text-blue-300 disabled:opacity-50" title="Sincronizar membros atuais do grupo">
                                                    <FaSync />
                                                </button>
                                                <form action={(formData) => handleFormAction('delete', formData)}>
                                                    <input type="hidden" name="groupId" value={group.id} />
                                                    <button type="submit" disabled={isPending} className="text-red-500 hover:text-red-400 disabled:opacity-50" title="Remover grupo do monitoramento">
                                                        <FaTrash />
                                                    </button>
                                                </form>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : ( 
                                <tr><td colSpan="2" className="text-center py-10 text-gray-500">{selectedClientId === 'all' ? "Selecione um cliente para ver os grupos." : "Nenhum grupo configurado para este cliente."}</td></tr> 
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* O bloco de Entradas Registradas foi removido, pois o botão foi movido para o topo */}
        </div>
    );
}