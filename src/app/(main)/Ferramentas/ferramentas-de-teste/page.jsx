// src/app/(main)/Ferramentas/ferramentas-de-teste/page.jsx
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
    const [processingStatus, setProcessingStatus] = useState({}); 
    const [isProcessing, setIsProcessing] = useState(false); 

    const fetchLancamentos = useCallback(async () => {
        setLoading(true);
        let query = supabase.from('lancamentos').select('id, nome, codigo, modalidade');

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

    const runRpc = async (launchCode, functionName) => {
        const { data, error } = await supabase.rpc(functionName, { p_launch_code: launchCode });
        if (error) throw new Error(`Erro em ${functionName}: ${error.message}`);
        return data;
    };

    // --- FUNÇÕES DE AÇÃO ---

    // 1. CLÁSSICO: Processar Check-ins
    const handleProcessCheckins = async (launchCode) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'Reprocessando Clássico...', type: 'info' } }));
        try {
            await runRpc(launchCode, 'reset_scores_e_respostas');
            await runRpc(launchCode, 'reset_status_checkins');
            const finalMessage = await runRpc(launchCode, 'transformar_checkins');
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: finalMessage, type: 'success' } }));
        } catch (err) {
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: err.message, type: 'error' } }));
        } finally {
            setIsProcessing(false);
        }
    };

    // 2. PERPÉTUO: Resetar (Reprocessar)
    const handleResetPerpetuo = async (launchCode) => {
        if (isProcessing) return;
        setIsProcessing(true);
        setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: 'Resetando para reprocessar...', type: 'info' } }));
        try {
            // Chama a função de RESET que criaamos agora
            const msgReset = await runRpc(launchCode, 'resetar_processamento_perpetuo');
            
            // Opcional: Se quiser já rodar o processamento em seguida automaticamente:
            // await supabase.rpc('processar_carga_perpetuo', { p_limite: 1000 });
            // const msgFinal = "Resetado e Reprocessado com sucesso!";
            
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: msgReset, type: 'success' } }));
        } catch (err) {
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: err.message, type: 'error' } }));
        } finally {
            setIsProcessing(false);
        }
    };

    // 3. PERPÉTUO: Limpeza Total (Destrutiva)
    const handleCleanPerpetuo = async (launchCode) => {
        if (isProcessing) return;
        const confirm1 = window.prompt(`AÇÃO DESTRUTIVA!\nVai apagar TUDO (inclusive a planilha importada).\nDigite "${launchCode}" para confirmar:`);
        if (confirm1 !== launchCode) { toast.error('Cancelado.'); return; }
        
        setIsProcessing(true);
        setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: `Limpando tudo...`, type: 'info' } }));
        try {
            const message = await runRpc(launchCode, 'limpar_dados_perpetuo');
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: message, type: 'success' } }));
        } catch (err) {
            setProcessingStatus(prev => ({ ...prev, [launchCode]: { message: err.message, type: 'error' } }));
        } finally {
            setIsProcessing(false);
        }
    };

    // Funções auxiliares do Clássico (Mantidas)
    const handleClearScores = async (c) => { /* ... igual ... */ }; 
    const handleResetStatus = async (c) => { /* ... igual ... */ };
    const handleClearBuyers = async (c) => { /* ... igual ... */ };
    const handleDeleteAllData = async (c) => { /* ... igual ... */ };

    if (userProfile?.role !== 'admin') return <div className="p-6 text-red-500">Acesso negado.</div>;

    return (
        <div className="p-6 space-y-6">
            <Toaster position="top-center" />
            <div className="bg-gray-100 dark:bg-gray-900/50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400">Ferramentas de Gestão de Dados de Teste.</p>
            </div>

            {loading ? <p className="text-center py-8 dark:text-gray-300">Carregando...</p> :
                <div className="space-y-4">
                    {lancamentos.map(launch => (
                        <div key={launch.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
                            
                            {processingStatus[launch.codigo] && (
                                <div className={`mb-3 p-3 text-sm rounded-md ${
                                    processingStatus[launch.codigo].type === 'error' ? 'bg-red-100 text-red-800' :
                                    'bg-green-100 text-green-800'
                                }`}>
                                    {processingStatus[launch.codigo].message}
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-lg font-mono text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                        {launch.codigo}
                                        {launch.modalidade === 'PERPETUO' && <span className="text-[10px] bg-cyan-900 text-cyan-200 px-1 py-0.5 rounded uppercase border border-cyan-700">Perpétuo</span>}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{launch.nome}</p>
                                </div>
                                
                                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
                                    
                                    {/* --- BOTÕES PERPÉTUO --- */}
                                    {launch.modalidade === 'PERPETUO' ? (
                                        <>
                                            {/* Botão de Reprocessar (Seguro) */}
                                            <button disabled={isProcessing} onClick={() => handleResetPerpetuo(launch.codigo)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait">
                                                <RotateCwIcon /> Reprocessar
                                            </button>
                                            
                                            {/* Botão de Limpar Tudo (Perigoso) */}
                                            <button disabled={isProcessing} onClick={() => handleCleanPerpetuo(launch.codigo)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-wait">
                                                <TrashIcon /> Limpar TUDO
                                            </button>
                                        </>
                                    ) : (
                                        // --- BOTÕES CLÁSSICO (Mantidos) ---
                                        <button disabled={isProcessing} onClick={() => handleProcessCheckins(launch.codigo)} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait">
                                            <PlayIcon /> Processar
                                        </button>
                                        // ... outros botões clássicos ...
                                    )}

                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            }
        </div>
    );
}