// F:\plugscore\src\app\(main)\Ferramentas\ferramentas-de-teste\page.jsx
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
const EraserIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21H7Z"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>);

export default function FerramentasDeTestePage() {
    const { setHeaderContent, selectedClientId, userProfile } = useContext(AppContext);
    const supabase = createClientComponentClient();
    const [lancamentos, setLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Estado para mensagens individuais de cada card
    const [processingStatus, setProcessingStatus] = useState({}); 
    // Bloqueio global para evitar cliques simultâneos
    const [isProcessing, setIsProcessing] = useState(false); 

    // --- CARREGAMENTO DE DADOS ---
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

    // --- HELPER GENÉRICO PARA RPC ---
    const runRpc = async (launchCode, functionName) => {
        const { data, error } = await supabase.rpc(functionName, { p_launch_code: launchCode });
        if (error) throw new Error(`Erro em ${functionName}: ${error.message}`);
        return data;
    };

    // --- HELPER GENÉRICO PARA GERENCIAR ESTADO VISUAL ---
    // Esta função evita repetir o código de try/catch/loading para cada botão
    const executeOperation = async (launchCode, startMessage, operationFn) => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        setProcessingStatus(prev => ({ 
            ...prev, 
            [launchCode]: { message: startMessage, type: 'info' } 
        }));

        try {
            // Executa a função passada como argumento
            const resultMessage = await operationFn();
            
            setProcessingStatus(prev => ({ 
                ...prev, 
                [launchCode]: { message: resultMessage, type: 'success' } 
            }));
            
            // Se foi uma exclusão total, recarrega a lista
            if (startMessage.includes("Apagando TUDO")) {
                fetchLancamentos();
            }

        } catch (err) {
            setProcessingStatus(prev => ({ 
                ...prev, 
                [launchCode]: { message: err.message, type: 'error' } 
            }));
        } finally {
            setIsProcessing(false);
        }
    };

    // --- AÇÕES DOS BOTÕES ---

    // 1. Processamento Completo (3 Passos)
    const handleProcessCheckins = (launchCode) => {
        executeOperation(launchCode, 'Iniciando reprocessamento...', async () => {
            // Passo 1
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'Passo 1/3: Limpando scores...', type: 'info' } }));
            await runRpc(launchCode, 'reset_scores_e_respostas');
            
            // Passo 2
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'Passo 2/3: Reiniciando status...', type: 'info' } }));
            await runRpc(launchCode, 'reset_status_checkins');

            // Passo 3
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'Passo 3/3: Calculando scores...', type: 'info' } }));
            return await runRpc(launchCode, 'transformar_checkins');
        });
    };

    // 2. Limpar Scores (Simples)
    const handleClearScores = (launchCode) => {
        executeOperation(launchCode, 'Limpando scores...', async () => {
            return await runRpc(launchCode, 'reset_scores_e_respostas');
        });
    };
    
    // 3. Reiniciar Status (Simples)
    const handleResetStatus = (launchCode) => {
        executeOperation(launchCode, 'Reiniciando status...', async () => {
            return await runRpc(launchCode, 'reset_status_checkins');
        });
    };

    // 4. Limpar Compradores (Com Confirmação)
    const handleClearBuyers = (launchCode) => {
        const confirm = window.prompt(`LIMPEZA DE COMPRADORES!\n\nVocê vai remover o status 'comprador' dos leads do lançamento "${launchCode}".\n\nDigite o código do lançamento para confirmar:`);
        if (confirm !== launchCode) return toast.error('Cancelado. Código incorreto.');

        executeOperation(launchCode, 'Limpando compradores...', async () => {
            return await runRpc(launchCode, 'limpar_dados_compradores');
        });
    };

    // 5. Apagar TUDO (Com Confirmação Forte)
    const handleDeleteAllData = (launchCode) => {
        const confirm = window.prompt(`⚠️ AÇÃO DESTRUTIVA! ⚠️\n\nVocê vai apagar TUDO (Leads, Respostas, Check-ins) do lançamento "${launchCode}".\nIsso não pode ser desfeito.\n\nDigite o código do lançamento para confirmar:`);
        if (confirm !== launchCode) return toast.error('Cancelado. Código incorreto.');

        executeOperation(launchCode, 'Apagando TUDO...', async () => {
            return await runRpc(launchCode, 'limpar_dados_lancamento');
        });
    };

    // --- RENDER ---
    if (userProfile?.role !== 'admin') {
        return <div className="p-6 text-red-500 font-bold">Acesso negado. Esta área é restrita.</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <Toaster position="top-center" />
            
            {/* Cabeçalho de Instrução */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                <h2 className="text-blue-800 dark:text-blue-200 font-bold mb-1">Painel Operacional</h2>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                    Use estas ferramentas para manutenção de lançamentos. Cuidado com as ações destrutivas (botões Roxo e Laranja).
                </p>
            </div>

            {loading ? (
                <div className="flex justify-center py-10"><span className="animate-pulse text-gray-500">Carregando dados...</span></div>
            ) : lancamentos.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Nenhum lançamento encontrado.</p>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {lancamentos.map(launch => (
                        <div key={launch.id} className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg p-5">
                            
                            {/* Área de Status da Ação */}
                            {processingStatus[launch.codigo] && (
                                <div className={`mb-4 p-3 text-sm rounded-md flex items-center gap-2 border ${
                                    processingStatus[launch.codigo].type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                                    processingStatus[launch.codigo].type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-700' : 
                                    'bg-green-50 border-green-200 text-green-700'
                                }`}>
                                    {processingStatus[launch.codigo].type === 'info' && <span className="animate-spin">⏳</span>}
                                    {processingStatus[launch.codigo].message}
                                </div>
                            )}

                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                {/* Informações do Lançamento */}
                                <div className="min-w-[200px]">
                                    <h3 className="font-bold text-xl font-mono text-gray-800 dark:text-gray-100 tracking-tight">{launch.codigo}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{launch.nome}</p>
                                </div>

                                {/* Barra de Ferramentas */}
                                <div className="flex flex-wrap gap-2 items-center">
                                    <div className="flex gap-2 mr-4 pr-4 border-r border-gray-200 dark:border-gray-700">
                                        <button disabled={isProcessing} onClick={() => handleProcessCheckins(launch.codigo)} 
                                            className="btn-tool bg-green-600 hover:bg-green-700 text-white">
                                            <PlayIcon /> Processar Check-ins
                                        </button>
                                        <button disabled={isProcessing} onClick={() => handleResetStatus(launch.codigo)} 
                                            className="btn-tool bg-yellow-500 hover:bg-yellow-600 text-white">
                                            <RotateCwIcon /> Reiniciar Status
                                        </button>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button disabled={isProcessing} onClick={() => handleClearScores(launch.codigo)} 
                                            className="btn-tool bg-gray-600 hover:bg-gray-700 text-white">
                                            <TrashIcon /> Limpar Scores
                                        </button>
                                        <button disabled={isProcessing} onClick={() => handleClearBuyers(launch.codigo)} 
                                            className="btn-tool bg-orange-600 hover:bg-orange-700 text-white">
                                            <EraserIcon /> Limpar Compradores
                                        </button>
                                        <button disabled={isProcessing} onClick={() => handleDeleteAllData(launch.codigo)} 
                                            className="btn-tool bg-purple-700 hover:bg-purple-800 text-white">
                                            <AlertTriangleIcon /> Apagar TUDO
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Estilos locais para botões limpos */}
            <style jsx>{`
                .btn-tool {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    border-radius: 0.375rem;
                    transition: all 0.2s;
                }
                .btn-tool:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
            `}</style>
        </div>
    );
}