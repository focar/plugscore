// src/app/(main)/Ferramentas/ferramentas-de-teste/page.jsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';

// --- ÍCONES ---
const RefreshCwIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M3 21v-5h5" /></svg>);
const Trash2Icon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>);
const PlayIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polygon points="5 3 19 12 5 21 5 3" /></svg>);
// --- ALTERAÇÃO: Novo ícone para o botão de apagar tudo ---
const AlertTriangleIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>);


export default function FerramentasDeTestePage() {
    const { setHeaderContent } = useContext(AppContext);
    const supabase = createClientComponentClient();
    const [lancamentos, setLancamentos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState({ launchId: null, type: null });
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        setHeaderContent({ title: 'Ferramentas de Teste' });
        fetchLancamentos();
        return () => setHeaderContent(null);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    async function fetchLancamentos() {
        setLoading(true);
        const { data, error } = await supabase.from('lancamentos').select('id, nome, codigo');
        if (error) {
            setFeedback({ type: 'error', message: 'Erro ao carregar lançamentos: ' + error.message });
        } else {
            setLancamentos(data || []);
        }
        setLoading(false);
    }

    // --- ALTERAÇÃO: Adicionada a lógica para a nova ação 'delete_all_data' ---
    const handleAction = async (launchCode, actionType) => {
        setFeedback({ type: '', message: '' });
        
        if (actionType === 'delete_all_data') {
            const confirm1 = window.prompt(`AÇÃO DESTRUTIVA!\n\nVocê está prestes a apagar TODOS os dados (leads, respostas, check-ins, inscrições) do lançamento "${launchCode}".\n\nPara confirmar, digite o código do lançamento abaixo:`);
            if (confirm1 !== launchCode) {
                setFeedback({ type: 'error', message: 'Ação cancelada. O código digitado não corresponde.' });
                return;
            }
        }

        setProcessing({ launchId: launchCode, type: actionType });

        let functionName = '';
        if (actionType === 'reset_scores') {
            functionName = 'reset_scores_e_respostas';
        } else if (actionType === 'reset_status') {
            functionName = 'reset_status_checkins';
        } else if (actionType === 'process_checkins') {
            functionName = 'transformar_checkins';
        } else if (actionType === 'delete_all_data') {
            functionName = 'limpar_dados_lancamento';
        }

        if (!functionName) {
            setFeedback({ type: 'error', message: 'Ação desconhecida.' });
            setProcessing({ launchId: null, type: null });
            return;
        }
        
        const { data, error } = await supabase.rpc(functionName, { p_launch_code: launchCode });

        if (error) {
            setFeedback({ type: 'error', message: `Erro ao executar ${functionName}: ${error.message}` });
        } else {
            setFeedback({ type: 'success', message: data });
        }
        setProcessing({ launchId: null, type: null });
    };

    if (loading) {
        return <div className="text-center p-8">A carregar lançamentos...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Use estas ferramentas para limpar, processar ou apagar completamente os dados de teste de um lançamento específico.
            </p>

            {feedback.message && (
                <div className={`mb-4 p-4 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {feedback.message}
                </div>
            )}

            <div className="space-y-4">
                {lancamentos.map((launch) => (
                    <div key={launch.id} className="border rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 dark:border-gray-700">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{launch.nome}</h3>
                            <p className="text-sm font-mono text-gray-500 dark:text-gray-400">{launch.codigo}</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-4">
                            <button
                                onClick={() => handleAction(launch.codigo, 'process_checkins')}
                                disabled={processing.launchId === launch.codigo}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-wait"
                            >
                                <PlayIcon />
                                {processing.launchId === launch.codigo && processing.type === 'process_checkins' ? 'A processar...' : 'Processar Check-ins'}
                            </button>
                            <button
                                onClick={() => handleAction(launch.codigo, 'reset_scores')}
                                disabled={processing.launchId === launch.codigo}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-wait"
                            >
                                <Trash2Icon />
                                {processing.launchId === launch.codigo && processing.type === 'reset_scores' ? 'A limpar...' : 'Limpar Scores'}
                            </button>
                            <button
                                onClick={() => handleAction(launch.codigo, 'reset_status')}
                                disabled={processing.launchId === launch.codigo}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white font-semibold rounded-md hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-wait"
                            >
                                <RefreshCwIcon />
                                {processing.launchId === launch.codigo && processing.type === 'reset_status' ? 'A reiniciar...' : 'Reiniciar Status'}
                            </button>
                            {/* --- ALTERAÇÃO: Novo botão de Limpeza Profunda --- */}
                            <button
                                onClick={() => handleAction(launch.codigo, 'delete_all_data')}
                                disabled={processing.launchId === launch.codigo}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-800 text-white font-semibold rounded-md hover:bg-purple-900 disabled:opacity-50 disabled:cursor-wait"
                            >
                                <AlertTriangleIcon />
                                {processing.launchId === launch.codigo && processing.type === 'delete_all_data' ? 'A apagar TUDO...' : 'Apagar TUDO do Lançamento'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}