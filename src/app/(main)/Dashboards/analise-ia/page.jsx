//F:\plugscore\src\app\(main)\Dashboards\analise-ia\page.jsx
'use client';

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AppContext } from '@/context/AppContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import toast, { Toaster } from 'react-hot-toast';
import { Sparkles, BrainCircuit, Search, FileText, BarChart2 } from 'lucide-react';

// --- Componentes da UI ---
const Select = React.forwardRef((props, ref) => (<select {...props} ref={ref} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" />)); Select.displayName = 'Select';
const ResultCard = ({ title, icon: Icon, children }) => (<div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg p-6 h-full"><div className="flex items-center gap-3 mb-4"><Icon className="text-blue-500" size={24} /><h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3></div><div className="text-gray-600 dark:text-gray-300 space-y-4">{children}</div></div>);
const LoadingSpinner = () => (<div className="flex flex-col items-center justify-center text-center p-10 bg-gray-50 dark:bg-gray-800/50 rounded-lg"><BrainCircuit className="text-blue-500 animate-pulse" size={48} /><p className="mt-4 text-lg font-semibold text-gray-700 dark:text-gray-200">A IA está a analisar as respostas...</p><p className="text-sm text-gray-500 dark:text-gray-400">Isto pode levar alguns segundos, por favor aguarde.</p></div>);
const SentimentDisplay = ({ sentiment }) => { const config = { 'Positivo': { color: 'text-green-500', text: 'O sentimento geral é positivo.' }, 'Negativo': { color: 'text-red-500', text: 'O sentimento geral é negativo.' }, 'Neutro/Misto': { color: 'text-yellow-500', text: 'O sentimento geral é neutro ou misto.' }, }[sentiment] || { color: 'text-gray-500', text: 'Sentimento não determinado.' }; return <p className={`font-bold text-lg ${config.color}`}>{config.text}</p>; };

// --- PÁGINA PRINCIPAL ---
export default function AnaliseIAPage() {
    const { setHeaderContent, selectedClientId } = useContext(AppContext);
    const supabase = createClientComponentClient();
    const [lancamentos, setLancamentos] = useState([]);
    const [perguntas, setPerguntas] = useState([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState('');
    const [selectedQuestionId, setSelectedQuestionId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => { const fetchLancamentos = async () => { setIsLoadingLaunches(true); let query = supabase.from('lancamentos').select('id, nome, codigo, status'); if (selectedClientId && selectedClientId !== 'all') { query = query.eq('cliente_id', selectedClientId); } const { data, error } = await query.order('codigo', { ascending: true }); if (error) { toast.error('Erro ao buscar lançamentos.'); setLancamentos([]); } else { const sorted = [...(data || [])].sort((a, b) => { if (a.status === 'Em andamento' && b.status !== 'Em andamento') return -1; if (b.status === 'Em andamento' && a.status !== 'Em andamento') return 1; return (b.codigo || b.nome).localeCompare(a.codigo || a.nome); }); setLancamentos(sorted); if (sorted.length > 0) { const inProgress = sorted.find(l => l.status === 'Em andamento'); setSelectedLaunchId(inProgress ? inProgress.id : sorted[0].id); } else { setSelectedLaunchId(''); } } setIsLoadingLaunches(false); }; fetchLancamentos(); }, [supabase, selectedClientId]);
    useEffect(() => { const launchSelector = ( <select value={selectedLaunchId} onChange={e => { setSelectedLaunchId(e.target.value); setSelectedQuestionId(''); setAnalysisResult(null); }} disabled={isLoadingLaunches || lancamentos.length === 0} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2" > {isLoadingLaunches ? <option>A carregar...</option> : lancamentos.length > 0 ? lancamentos.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>) : <option>Nenhum lançamento</option>} </select> ); setHeaderContent({ title: 'Análise de Respostas com IA', controls: launchSelector }); return () => setHeaderContent({ title: '', controls: null }); }, [setHeaderContent, selectedLaunchId, lancamentos, isLoadingLaunches]);
    useEffect(() => { const fetchPerguntas = async () => { if (!selectedLaunchId) { setPerguntas([]); return; } let query = supabase.from('perguntas').select('id, texto').eq('classe', 'livre'); if (selectedClientId && selectedClientId !== 'all') { query = query.or(`cliente_id.eq.${selectedClientId},cliente_id.is.null`); } const { data, error } = await query.order('texto'); if (error) { toast.error('Erro ao buscar perguntas de texto livre.'); } else { setPerguntas(data || []); } }; fetchPerguntas(); }, [selectedLaunchId, selectedClientId, supabase]);

    const handleAnalyze = useCallback(async () => {
        if (!selectedLaunchId || !selectedQuestionId) {
            toast.error('Por favor, selecione uma pergunta para analisar.');
            return;
        }
        setIsLoading(true);
        setAnalysisResult(null);
        setError(null);
        
        const questionObject = perguntas.find(p => p.id === selectedQuestionId);

        try {
            const { data, error } = await supabase.functions.invoke('analisar-respostas-livres', {
                body: {
                    launch_id: selectedLaunchId,
                    question_id: selectedQuestionId,
                    question_text: questionObject?.texto || ''
                },
            });

            if (error) throw error;

            setAnalysisResult(data);
            toast.success('Análise concluída com sucesso!');

        } catch (err) {
            const errorMessage = err.message || 'Ocorreu um erro desconhecido.';
            setError(errorMessage);
            toast.error(`Erro na análise: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLaunchId, selectedQuestionId, supabase, perguntas]);

    return (
        <div className="p-6 space-y-6">
            <Toaster position="top-center" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">1. Selecione a Pergunta</label>
                    <Select value={selectedQuestionId} onChange={(e) => setSelectedQuestionId(e.target.value)} disabled={!selectedLaunchId || perguntas.length === 0}>
                        <option value="" disabled>Escolha uma pergunta...</option>
                        {perguntas.map(p => <option key={p.id} value={p.id}>{p.texto}</option>)}
                    </Select>
                </div>
                <div className="flex items-end">
                    <button onClick={handleAnalyze} disabled={isLoading || !selectedQuestionId} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-wait">
                        <Sparkles size={18} />
                        {isLoading ? 'A analisar...' : 'Analisar com IA'}
                    </button>
                </div>
            </div>
            {isLoading && <LoadingSpinner />}
            {error && !isLoading && ( <div className="text-center p-10 bg-red-50 dark:bg-red-900/20 rounded-lg"> <p className="text-lg font-semibold text-red-700 dark:text-red-300">Ocorreu um Erro</p> <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p> </div> )}
            {analysisResult && !isLoading && ( <div className="space-y-6"> <ResultCard title="Palavras-Chave Frequentes" icon={Search}><div className="flex flex-wrap gap-2">{analysisResult.palavras_frequentes.map((palavra, index) => ( <span key={index} className="bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-base font-medium px-3 py-1 rounded-full">{palavra}</span> ))}</div></ResultCard> <ResultCard title="Sentimento Geral" icon={BarChart2}><SentimentDisplay sentiment={analysisResult.sentimento_geral} /></ResultCard> <ResultCard title="Resumo Executivo" icon={FileText}><div className="prose prose-base dark:prose-invert max-w-none">{(analysisResult.resumo_executivo || '').split('\n').map((paragraph, index) => ( <p key={index}>{paragraph}</p> ))}</div></ResultCard> </div> )}
        </div>
    );
}