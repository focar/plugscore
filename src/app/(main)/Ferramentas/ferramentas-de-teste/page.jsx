'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '@/context/AppContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast, { Toaster } from 'react-hot-toast';

// --- ÍCONES ---
const PlayIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>);
const TrashIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>);
const RotateCwIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>);
const AlertTriangleIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>);

export default function FerramentasDeTestePage() {
    const { setHeaderContent, selectedClientId, userProfile } = useContext(AppContext);
    const supabase = createClientComponentClient();
    const [lancamentos, setLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingStatus, setProcessingStatus] = useState({}); // { [launchCode]: { message: '...', type: 'success' | 'error' | 'info' } }
    const [isProcessing, setIsProcessing] = useState(false); // Bloqueio global para qualquer operação

    const fetchLancamentos = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('lancamentos').select('id, nome, codigo');

        if (selectedClientId && selectedClientId !== 'all') {
            query = query.eq('cliente_id', selectedClientId);
        }
        
        query = query.order('codigo', { ascending: true });

        const { data, error } = await query;
        
        if (error) {
            toast.error('Erro ao carregar lançamentos: ' + error.message);
        } else {
            setLancamentos(data || []);
        }
        setLoading(false);
    }, [supabase, selectedClientId]);

    useEffect(() => {
        if (userProfile?.role === 'admin') {
            setHeaderContent({ title: 'Ferramentas de Teste' });
            fetchLancamentos();
        }
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, fetchLancamentos, userProfile]);

    // Função auxiliar para chamar RPCs e tratar erros
    const runRpc = async (launchCode, functionName) => {
        const { data, error } = await supabase.rpc(functionName, { p_launch_code: launchCode });
        if (error) {
            throw new Error(`Erro em ${functionName}: ${error.message}`);
        }
        return data;
    };

    // --- NOVA LÓGICA ORQUESTRADA ---
    const handleProcessCheckins = async (launchCode) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'Iniciando reprocessamento...', type: 'info' } }));

        try {
            // Passo 1: Limpar scores antigos
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'A processar (Passo 1/3: Limpando scores)...', type: 'info' } }));
            await runRpc(launchCode, 'reset_scores_e_respostas');
            
            // Passo 2: Reiniciar status dos check-ins
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'A processar (Passo 2/3: Reiniciando status)...', type: 'info' } }));
            await runRpc(launchCode, 'reset_status_checkins');

            // Passo 3: Reprocessar
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'A processar (Passo 3/3: Calculando scores)...', type: 'info' } }));
            const finalMessage = await runRpc(launchCode, 'transformar_checkins');
            
            // Sucesso
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: finalMessage, type: 'success' } }));

        } catch (err) {
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: err.message, type: 'error' } }));
        } finally {
            setIsProcessing(false);
        }
    };
    
    // --- FUNÇÕES SEPARADAS PARA CADA AÇÃO ---
    const handleClearScores = async (launchCode) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'A limpar scores...', type: 'info' } }));
        try {
            const message = await runRpc(launchCode, 'reset_scores_e_respostas');
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: message, type: 'success' } }));
        } catch (err) {
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: err.message, type: 'error' } }));
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleResetStatus = async (launchCode) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'A reiniciar status...', type: 'info' } }));
        try {
            const message = await runRpc(launchCode, 'reset_status_checkins');
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: message, type: 'success' } }));
        } catch (err) {
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: err.message, type: 'error' } }));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteAllData = async (launchCode) => {
        if (isProcessing) return;
        
        const confirm1 = window.prompt(`AÇÃO DESTRUTIVA!\n\nVocê está prestes a apagar TODOS os dados (leads, respostas, check-ins, inscrições) do lançamento "${launchCode}".\n\nPara confirmar, digite o código do lançamento abaixo:`);
        if (confirm1 !== launchCode) {
            toast.error('Ação cancelada. O código digitado não corresponde.');
            return;
        }

        setIsProcessing(true);
        setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: `A apagar TUDO de ${launchCode}...`, type: 'info' } }));
        try {
            const message = await runRpc(launchCode, 'limpar_dados_lancamento');
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: message, type: 'success' } }));
            fetchLancamentos(); // Recarrega a lista após a exclusão
        } catch (err) {
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: err.message, type: 'error' } }));
        } finally {
            setIsProcessing(false);
        }
    };

    if (userProfile?.role !== 'admin') {
        return <div className="p-6 text-red-500">Acesso negado. Esta área é apenas para administradores.</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <Toaster position="top-center" />
            <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Use estas ferramentas para limpar, processar ou apagar completamente os dados de teste de um lançamento específico.</p>
            </div>

            {loading ? <p className="text-center py-8 dark:text-gray-300">A carregar lançamentos...</p> :
                lancamentos.length === 0 ? <p className="text-center py-8 text-gray-500">Nenhum lançamento encontrado para o cliente selecionado.</p> :
                (
                    <div className="space-y-4">
                        {lancamentos.map(launch => (
                            <div key={launch.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
                                
                                {processingStatus[launch.codigo] && (
                                    <div className={`mb-3 p-3 text-sm rounded-md ${
                                        processingStatus[launch.codigo].type === 'error' ? 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200' :
                                        (processingStatus[launch.codigo].type === 'info' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200' : 
                                        'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200')
                                    }`}>
                                        {processingStatus[launch.codigo].message}
                                    </div>
                                )}

                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div>
                                        <h3 className="font-bold text-lg font-mono text-gray-800 dark:text-gray-200">{launch.codigo}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{launch.nome}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                                        <button disabled={isProcessing} onClick={() => handleProcessCheckins(launch.codigo)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait"><PlayIcon /> Processar Check-ins</button>
                                        <button disabled={isProcessing} onClick={() => handleClearScores(launch.codigo)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-wait"><TrashIcon /> Limpar Scores</button>
                                        <button disabled={isProcessing} onClick={() => handleResetStatus(launch.codigo)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-black bg-yellow-400 rounded-md hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-wait"><RotateCwIcon /> Reiniciar Status</button>
                                        <button disabled={isProcessing} onClick={() => handleDeleteAllData(launch.codigo)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-purple-700 rounded-md hover:bg-purple-800 disabled:opacity-50 disabled:cursor-wait"><AlertTriangleIcon /> Apagar TUDO</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
}

