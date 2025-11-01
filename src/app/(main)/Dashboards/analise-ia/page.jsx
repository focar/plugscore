'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '@/context/AppContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast, { Toaster } from 'react-hot-toast';
import { Sparkles, BrainCircuit, Search, FileText, BarChart2, Loader2, X } from 'lucide-react'; // Adicionado Loader2 e X

// --- Componentes da UI ---
// ForwardRef mantido por segurança
const Select = React.forwardRef((props, ref) => (
    <select {...props} ref={ref} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />
));
Select.displayName = 'Select';

const ResultCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 sm:p-6 h-full overflow-hidden">
        <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Icon className="text-blue-500 h-5 w-5 sm:h-6 sm:w-6" />
            <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
        </div>
        <div className="text-gray-600 dark:text-gray-300 space-y-3 sm:space-y-4 text-sm sm:text-base">
            {children}
        </div>
    </div>
);

// Loading Spinner com Loader2
const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center text-center p-6 sm:p-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <Loader2 className="text-blue-500 animate-spin h-10 w-10 sm:h-12 sm:w-12" />
        <p className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">A IA está a analisar...</p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Isto pode levar alguns segundos.</p>
    </div>
);

// SentimentDisplay com cores ajustadas
const SentimentDisplay = ({ sentiment }) => {
    const config = {
        'Positivo': { color: 'text-green-500 dark:text-green-400', text: 'O sentimento geral é positivo.' },
        'Negativo': { color: 'text-red-500 dark:text-red-400', text: 'O sentimento geral é negativo.' },
        'Neutro/Misto': { color: 'text-yellow-500 dark:text-yellow-400', text: 'O sentimento geral é neutro ou misto.' },
    }[sentiment] || { color: 'text-gray-500 dark:text-gray-400', text: 'Sentimento não determinado.' };
    return <p className={`font-bold text-base sm:text-lg ${config.color}`}>{config.text}</p>;
};

// --- PÁGINA PRINCIPAL ---
export default function AnaliseIAPage() {
    const { userProfile, setHeaderContent, selectedClientId } = useContext(AppContext); // Adicionado userProfile
    const supabase = createClientComponentClient();

    const [lancamentos, setLancamentos] = useState([]);
    const [perguntas, setPerguntas] = useState([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState('');
    const [selectedQuestionId, setSelectedQuestionId] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Loading da análise
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true); // Loading dos lançamentos
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);

    // --- CORREÇÃO: Efeito para buscar lançamentos (com trava) ---
    useEffect(() => {
        if (!userProfile) { // Precisa do userProfile
            setIsLoadingLaunches(false); setLancamentos([]); setSelectedLaunchId('');
            return;
        }

        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

        // Se "Todos os Clientes", limpa tudo e para
        if (isAllClients) {
            setLancamentos([]); setSelectedLaunchId(''); setIsLoadingLaunches(false);
            setPerguntas([]); setSelectedQuestionId(''); setAnalysisResult(null); setError(null); setIsLoading(false);
            return;
        }

        // Busca lançamentos para cliente específico
        const fetchLancamentos = async () => {
            setIsLoadingLaunches(true);
            setPerguntas([]); setSelectedQuestionId(''); setAnalysisResult(null); setError(null); setIsLoading(false); // Limpa estados dependentes

            try {
                // Ajuste a query se necessário
                const { data, error } = await supabase
                    .from('lancamentos')
                    .select('id, nome, codigo, status')
                    .eq('cliente_id', clientIdToSend)
                    .order('codigo', { ascending: true });

                if (error) throw error;

                // Ordena priorizando "Em andamento"
                const sorted = [...(data || [])].sort((a, b) => {
                    const aInProgress = a.status?.toLowerCase() === 'em andamento';
                    const bInProgress = b.status?.toLowerCase() === 'em andamento';
                    if (aInProgress && !bInProgress) return -1;
                    if (!aInProgress && bInProgress) return 1;
                    return (a.codigo || a.nome || '').localeCompare(b.codigo || b.nome || '');
                });

                setLancamentos(sorted);
                setSelectedLaunchId(''); // Não auto-seleciona

            } catch (err) {
                console.error("Erro ao buscar lançamentos:", err);
                toast.error('Erro ao buscar lançamentos.');
                setLancamentos([]);
            } finally {
                setIsLoadingLaunches(false);
            }
        };
        fetchLancamentos();
    }, [supabase, userProfile, selectedClientId]); // Dependências corretas

    // --- CORREÇÃO: Efeito para configurar o Header (com trava) ---
    useEffect(() => {
        const isClientSelected = !(userProfile?.role === 'admin' && selectedClientId === 'all');
        const isDisabled = isLoadingLaunches || !isClientSelected;

        const launchSelector = (
            <select
                value={selectedLaunchId}
                onChange={e => { setSelectedLaunchId(e.target.value); setSelectedQuestionId(''); setAnalysisResult(null); setError(null); }} // Reseta pergunta e resultado
                disabled={isDisabled}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2" // Removido max-w-xs
            >
                 {!isClientSelected ? (<option value="" disabled>Selecione um cliente</option>)
                 : isLoadingLaunches ? (<option value="" disabled>Carregando...</option>)
                 : lancamentos.length === 0 ? (<option value="" disabled>Nenhum lançamento</option>)
                 : (<option value="">Selecione um lançamento</option>)}
                {/* Mostra código ou nome */}
                {lancamentos.map(l => <option key={l.id} value={l.id}>{l.codigo || l.nome} ({l.status})</option>)}
            </select>
         );
        setHeaderContent({ title: 'Análise de Respostas com IA', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunchId, lancamentos, isLoadingLaunches, userProfile, selectedClientId]); // Dependências corretas

    // --- CORREÇÃO: Efeito para buscar perguntas (com trava) ---
    useEffect(() => {
        // Só busca se um lançamento for selecionado
        if (!selectedLaunchId) {
            setPerguntas([]);
            setSelectedQuestionId(''); // Reseta a pergunta selecionada também
            return;
        }

        const fetchPerguntas = async () => {
            try {
                let query = supabase.from('perguntas').select('id, texto').eq('classe', 'livre');
                 const clientIdToFilter = userProfile?.role !== 'admin' ? userProfile?.cliente_id : selectedClientId !== 'all' ? selectedClientId : null;
                 if (clientIdToFilter) {
                     query = query.or(`cliente_id.eq.${clientIdToFilter},cliente_id.is.null`);
                 }
                 // ** Possível filtro adicional por lançamento, se necessário **
                 // query = query.eq('launch_id', selectedLaunchId);

                const { data, error } = await query.order('texto');
                if (error) throw error;
                setPerguntas(data || []);
                setSelectedQuestionId(''); // Reseta seleção

            } catch(err) {
                 console.error("Erro ao buscar perguntas:", err);
                 toast.error('Erro ao buscar perguntas de texto livre.');
                 setPerguntas([]);
            }
        };
        fetchPerguntas();
    }, [selectedLaunchId, supabase, userProfile, selectedClientId]); // Dependências corretas

    // Função de Análise (só executa com launch e question)
    const handleAnalyze = useCallback(async () => {
        if (!selectedLaunchId || !selectedQuestionId) {
            toast.error('Por favor, selecione um lançamento e uma pergunta.');
            return;
        }
        setIsLoading(true); setAnalysisResult(null); setError(null);
        const questionObject = perguntas.find(p => p.id === selectedQuestionId);

        try {
            const { data, error: functionError } = await supabase.functions.invoke('analisar-respostas-livres', {
                body: { launch_id: selectedLaunchId, question_id: selectedQuestionId, question_text: questionObject?.texto || '' },
            });
            if (functionError) throw functionError;
            if (data && data.error) throw new Error(data.error); // Pega erro interno da função
            setAnalysisResult(data);
            toast.success('Análise concluída!');
        } catch (err) {
            console.error("Erro na análise via Edge Function:", err);
            const errorMessage = err.message || 'Ocorreu um erro desconhecido.';
            setError(errorMessage);
            toast.error(`Erro na análise: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLaunchId, selectedQuestionId, supabase, perguntas]);

     // Loading principal é apenas o dos lançamentos
    const isPageLoading = isLoadingLaunches;

    return (
        // Padding responsivo
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            <Toaster position="top-center" />

            {/* Seletor de Pergunta e Botão Analisar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">1. Selecione a Pergunta</label>
                    <Select
                        value={selectedQuestionId}
                        onChange={(e) => {setSelectedQuestionId(e.target.value); setAnalysisResult(null); setError(null);}}
                        disabled={isLoadingLaunches || !selectedLaunchId || perguntas.length === 0} // Desabilita corretamente
                    >
                        {/* Placeholders dinâmicos */}
                        <option value="" disabled>
                            {isLoadingLaunches ? "Carregando..." :
                             !selectedLaunchId ? "Selecione um lançamento" :
                             perguntas.length === 0 ? "Nenhuma pergunta livre" :
                             "Escolha uma pergunta..."}
                        </option>
                        {perguntas.map(p => <option key={p.id} value={p.id}>{p.texto}</option>)}
                    </Select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={handleAnalyze}
                        disabled={isLoading || !selectedQuestionId || !selectedLaunchId} // Desabilita corretamente
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-wait text-sm sm:text-base"
                    >
                         {/* Ícone com tamanho responsivo */}
                        <Sparkles className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                        {isLoading ? 'A analisar...' : 'Analisar com IA'}
                    </button>
                </div>
            </div>

            {/* Gerenciamento de estado de exibição */}
            {isLoading && <LoadingSpinner />}

            {!isLoading && error && (
                <div className="text-center p-6 sm:p-10 bg-red-50 dark:bg-red-900/20 rounded-lg">
                    <p className="text-base sm:text-lg font-semibold text-red-700 dark:text-red-300">Ocorreu um Erro</p>
                    <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
                </div>
            )}

            {!isLoading && !error && analysisResult && (
                <div className="space-y-4 sm:space-y-6">
                    <ResultCard title="Palavras-Chave Frequentes" icon={Search}>
                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {(analysisResult.palavras_frequentes || []).map((palavra, index) => (
                                <span key={index} className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs sm:text-sm font-medium px-2.5 py-1 rounded-full">{palavra}</span>
                            ))}
                            {(analysisResult.palavras_frequentes?.length || 0) === 0 && <p className="text-sm italic text-gray-500">Nenhuma palavra-chave significativa encontrada.</p>}
                        </div>
                    </ResultCard>
                    <ResultCard title="Sentimento Geral" icon={BarChart2}>
                        <SentimentDisplay sentiment={analysisResult.sentimento_geral} />
                    </ResultCard>
                    <ResultCard title="Resumo Executivo" icon={FileText}>
                        <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none break-words whitespace-pre-wrap">
                            {analysisResult.resumo_executivo || <p className="italic text-gray-500">Não foi possível gerar um resumo.</p>}
                        </div>
                    </ResultCard>
                </div>
            )}

            {/* Mensagem se nenhum lançamento estiver selecionado (e não for "Todos") */}
             {!selectedLaunchId && !isPageLoading && !(userProfile?.role === 'admin' && selectedClientId === 'all') && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Selecione um lançamento para analisar as perguntas.
                 </div>
             )}
             {/* Mensagem se for "Todos os Clientes" */}
              {!selectedLaunchId && !isPageLoading && (userProfile?.role === 'admin' && selectedClientId === 'all') && (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Selecione um cliente específico para usar a análise de IA.
                 </div>
             )}
             {/* Mensagem se lançamento selecionado, mas sem resultado e sem loading/erro */}
             {!isLoading && !error && !analysisResult && selectedLaunchId && (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Selecione uma pergunta e clique em "Analisar com IA".
                 </div>
             )}

        </div>
    );
}

