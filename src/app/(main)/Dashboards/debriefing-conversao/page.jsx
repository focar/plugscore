// Filename: app/main/Dashboards/debriefing-conversao/page.jsx
'use client';

// =================================================================
// /// --- CÓDIGO v29 (Corrige erro de "duplicate key") --- ///
// =================================================================

import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import dynamic from 'next/dynamic';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import {
    Download, X, BarChart2, PieChart, Database, ListChecks,
    Target, Star, UserCheck, Lightbulb, Users, Loader2, FileDown,
    MessageSquareText, Group, UserCircle,
} from 'lucide-react';

import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS, CategoryScale, LinearScale, BarElement,
    Title, Tooltip, Legend, ArcElement,
} from 'chart.js';

// --- Importação dinâmica do BOTÃO que contém a lógica do PDF ---
const PDFButtonWrapper = dynamic(() => import('./PDFButtonWrapper'), {
  ssr: false, // Garante que não executa no servidor
  loading: () => ( // Placeholder enquanto carrega
        <button className="flex items-center justify-center gap-2 px-4 py-2 min-w-36 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow cursor-not-allowed opacity-50" disabled>
            <Loader2 className="animate-spin h-5 w-5" /> <span>Carregando...</span>
        </button>
  )
});


ChartJS.register( CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement );

// --- Componentes Reutilizados ---
function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b p-4 dark:border-gray-600">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto text-gray-700 dark:text-gray-300 space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
}
const Spinner = () => <div className="flex justify-center items-center h-60"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>;
const KpiCard = ({ title, value, subtext }) => (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow">
        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
        {subtext && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{subtext}</p>}
    </div>
);
const SectionHeader = ({ icon, title }) => {
    const IconComponent = icon;
    if (!IconComponent) {
        return (
             <div className="flex items-center gap-2 md:gap-3 pb-2 border-b-2 border-blue-500 mb-4">
                 <div className="w-6 h-6 bg-gray-300 rounded"></div>
                 <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
             </div>
        );
    }
    return (
        <div className="flex items-center gap-2 md:gap-3 pb-2 border-b-2 border-blue-500 mb-4">
            <IconComponent className="text-blue-500" size={24} />
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        </div>
    );
};


// =================================================================================
// --- COMPONENTE PRINCIPAL DA PÁGINA ---
// =================================================================================

export default function DebriefingConversaoPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    // Estados Gerais e de Dados
    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingDebrief, setIsLoadingDebrief] = useState(true);
    const [resumo, setResumo] = useState(null);
    const [movimentacao, setMovimentacao] = useState([]);
    const [fontes, setFontes] = useState([]);
    const [tabelaMestra, setTabelaMestra] = useState([]);
    const [scoreAnalysis, setScoreAnalysis] = useState([]);
    const [mqlAnalysis, setMqlAnalysis] = useState([]);
    const [automatedInsights, setAutomatedInsights] = useState({ escalar: [], ajustar: [] });
    
    // *** ESTADOS DE PERFIL ACTUALIZADOS ***
    const [perfilPublicoData, setPerfilPublicoData] = useState({}); // Agrupado
    const [perfilInscritosData, setPerfilInscritosData] = useState({}); // Agrupado
    const [perfilCompradoresData, setPerfilCompradoresData] = useState({}); // Agrupado (NOVO)
    const [topTwoAnswersData, setTopTwoAnswersData] = useState([]); // Mantido para a tabela resumo

    // Estados e Refs para PDF
    const [isCapturingImages, setIsCapturingImages] = useState(false);
    const [chartImages, setChartImages] = useState(null);

    // Refs para Gráficos
    const movimentacaoChartRef = useRef(null);
    const fontesChartRef = useRef(null);
    const scoreChartRef = useRef(null);
    const mqlChartRef = useRef(null);
    // *** REFS DE PERFIL ACTUALIZADOS ***
    const perfilPublicoRefs = useRef({});
    const perfilInscritosRefs = useRef({});
    const perfilCompradoresRefs = useRef({}); // NOVO
    
    // --- Funções estáveis (useCallback) para setar as refs ---
    const setPublicoRef = useCallback((question, el) => {
        if (perfilPublicoRefs.current) {
            perfilPublicoRefs.current[question] = el;
        }
    }, []); 

    const setInscritosRef = useCallback((question, el) => {
        if (perfilInscritosRefs.current) {
            perfilInscritosRefs.current[question] = el;
        }
    }, []); 

    const setCompradoresRef = useCallback((question, el) => {
        if (perfilCompradoresRefs.current) {
            perfilCompradoresRefs.current[question] = el;
        }
    }, []); 


     // --- Configurações dos Gráficos Chart.js ---
     const [chartColors, setChartColors] = useState({ legend: '#cbd5e1', ticks: '#9ca3af', grid: '#374151', border: '#1f2937' });

    // --- Lógica de Busca de Dados ---
    useEffect(() => {
        // Busca lançamentos permitidos
        if (!userProfile || !supabase) { setIsLoadingLaunches(false); return; }; // Proteção
        setIsLoadingLaunches(true);
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
        supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend })
            .then(({ data, error }) => { if (error) throw error; const sorted = [...(data || [])].sort((a, b) => a.nome.localeCompare(b.nome)); setLaunches(sorted); if (sorted.length > 0) { const finished = sorted.find(l => l.status === 'Concluído'); const inProgress = sorted.find(l => l.status === 'Em andamento'); setSelectedLaunch(finished ? finished.id : (inProgress ? inProgress.id : sorted[0].id)); } })
            .catch(err => toast.error("Erro lançamentos: " + err.message)).finally(() => setIsLoadingLaunches(false));
    }, [userProfile, selectedClientId, supabase]);

    useEffect(() => {
        // Atualiza header com select de lançamento
        if (!setHeaderContent) return; // Proteção
        const launchSelector = ( <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} disabled={isLoadingLaunches || launches.length === 0} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2"> {isLoadingLaunches ? <option>Carregando...</option> : launches.length > 0 ? launches.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>) : <option>Nenhum lançamento</option>} </select> );
        setHeaderContent({ title: 'Debriefing de Conversão', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    // Helper para agrupar dados de perfil por pergunta
    const groupProfileData = (data) => {
        if (!data) return {};
        return data.reduce((acc, curr) => {
            const q = curr.question_text || 'Sem Pergunta';
            acc[q] = acc[q] || [];
            // Adiciona apenas os campos necessários
            acc[q].push({ answer: curr.answer_text, count: curr.answer_count, percentage: curr.answer_percentage });
            return acc;
        }, {});
    };

    const fetchDebriefData = useCallback(async () => {
        // Busca todos os dados do debriefing via RPC
        if (!supabase || !selectedLaunch || !userProfile) { // Proteção
             console.warn("Supabase, selectedLaunch ou UserProfile não estão prontos. Abortando fetch.");
             setIsLoadingDebrief(false);
             return;
        }
        
        setChartImages(null); // Limpa imagens
        // Limpa refs dos gráficos de perfil
        perfilPublicoRefs.current = {};
        perfilInscritosRefs.current = {};
        perfilCompradoresRefs.current = {}; // Limpa novo ref
        setIsLoadingDebrief(true);

        // Limpa estados de dados
        setResumo(null); setMovimentacao([]); setFontes([]); setTabelaMestra([]);
        setScoreAnalysis([]); setMqlAnalysis([]); setAutomatedInsights({ escalar: [], ajustar: [] });
        // Limpa novos estados
        setPerfilPublicoData({}); setPerfilInscritosData({}); setPerfilCompradoresData({}); setTopTwoAnswersData([]);

        try {
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const calls = [
                supabase.rpc('get_debrief_resumo', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
                supabase.rpc('get_debrief_movimentacao_diaria', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
                supabase.rpc('get_debrief_fontes_trafego', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
                supabase.rpc('get_debrief_tabela_mestra', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
                supabase.rpc('get_debrief_score_range_analysis', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
                supabase.rpc('get_debrief_mql_analysis', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
                supabase.rpc('get_debrief_automated_insights', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
                // *** NOVAS CHAMADAS RPC ***
                supabase.rpc('get_debrief_perfil_publico', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
                supabase.rpc('get_debrief_perfil_inscritos', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
                supabase.rpc('get_debrief_perfil_compradores', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }), // NOVO
                supabase.rpc('get_debrief_top_two_answers', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }),
            ];

            const results = await Promise.allSettled(calls);

            // Funções auxiliares para tratar resultados
            const handleResult = (result, setter, errorMessage, group = false) => {
                if (result.status === 'fulfilled' && result.value && !result.value.error) {
                    const data = result.value.data;
                    if (group) {
                        setter(groupProfileData(data));
                    } else if (setter === setResumo) { // ** CORREÇÃO PARA KPIs **
                        setter(Array.isArray(data) ? data[0] : data || null);
                    } else if (Array.isArray(data)) {
                        setter(data);
                    } else {
                        setter(data && typeof data === 'object' ? data : null);
                    }
                } else {
                    toast.error(errorMessage); console.error(errorMessage + ':', result.reason || result.value?.error);
                    if (group) setter({});
                    else if (typeof setter === 'function') { try { if (Array.isArray(setter())) setter([]); else setter(null); } catch (e) { setter(null); } }
                    else setter(null);
                }
            };

            // Trata resultados e atualiza estados
            handleResult(results[0], setResumo, 'Erro Resumo');
            handleResult(results[1], setMovimentacao, 'Erro Mov.');
            handleResult(results[2], setFontes, 'Erro Fontes');
            handleResult(results[3], setTabelaMestra, 'Erro Tabela');
            handleResult(results[4], setScoreAnalysis, 'Erro Score');
            handleResult(results[5], setMqlAnalysis, 'Erro MQL');
            handleResult(results[6], (data) => setAutomatedInsights(data || { escalar: [], ajustar: [] }), 'Erro Insights');
            // *** TRATA NOVOS RESULTADOS ***
            handleResult(results[7], setPerfilPublicoData, 'Erro Perfil Público', true);
            handleResult(results[8], setPerfilInscritosData, 'Erro Perfil Inscritos', true);
            handleResult(results[9], setPerfilCompradoresData, 'Erro Perfil Compradores', true); // NOVO (agrupado)
            handleResult(results[10], setTopTwoAnswersData, 'Erro Top 2 Respostas');

        } catch (err) {
            toast.error(`Erro fatal ao buscar dados: ${err.message}`);
        } finally {
            setIsLoadingDebrief(false);
        }
    }, [selectedLaunch, supabase, userProfile, selectedClientId]);

    useEffect(() => { fetchDebriefData(); }, [fetchDebriefData]); // Busca dados quando selectedLaunch muda

    // --- Lógica de Captura de Imagens ---
    const captureChartImages = () => {
        setIsCapturingImages(true);
        try {
            const newImages = {
                movimentacao: movimentacaoChartRef.current?.toBase64Image(),
                fontes: fontesChartRef.current?.toBase64Image(),
                scoreAnalysis: scoreChartRef.current?.toBase64Image(),
                mqlAnalysis: mqlChartRef.current?.toBase64Image(),
                // *** NOVOS GRÁFICOS DE PERFIL ***
                perfilPublico: {},
                perfilInscritos: {},
                perfilCompradores: {}, // NOVO
            };
            // Captura gráficos dinâmicos (perfil)
            for (const pergunta in perfilPublicoRefs.current) { if (perfilPublicoRefs.current[pergunta]) newImages.perfilPublico[pergunta] = perfilPublicoRefs.current[pergunta].toBase64Image(); }
            for (const pergunta in perfilInscritosRefs.current) { if (perfilInscritosRefs.current[pergunta]) newImages.perfilInscritos[pergunta] = perfilInscritosRefs.current[pergunta].toBase64Image(); }
            for (const pergunta in perfilCompradoresRefs.current) { if (perfilCompradoresRefs.current[pergunta]) newImages.perfilCompradores[pergunta] = perfilCompradoresRefs.current[pergunta].toBase64Image(); } // NOVO

            setChartImages(newImages);
            toast.success('Gráficos capturados! Pronto para baixar.');
        } catch (err) {
            console.error("Erro ao capturar imagens dos gráficos:", err);
            toast.error("Erro ao preparar o PDF. Verifique o console.");
            setChartImages(null);
        } finally {
            setIsCapturingImages(false);
        }
    };

    // --- Configurações dos Gráficos Chart.js ---
    useEffect(() => { // Atualiza cores se o tema mudar (opcional)
        const isDark = document.documentElement.classList.contains('dark');
        const updatedColors = {
            legend: isDark ? '#cbd5e1' : '#4b5563',
            ticks: isDark ? '#9ca3af' : '#6b7280',
            grid: isDark ? '#374151' : '#e5e7eb',
            border: isDark ? '#1f2937' : '#ffffff',
        };
        setChartColors(updatedColors);
        // Força a re-renderização dos gráficos se as cores mudarem
        ChartJS.defaults.color = updatedColors.ticks;
        ChartJS.defaults.borderColor = updatedColors.grid;
    }, []); // Roda apenas no mount

    const tooltipLabelCallback = function(context) { let label = context.dataset.label || context.label || ''; if (label) { label += ': '; } let value = context.parsed?.y ?? context.parsed ?? null; if (value !== null) { label += value.toLocaleString('pt-BR'); } else { label += 'N/A'; } if (context.chart.config.type === 'pie' && value !== null) { let total = context.chart.data.datasets[0].data.reduce((a, b) => (a || 0) + (b || 0), 0); let percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0.0%'; label += ` (${percentage})`; } return label; };
    const commonChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: chartColors.legend, boxWidth: 10, padding: 10, font: { size: 10 } } }, title: { display: false }, tooltip: { bodyFont: { size: 10 }, titleFont: { size: 12 }, callbacks: { label: tooltipLabelCallback }}}, scales: { x: { ticks: { color: chartColors.ticks, maxRotation: 0, minRotation: 0, font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: chartColors.ticks, font: { size: 9 } }, grid: { color: chartColors.grid } } }, layout: { padding: { top: 5, left: 0, right: 5, bottom: 0 } } };
    const barChartData = { labels: movimentacao.map(d => d.dia_ref), datasets: [ { label: 'Inscrições', data: movimentacao.map(d => d.inscricoes), backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }, { label: 'Check-ins', data: movimentacao.map(d => d.checkins), backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1 }, { label: 'Compras', data: movimentacao.map(d => d.vendas), backgroundColor: 'rgba(245, 158, 11, 0.5)', borderColor: 'rgba(245, 158, 11, 1)', borderWidth: 1 }, ], };
    const barChartOptions = { ...commonChartOptions };
    const pieChartData = { labels: fontes.map(f => f.fonte), datasets: [{ label: 'Leads', data: fontes.map(f => f.leads_gerados), backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(217, 70, 239, 0.7)', 'rgba(107, 114, 128, 0.7)'], borderColor: [chartColors.border], borderWidth: 1, }], };
    const pieChartOptions = { ...commonChartOptions, scales: {}, plugins: {...commonChartOptions.plugins, legend: { position: 'bottom', labels: {...commonChartOptions.plugins.legend.labels, color: chartColors.legend }}}};
    const scorePieChartData = { labels: scoreAnalysis.map(s => s.score_range_name), datasets: [{ label: 'Check-ins', data: scoreAnalysis.map(s => s.checkins), backgroundColor: ['rgba(239, 68, 68, 0.7)','rgba(249, 115, 22, 0.7)','rgba(234, 179, 8, 0.7)','rgba(59, 130, 246, 0.7)','rgba(14, 165, 233, 0.7)','rgba(107, 114, 128, 0.7)',], borderColor: [chartColors.border], borderWidth: 1, }], };
    const mqlPieChartData = { labels: mqlAnalysis.map(m => m.mql_level), datasets: [{ label: 'Check-ins', data: mqlAnalysis.map(m => m.checkins), backgroundColor: ['rgba(16, 185, 129, 0.7)','rgba(59, 130, 246, 0.7)','rgba(234, 179, 8, 0.7)','rgba(239, 68, 68, 0.7)','rgba(107, 114, 128, 0.7)',], borderColor: [chartColors.border], borderWidth: 1, }], };
    const analysisPieOptions = { responsive: true, maintainAspectRatio: false, scales: {}, plugins: { legend: { position: 'right', labels: { color: chartColors.legend, boxWidth: 10, padding: 5, font: { size: 10} } }, title: { display: false }, tooltip: { callbacks: { label: tooltipLabelCallback }}} };


    // --- FUNÇÕES AUXILIARES DE RENDERIZAÇÃO ---
    const renderAnalysisTable = (data, titleKey, orderKey) => {
        if (!data || data.length === 0) { return <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sem dados.</p>; }
        const sortedData = orderKey ? [...data].sort((a, b) => (b[orderKey] ?? 0) - (a[orderKey] ?? 0)) : data;
        const thClass = "px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
        const tdClass = "px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100";
        const tdPrimaryClass = tdClass + " font-medium text-gray-900 dark:text-white";
        const tdBoldClass = tdClass + " font-bold text-gray-800 dark:text-white";
        return ( <div className="overflow-x-auto w-full"><table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"><thead className="bg-gray-50 dark:bg-gray-700"><tr><th className={thClass}>{titleKey.replace(/_/g, ' ')}</th><th className={thClass}>Check-ins</th><th className={thClass} title="Contribuição % do Total de Check-ins do Lançamento">% Ck Total</th><th className={thClass}>Compras</th><th className={thClass} title="Contribuição % do Total de Compras do Lançamento">% Compra Total</th></tr></thead><tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">{sortedData.map((row, index) => (<tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className={tdPrimaryClass}>{row[titleKey]}</td><td className={tdClass}>{(row.checkins || 0).toLocaleString('pt-BR')}</td><td className={tdClass}>{parseFloat(row.tx_checkin_contribution || 0).toFixed(2)}%</td><td className={tdClass}>{(row.vendas || 0).toLocaleString('pt-BR')}</td><td className={tdBoldClass}>{parseFloat(row.tx_venda_contribution || 0).toFixed(2)}%</td></tr>))}</tbody></table></div> );
    };

    // --- Componente interno para renderizar cada gráfico de perfil ---
    const ProfileQuestion = React.memo(({ question, questionData, chartOptions, chartColors, setChartRef }) => {
        const chartRef = useRef(null);
        const pieColors = ['rgba(16, 185, 129, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(107, 114, 128, 0.7)'];
        const pieData = {
            labels: questionData.map(ans => ans.answer),
            datasets: [{
                label: 'Respostas',
                data: questionData.map(ans => ans.count),
                backgroundColor: questionData.map((_, i) => pieColors[i % pieColors.length]),
                borderColor: [chartColors.border],
                borderWidth: 1
            }],
        };

        useEffect(() => {
            if (setChartRef && chartRef.current) {
                setChartRef(question, chartRef.current);
            }
        }, [setChartRef, question]); 

        return (
            <div className="space-y-4"> {/* Wrapper para cada pergunta (Título + Grid) */}
                <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm md:text-base">{question}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch"> {/* Grid para Gráfico e Lista */}
                    {/* Card 1: Gráfico */}
                    <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg shadow flex items-center justify-center">
                        <div className="h-64 w-full">
                            <Pie
                                options={chartOptions}
                                data={pieData}
                                ref={chartRef} 
                            />
                        </div>
                    </div>
                    {/* Card 2: Lista */}
                    <div className="bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg shadow">
                        <ul className="space-y-1 overflow-y-auto max-h-64 pr-2 w-full">
                            {questionData.sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).map((ans, aIndex) => (
                                <li key={aIndex} className="flex justify-between items-center text-xs md:text-sm text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 last:border-b-0 py-2">
                                    <span className="truncate pr-2">{ans.answer}</span>
                                    <span className="font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap">{ans.count} ({ans.percentage}%)</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    });
    ProfileQuestion.displayName = 'ProfileQuestion'; 


    const renderTopTwoTable = (topTwoData, profileQuestions) => {
        if (!topTwoData || topTwoData.length === 0) { return <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sem dados para o resumo.</p>; }
        const thClass = "px-2 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider"; const tdClass = "px-2 py-2 whitespace-normal text-xs text-gray-700 dark:text-gray-100"; const groupedTopTwo = topTwoData.reduce((acc, curr) => { acc[curr.question_text] = acc[curr.question_text] || []; acc[curr.question_text].push({ answer: curr.answer_text, percentage: curr.answer_percentage }); return acc; }, {});
        
        // --- 💡💡 CORREÇÃO: Remove duplicatas antes de filtrar 💡💡 ---
        const allQuestions = [ ...profileQuestions.publico, ...profileQuestions.inscritos, ...profileQuestions.compradores ];
        const uniqueQuestions = [...new Set(allQuestions)]; // Garante que cada pergunta só apareça uma vez
        const orderedQuestions = uniqueQuestions.filter(q => groupedTopTwo[q]); // Filtra pelas perguntas que temos dados
        // --- FIM DA CORREÇÃO ---

        return ( <div className="overflow-x-auto w-full bg-white dark:bg-gray-800 shadow rounded-lg p-2 md:p-4"> <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"> <thead className="bg-gray-50 dark:bg-gray-700"> <tr> <th className={`${thClass} w-1/2`}>Pergunta</th> <th className={thClass}>1ª Resposta Mais Comum</th> <th className={thClass}>2ª Resposta Mais Comum</th> </tr> </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700"> 
          {orderedQuestions.map((questionText) => { // Agora `questionText` é garantidamente único
            const answers = groupedTopTwo[questionText] || []; 
            const top1 = answers[0] ? `${answers[0].answer} (${answers[0].percentage}%)` : '-'; 
            const top2 = answers[1] ? `${answers[1].answer} (${answers[1].percentage}%)` : '-'; 
            return ( 
            // A `key` agora é única
            <tr key={questionText} className="odd:bg-white dark:odd:bg-gray-800 even:bg-gray-50 dark:even:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600"> 
              <td className={`${tdClass} font-medium text-gray-900 dark:text-white w-1/2`}>{questionText}</td> 
              <td className={tdClass}>{top1}</td> 
              <td className={tdClass}>{top2}</td> 
            </tr> ); 
          })} 
        </tbody> 
        </table> </div> );
    };

    // ** LISTA DE PERGUNTAS VEM DA PLANILHA **
    const profileQuestionLists = {
        publico: [ 'Qual a sua idade?', 'Selecione o seu estado abaixo:', 'Qual é a sua renda mensal?', 'Como voce conheceu esta campanha?', 'Voce trabalha ou tem interesse em atuar na area relacionada ao curso?', 'Você já comprou cursos online?' ],
        inscritos: [ 'Qual o seu nivel de interesse em fazer um curso online nos proximos 30 dias?', 'Quanto tempo por semana voce tem disponivel para estudar online?', 'Voce ja participou de algum curso online anteriormente?', 'Voce esta disposto a investir em um curso pago se o conteudo atender suas expectativas?', 'Qual o seu principal objetivo ao buscar um curso online?', 'Quanto você estaria disposto(a) a investir para viver essa experiência?' ],
        compradores: [ 'Qual a sua idade?', 'Selecione o seu estado abaixo:', 'Você já comprou cursos online?', 'Qual foi a forma de pagamento que você utilizou com mais frequência para se inscrever em cursos online?', 'Qual é a sua renda mensal?', 'Quanto você estaria disposto(a) a investir para viver essa experiência?', 'Qual seu sexo?' ]
    };


    // --- Renderização (JSX) ---
    return (
        <div className="p-2 sm:p-4 md:p-6 lg:p-8 space-y-8 md:space-y-12">
            <Toaster position="top-right" />
            <div className="flex justify-end mb-4 print-hide">
                <PDFButtonWrapper
                    isLoadingDebrief={isLoadingDebrief}
                    isCapturingImages={isCapturingImages}
                    chartImages={chartImages}
                    selectedLaunch={selectedLaunch}
                    captureChartImages={captureChartImages}
                    resumo={resumo}
                    movimentacao={movimentacao}
                    fontes={fontes}
                    tabelaMestra={tabelaMestra}
                    scoreAnalysis={scoreAnalysis}
                    mqlAnalysis={mqlAnalysis}
                    automatedInsights={automatedInsights}
                    // *** PASSA OS 3 PERFIS DE DADOS PARA O PDF ***
                    perfilPublicoData={perfilPublicoData}
                    perfilInscritosData={perfilInscritosData}
                    perfilCompradoresData={perfilCompradoresData} // NOVO
                    topTwoAnswersData={topTwoAnswersData}
                    profileQuestionLists={profileQuestionLists}
               />
            </div>

            {isLoadingDebrief || isLoadingLaunches ? <Spinner /> : (
                <div className="space-y-12">
                    {/* Seção 1: Resumo */}
                    <section>
                        <SectionHeader icon={Database} title="Resumo Executivo" />
                         {!resumo ? <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sem dados...</p> : ( <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-4"> <KpiCard title="Total Leads" value={(resumo.total_leads || 0).toLocaleString('pt-BR')} /> <KpiCard title="Total Check-ins" value={(resumo.total_checkins || 0).toLocaleString('pt-BR')} /> <KpiCard title="Total Compras" value={(resumo.total_vendas || 0).toLocaleString('pt-BR')} /> <KpiCard title="Tx. L p/ C" value={`${parseFloat(resumo.tx_lead_checkin || 0).toFixed(2)}%`} /> <KpiCard title="Tx. C p/ Cp" value={`${parseFloat(resumo.tx_checkin_venda || 0).toFixed(2)}%`} /> <KpiCard title="Tx. L p/ Cp" value={`${parseFloat(resumo.tx_lead_venda || 0).toFixed(2)}%`} /> </div> )}
                    </section>

                    {/* Seção 2: Movimentação Diária */}
                    <section>
                        <SectionHeader icon={BarChart2} title="Movimentação Diária" />
                        <div className="w-full overflow-hidden bg-white dark:bg-gray-800 p-1 sm:p-2 md:p-4 rounded-lg shadow"> <div className="h-72 sm:h-80 md:h-96"> {movimentacao.length > 0 ? <Bar ref={movimentacaoChartRef} options={barChartOptions} data={barChartData} /> : <p className="text-center pt-16 text-gray-500 dark:text-gray-400">Sem dados...</p>} </div> </div>
                    </section>

                    {/* Seção 3: Fontes de Tráfego */}
                    <section>
                        <SectionHeader icon={PieChart} title="Análise de Fontes de Tráfego" />
                        {fontes.length > 0 ? ( <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"> <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-1 sm:p-2 md:p-4 rounded-lg shadow w-full overflow-hidden"> <div className="h-64 sm:h-72 md:h-80"> <Pie ref={fontesChartRef} options={pieChartOptions} data={pieChartData} /> </div> </div> <div className="lg:col-span-2 overflow-x-auto bg-white dark:bg-gray-800 p-2 md:p-4 rounded-lg shadow"> <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"> <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fonte</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Leads</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Check-ins</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Compras</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" title="Taxa Conversão Lead p/ Compra">Tx. L/Cp</th></tr></thead> <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gamma-700">{fontes.map(f => (<tr key={f.fonte} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm font-medium text-gray-900 dark:text-white">{f.fonte}</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{(f.leads_gerados || 0).toLocaleString('pt-BR')}</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{(f.total_checkins || 0).toLocaleString('pt-BR')}</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{(f.vendas || 0).toLocaleString('pt-BR')}</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm font-semibold text-gray-800 dark:text-white">{parseFloat(f.tx_lead_venda || 0).toFixed(2)}%</td></tr>))}</tbody> </table> </div> </div> ) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sem dados...</p>}
                    </section>

                    {/* Seção 4: Tabela Mestra */}
                    <section>
                        <SectionHeader icon={ListChecks} title="Análise de Campanhas e Criativos (Tabela Mestra)" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 -mt-2">Esta tabela detalha a performance de cada campanha e criativo.</p> <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg p-2 md:p-4"> <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"> <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Campanha</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Criativo</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Leads</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Check-ins</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" title="Contribuição % do Total de Check-ins do Lançamento">Ck / Total Ck</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Compras</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" title="Taxa Check-in p/ Compra">Tx. C/Cp</th><th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" title="Taxa Lead p/ Compra">Tx. L/Cp</th></tr></thead> <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gamma-700"> {tabelaMestra.length > 0 ? tabelaMestra.map((row, index) => (<tr key={`${row.utm_campaign}-${row.utm_content}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm font-medium text-gray-900 dark:text-white">{row.utm_campaign || '(nd)'}</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{row.utm_content || '(nd)'}</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{(row.leads || 0).toLocaleString('pt-BR')}</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{(row.checkins || 0).toLocaleString('pt-BR')}</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{parseFloat(row.tx_lead_checkin_contribution || 0).toFixed(2)}%</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{(row.vendas || 0).toLocaleString('pt-BR')}</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{parseFloat(row.tx_checkin_venda || 0).toFixed(2)}%</td><td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm font-bold text-gray-800 dark:text-white">{parseFloat(row.tx_lead_venda || 0).toFixed(2)}%</td></tr>)) : ( <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Nenhum dado...</td></tr> )} </tbody> </table> </div>
                    </section>

                    {/* Seção Análise por Faixa de Score */}
                    <section>
                        <SectionHeader icon={Star} title="Análise por Faixa de Score (Check-ins)" />
                        {scoreAnalysis.length > 0 ? ( <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center"> <div className="bg-white dark:bg-gray-800 p-1 sm:p-2 md:p-4 rounded-lg shadow w-full overflow-hidden"> <div className="h-64 sm:h-72 md:h-80"><Pie ref={scoreChartRef} options={{...analysisPieOptions, plugins: {...analysisPieOptions.plugins, legend: { position: 'bottom', labels: {...commonChartOptions.plugins.legend.labels, color: chartColors.legend }}} }} data={scorePieChartData} /></div> </div> <div className="bg-white dark:bg-gray-800 p-2 md:p-4 rounded-lg shadow w-full">{renderAnalysisTable(scoreAnalysis, 'score_range_name', 'score_range_order')}</div> </div> ) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sem dados...</p>}
                    </section>

                    {/* Seção Análise por Nível MQL */}
                    <section>
                        <SectionHeader icon={UserCheck} title="Análise por Nível MQL (Check-ins)" />
                        {mqlAnalysis.length > 0 ? ( <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center"> <div className="bg-white dark:bg-gray-800 p-1 sm:p-2 md:p-4 rounded-lg shadow w-full overflow-hidden"> <div className="h-64 sm:h-72 md:h-80"><Pie ref={mqlChartRef} options={{...analysisPieOptions, plugins: {...analysisPieOptions.plugins, legend: { position: 'bottom', labels: {...commonChartOptions.plugins.legend.labels, color: chartColors.legend }}} }} data={mqlPieChartData} /></div> </div> <div className="bg-white dark:bg-gray-800 p-2 md:p-4 rounded-lg shadow w-full">{renderAnalysisTable(mqlAnalysis, 'mql_level', 'mql_order')}</div> </div> ): <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sem dados...</p>}
                    </section>

                    {/* *** NOVAS SEÇÕES DE PERFIL (USA O NOVO COMPONENTE) *** */}
                    <section>
                        <SectionHeader icon={Group} title="Análise do Perfil Público" />
                        <div className="space-y-4 md:space-y-6">
                            {Object.keys(perfilPublicoData).length > 0 ? (
                                Object.keys(perfilPublicoData).map((question) => (
                                    <ProfileQuestion
                                        key={question}
                                        question={question}
                                        questionData={perfilPublicoData[question]}
                                        chartOptions={analysisPieOptions} 
                                        chartColors={chartColors}
                                        setChartRef={setPublicoRef}
                                    />
                                ))
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sem dados de perfil público para análise.</p>
                            )}
                        </div>
                    </section>

                    <section>
                        <SectionHeader icon={MessageSquareText} title="Análise do Perfil de Inscritos" />
                        <div className="space-y-4 md:space-y-6">
                            {Object.keys(perfilInscritosData).length > 0 ? (
                                Object.keys(perfilInscritosData).map((question) => (
                                    <ProfileQuestion
                                        key={question}
                                        question={question}
                                        questionData={perfilInscritosData[question]}
                                        chartOptions={analysisPieOptions}
                                        chartColors={chartColors}
                                        setChartRef={setInscritosRef}
                                    />
                                ))
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sem dados de perfil de inscritos para análise.</p>
                            )}
                        </div>
                    </section>

                    <section>
                        <SectionHeader icon={UserCircle} title="Análise do Perfil de Compradores" />
                        <div className="space-y-4 md:space-y-6">
                            {Object.keys(perfilCompradoresData).length > 0 ? (
                                Object.keys(perfilCompradoresData).map((question) => (
                                    <ProfileQuestion
                                        key={question}
                                        question={question}
                                        questionData={perfilCompradoresData[question]}
                                        chartOptions={analysisPieOptions}
                                        chartColors={chartColors}
                                        setChartRef={setCompradoresRef}
                                    />
                                ))
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sem dados de perfil de compradores para análise.</p>
                            )}
                        </div>
                    </section>

                    {/* Seção Insights Sugeridos (Automático) */}
                    <section>
                         <SectionHeader icon={Lightbulb} title="Insights Sugeridos (Automático)" />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                                 <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3">✅ Manter / Escalar:</h3>
                                 {automatedInsights?.escalar?.length > 0 ? ( <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-200"> {automatedInsights.escalar.map((item, index) => <li key={`esc-${index}`}>{item}</li>)} </ul> ) : ( <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nenhuma sugestão.</p> )}
                             </div>
                             <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                                 <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-3">⚠️ Ajustar / Otimizar:</h3>
                                 {automatedInsights?.ajustar?.length > 0 ? ( <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-200"> {automatedInsights.ajustar.map((item, index) => <li key={`adj-${index}`}>{item}</li>)} </ul> ) : ( <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nenhuma sugestão.</p> )}
                             </div>
                         </div>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">Insights baseados em Fontes, Score, MQL.</p>
                    </section>

                    {/* *** NOVA SEÇÃO TABELA RESUMO TOP 2 *** */}
                    <section>
                         <SectionHeader icon={ListChecks} title="Resumo: Top 2 Respostas por Pergunta" />
                         {renderTopTwoTable(topTwoAnswersData, profileQuestionLists)}
                    </section>

                </div>
            )}

            <style jsx global>{`
                /* Estilo para animação de spin (caso o Loader2 precise) */
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                /* Esconde o botão de PDF ao imprimir */
                @media print {
                    .print-hide {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}