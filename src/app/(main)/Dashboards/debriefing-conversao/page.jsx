'use client';

// =================================================================
// /// --- CÓDIGO v16 (Otimizações Responsivas Gráficos/Tabelas - COMPLETO REAL) --- ///
// =================================================================

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { Download, X, BarChart2, PieChart, Database, ListChecks, CheckCheck, Target, Star, UserCheck, Lightbulb } from 'lucide-react';

import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';

ChartJS.register( CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement );

// --- Componentes Reutilizados (COMPLETOS) ---

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

const mqlLevelOrder = ['A', 'B', 'C', 'D', 'Sem MQL'];
const mqlLevelColors = { 'A': '#10b981', 'B': '#3b82f6', 'C': '#eab308', 'D': '#ef4444', 'Sem MQL': '#6b7280' };

const ScoreDistributionBar = ({ distribution }) => {
    if (!distribution || typeof distribution !== 'object') { return <div className="text-xs text-gray-400 dark:text-gray-500 italic">Sem MQL</div>; }
    const total = mqlLevelOrder.reduce((sum, key) => sum + (distribution[key] || 0), 0);
    if (total === 0) return <div className="text-xs text-gray-400 dark:text-gray-500 italic">Sem MQL</div>;
    const title = mqlLevelOrder.map(key => `${key}: ${distribution[key] || 0}`).filter(part => !(part.endsWith(': 0'))).join(' | ');
    return (
        <div className="w-full flex rounded-full h-3 bg-gray-200 dark:bg-gray-600 overflow-hidden" title={title}>
            {mqlLevelOrder.map(key => {
                const percentage = total > 0 ? (distribution[key] || 0) / total * 100 : 0;
                if (percentage === 0) return null;
                return ( <div key={key} className="h-full" style={{ width: `${percentage}%`, backgroundColor: mqlLevelColors[key] || mqlLevelColors['Sem MQL'] }} ></div> );
            })}
        </div>
    );
};

const KpiCard = ({ title, value, subtext }) => (
    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow">
        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
        <p className="mt-1 text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
        {subtext && <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{subtext}</p>}
    </div>
);
const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 md:gap-3 pb-2 border-b-2 border-blue-500 mb-4">
        <Icon className="text-blue-500" size={24} />
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
    </div>
);
const TextAreaCard = ({ title, value, onChange, placeholder, onSave, isLoading }) => (
     <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-2">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <textarea
            className="w-full h-40 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
            value={value || ''}
            onChange={onChange}
            placeholder={placeholder}
            disabled={isLoading}
        />
        <button
            onClick={onSave}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
        >
            {isLoading ? 'Salvando...' : 'Salvar Análise'}
        </button>
    </div>
);

// --- Componente Principal da Página ---
export default function DebriefingConversaoPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingDebrief, setIsLoadingDebrief] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [resumo, setResumo] = useState(null);
    const [movimentacao, setMovimentacao] = useState([]);
    const [fontes, setFontes] = useState([]);
    const [tabelaMestra, setTabelaMestra] = useState([]);
    const [scoreAnalysis, setScoreAnalysis] = useState([]);
    const [mqlAnalysis, setMqlAnalysis] = useState([]);
    const [conclusoes, setConclusoes] = useState({ funcionou: '', ajustar: '', testar: '', briefing_metas: '', briefing_estrategia: '' });
    const [automatedInsights, setAutomatedInsights] = useState({ escalar: [], ajustar: [] });

    // --- Lógica de Busca de Dados ---
    useEffect(() => {
        if (!userProfile) return; setIsLoadingLaunches(true); const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
        supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend })
            .then(({ data, error }) => { if (error) throw error; const sorted = [...(data || [])].sort((a, b) => a.nome.localeCompare(b.nome)); setLaunches(sorted); if (sorted.length > 0) { const finished = sorted.find(l => l.status === 'Concluído'); const inProgress = sorted.find(l => l.status === 'Em andamento'); setSelectedLaunch(finished ? finished.id : (inProgress ? inProgress.id : sorted[0].id)); } })
            .catch(err => toast.error("Erro lançamentos: " + err.message)).finally(() => setIsLoadingLaunches(false));
    }, [userProfile, selectedClientId, supabase]);

    useEffect(() => {
        const launchSelector = ( <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} disabled={isLoadingLaunches || launches.length === 0} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2"> {isLoadingLaunches ? <option>Carregando...</option> : launches.length > 0 ? launches.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>) : <option>Nenhum lançamento</option>} </select> );
        setHeaderContent({ title: 'Debriefing de Conversão', controls: launchSelector }); return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    const fetchDebriefData = useCallback(async () => {
        if (!selectedLaunch || !userProfile) return; setIsLoadingDebrief(true); setResumo(null); setMovimentacao([]); setFontes([]); setTabelaMestra([]); setScoreAnalysis([]); setMqlAnalysis([]); setAutomatedInsights({ escalar: [], ajustar: [] }); setConclusoes({ funcionou: '', ajustar: '', testar: '', briefing_metas: '', briefing_estrategia: '' });
        try { const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id; const [ resumoResult, movResult, fontesResult, tabelaResult, conclusoesResult, scoreResult, mqlResult, insightsResult ] = await Promise.allSettled([ supabase.rpc('get_debrief_resumo', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }), supabase.rpc('get_debrief_movimentacao_diaria', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }), supabase.rpc('get_debrief_fontes_trafego', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }), supabase.rpc('get_debrief_tabela_mestra', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }), supabase.rpc('get_debrief_conclusoes', { p_launch_id: selectedLaunch }), supabase.rpc('get_debrief_score_range_analysis', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }), supabase.rpc('get_debrief_mql_analysis', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }), supabase.rpc('get_debrief_automated_insights', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }) ]);
        if (resumoResult.status === 'fulfilled' && !resumoResult.value.error) setResumo(resumoResult.value.data?.[0] || null); else { toast.error('Erro Resumo.'); console.error("Erro Resumo:", resumoResult.reason || resumoResult.value?.error); }
        if (movResult.status === 'fulfilled' && !movResult.value.error) setMovimentacao(movResult.value.data || []); else { toast.error('Erro Mov.'); console.error("Erro Mov:", movResult.reason || movResult.value?.error); }
        if (fontesResult.status === 'fulfilled' && !fontesResult.value.error) setFontes(fontesResult.value.data || []); else { toast.error('Erro Fontes.'); console.error("Erro Fontes:", fontesResult.reason || fontesResult.value?.error); }
        if (tabelaResult.status === 'fulfilled' && !tabelaResult.value.error) setTabelaMestra(tabelaResult.value.data || []); else { toast.error('Erro Tabela.'); console.error("Erro Tabela:", tabelaResult.reason || tabelaResult.value?.error); }
        if (conclusoesResult.status === 'fulfilled' && !conclusoesResult.value.error) { const data = conclusoesResult.value.data?.[0]; if(data) setConclusoes({ funcionou: data.funcionou || '', ajustar: data.ajustar || '', testar: data.testar || '', briefing_metas: data.briefing_metas || '', briefing_estrategia: data.briefing_estrategia || '' }); }
        if (scoreResult.status === 'fulfilled' && !scoreResult.value.error) setScoreAnalysis(scoreResult.value.data || []); else { toast.error('Erro Score.'); console.error("Erro Score:", scoreResult.reason || scoreResult.value?.error); }
        if (mqlResult.status === 'fulfilled' && !mqlResult.value.error) setMqlAnalysis(mqlResult.value.data || []); else { toast.error('Erro MQL.'); console.error("Erro MQL:", mqlResult.reason || mqlResult.value?.error); }
        if (insightsResult.status === 'fulfilled' && !insightsResult.value.error) { setAutomatedInsights(insightsResult.value.data || { escalar: [], ajustar: [] }); } else { toast.error('Erro Insights.'); console.error("Erro Insights:", insightsResult.reason || insightsResult.value?.error); setAutomatedInsights({ escalar: [], ajustar: [] }); }
        } catch (err) { toast.error(`Erro fatal: ${err.message}`); } finally { setIsLoadingDebrief(false); }
    }, [selectedLaunch, supabase, userProfile, selectedClientId]);

    useEffect(() => { fetchDebriefData(); }, [fetchDebriefData]);
    const handleSaveConclusoes = async (campo) => {
        if (isSaving) return; setIsSaving(true); const valor = conclusoes[campo]; toast.loading(`Salvando campo...`);
        const { error } = await supabase.from('debriefing_conclusoes').upsert({ lancamento_id: selectedLaunch, [campo]: valor }, { onConflict: 'lancamento_id' });
        toast.dismiss(); if (error) toast.error(`Erro ao salvar: ${error.message}`); else toast.success('Análise salva!'); setIsSaving(false);
    };
    const handlePrintPdf = () => {
        document.body.classList.add('print-mode'); window.print(); setTimeout(() => document.body.classList.remove('print-mode'), 500);
    };

    // --- Configurações dos Gráficos Chart.js ---
    const commonChartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', boxWidth: 10, padding: 10, font: { size: 10 } } }, title: { display: false }, tooltip: { bodyFont: { size: 10 }, titleFont: { size: 12 }, callbacks: { label: function(context) { let label = context.dataset.label || context.label || ''; if (label) { label += ': '; } let value = context.parsed.y ?? context.parsed ?? 0; label += value.toLocaleString('pt-BR'); if (context.chart.config.type === 'pie') { let total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); let percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0.0%'; label += ` (${percentage})`; } return label; }}}}, scales: { x: { ticks: { color: '#9ca3af', maxRotation: 0, minRotation: 0, font: { size: 9 } }, grid: { display: false } }, y: { ticks: { color: '#9ca3af', font: { size: 9 } }, grid: { color: '#374151' } } } };
    const barChartData = { labels: movimentacao.map(d => d.dia_ref.substring(5)), datasets: [ { label: 'Inscrições', data: movimentacao.map(d => d.inscricoes), backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }, { label: 'Check-ins', data: movimentacao.map(d => d.checkins), backgroundColor: 'rgba(16, 185, 129, 0.5)', borderColor: 'rgba(16, 185, 129, 1)', borderWidth: 1 }, { label: 'Vendas', data: movimentacao.map(d => d.vendas), backgroundColor: 'rgba(245, 158, 11, 0.5)', borderColor: 'rgba(245, 158, 11, 1)', borderWidth: 1 }, ], };
    const barChartOptions = commonChartOptions;
    const pieChartData = { labels: fontes.map(f => f.fonte), datasets: [{ label: 'Leads', data: fontes.map(f => f.leads_gerados), backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(217, 70, 239, 0.7)'], borderColor: ['#1f2937'], borderWidth: 1, }], };
    const pieChartOptions = { ...commonChartOptions, plugins: {...commonChartOptions.plugins, legend: { position: 'bottom', labels: {...commonChartOptions.plugins.legend.labels }}}};
    const scorePieChartData = { labels: scoreAnalysis.map(s => s.score_range_name), datasets: [{ label: 'Check-ins', data: scoreAnalysis.map(s => s.checkins), backgroundColor: ['rgba(239, 68, 68, 0.7)','rgba(249, 115, 22, 0.7)','rgba(234, 179, 8, 0.7)','rgba(59, 130, 246, 0.7)','rgba(14, 165, 233, 0.7)','rgba(107, 114, 128, 0.7)',], borderColor: ['#1f2937'], borderWidth: 1, }], };
    const mqlPieChartData = { labels: mqlAnalysis.map(m => m.mql_level), datasets: [{ label: 'Check-ins', data: mqlAnalysis.map(m => m.checkins), backgroundColor: ['rgba(16, 185, 129, 0.7)','rgba(59, 130, 246, 0.7)','rgba(234, 179, 8, 0.7)','rgba(239, 68, 68, 0.7)','rgba(107, 114, 128, 0.7)',], borderColor: ['#1f2937'], borderWidth: 1, }], };
    const analysisPieOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#cbd5e1', boxWidth: 10, padding: 5, font: { size: 10} } }, title: { display: false }, tooltip: { callbacks: { label: function(context) { let label = context.label || ''; let value = context.parsed || 0; if (label) { label += ': '; } label += value.toLocaleString('pt-BR'); let total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0); let percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0.0%'; label += ` (${percentage})`; return label; }}}} };


    // --- FUNÇÃO AUXILIAR PARA RENDERIZAR TABELAS DE ANÁLISE ---
    const renderAnalysisTable = (data, titleKey, orderKey) => {
        if (!data || data.length === 0) { return <p className="text-gray-500 dark:text-gray-400 text-center py-8">Sem dados.</p>; }
        const sortedData = orderKey ? [...data].sort((a, b) => b[orderKey] - a[orderKey]) : data;
        const thClass = "px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider";
        const tdClass = "px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100";
        const tdPrimaryClass = tdClass + " font-medium text-gray-900 dark:text-white";
        const tdBoldClass = tdClass + " font-bold text-gray-800 dark:text-white";
        return (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                            <th className={thClass}>{titleKey.replace(/_/g, ' ')}</th>
                            <th className={thClass}>Check-ins</th>
                            <th className={thClass}>Vendas</th>
                            <th className={thClass} title="Taxa de Check-in para Venda">Tx. C/V</th>
                            <th className={thClass} title="Taxa de Check-in para Venda">Tx. Ck/V</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedData.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className={tdPrimaryClass}>{row[titleKey]}</td>
                                <td className={tdClass}>{row.checkins?.toLocaleString('pt-BR')}</td>
                                <td className={tdClass}>{row.vendas?.toLocaleString('pt-BR')}</td>
                                <td className={tdClass}>{parseFloat(row.tx_checkin_venda || 0).toFixed(2)}%</td>
                                <td className={tdBoldClass}>{parseFloat(row.tx_lead_venda || 0).toFixed(2)}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // --- Renderização (JSX) ---
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 md:space-y-12">
            <Toaster position="top-right" />
            <div className="flex justify-end mb-4 print-hide">
                <button onClick={handlePrintPdf} disabled={isLoadingDebrief || isLoadingLaunches} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 disabled:opacity-50 transition-colors"> <Download size={18} /> Salvar em PDF </button>
            </div>

            {isLoadingDebrief || isLoadingLaunches ? <Spinner /> : (
                <div className="space-y-12">
                    {/* Seção 1: Resumo */}
                    <section>
                        <SectionHeader icon={Database} title="Resumo Executivo" />
                        {!resumo ? <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sem dados...</p> : (
                             <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 xs:gap-3 md:gap-4">
                                <KpiCard title="Total Leads" value={resumo.total_leads?.toLocaleString('pt-BR') || '0'} />
                                <KpiCard title="Total Check-ins" value={resumo.total_checkins?.toLocaleString('pt-BR') || '0'} />
                                <KpiCard title="Total Vendas" value={resumo.total_vendas?.toLocaleString('pt-BR') || '0'} />
                                <KpiCard title="Tx. L p/ C" value={`${parseFloat(resumo.tx_lead_checkin || 0).toFixed(2)}%`} />
                                <KpiCard title="Tx. C p/ V" value={`${parseFloat(resumo.tx_checkin_venda || 0).toFixed(2)}%`} />
                                <KpiCard title="Tx. L p/ V" value={`${parseFloat(resumo.tx_lead_venda || 0).toFixed(2)}%`} />
                             </div>
                         )}
                    </section>

                    {/* Seção 2: Movimentação Diária */}
                    <section>
                        <SectionHeader icon={BarChart2} title="Movimentação Diária" />
                        <div className="w-full overflow-hidden bg-white dark:bg-gray-800 p-1 sm:p-2 md:p-4 rounded-lg shadow">
                            <div className="h-72 sm:h-80 md:h-96">
                                {movimentacao.length > 0 ? <Bar options={barChartOptions} data={barChartData} /> : <p className="text-center pt-16 text-gray-500 dark:text-gray-400">Sem dados...</p>}
                            </div>
                        </div>
                    </section>

                    {/* Seção 3: Fontes de Tráfego */}
                    <section>
                        <SectionHeader icon={PieChart} title="Análise de Fontes de Tráfego" />
                        {fontes.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-1 sm:p-2 md:p-4 rounded-lg shadow w-full overflow-hidden">
                                     <div className="h-64 sm:h-72 md:h-80">
                                        <Pie options={pieChartOptions} data={pieChartData} />
                                     </div>
                                </div>
                                <div className="lg:col-span-2 overflow-x-auto bg-white dark:bg-gray-800 p-2 md:p-4 rounded-lg shadow">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700"> <tr> <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Fonte</th> <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Leads</th> <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Check-ins</th> <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vendas</th> <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" title="Taxa Conversão Lead p/ Venda">Tx. L/V</th> </tr> </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700"> {fontes.map(f => ( <tr key={f.fonte} className="hover:bg-gray-50 dark:hover:bg-gray-700/50"> <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm font-medium text-gray-900 dark:text-white">{f.fonte}</td> <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{f.leads_gerados?.toLocaleString('pt-BR')}</td> <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{f.total_checkins?.toLocaleString('pt-BR')}</td> <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{f.vendas?.toLocaleString('pt-BR')}</td> <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm font-semibold text-gray-800 dark:text-white">{parseFloat(f.tx_lead_venda || 0).toFixed(2)}%</td> </tr> ))} </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sem dados...</p>}
                    </section>

                    {/* Seção 4: Tabela Mestra */}
                    <section>
                        <SectionHeader icon={ListChecks} title="Análise de Campanhas e Criativos (Tabela Mestra)" />
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 -mt-2">Esta tabela detalha a performance de cada campanha e criativo, desde a captação até a venda...</p>
                        <div className="overflow-x-auto bg-white dark:bg-gray-800 shadow rounded-lg p-2 md:p-4">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Campanha</th>
                                        <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Criativo</th>
                                        <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Leads</th>
                                        <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Check-ins</th>
                                        <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" title="Taxa Lead p/ Check-in">Tx. L/C</th>
                                        <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Vendas</th>
                                        <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" title="Taxa Check-in p/ Venda">Tx. C/V</th>
                                        <th className="px-1 xs:px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" title="Taxa Lead p/ Venda">Tx. L/V</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {tabelaMestra.length > 0 ? tabelaMestra.map((row, index) => (
                                        <tr key={`${row.utm_campaign}-${row.utm_content}-${index}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm font-medium text-gray-900 dark:text-white">{row.utm_campaign || '(nd)'}</td>
                                            <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{row.utm_content || '(nd)'}</td>
                                            <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{row.leads?.toLocaleString('pt-BR')}</td>
                                            <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{row.checkins?.toLocaleString('pt-BR')}</td>
                                            <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{parseFloat(row.tx_lead_checkin || 0).toFixed(2)}%</td>
                                            <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{row.vendas?.toLocaleString('pt-BR')}</td>
                                            <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm text-gray-700 dark:text-gray-100">{parseFloat(row.tx_checkin_venda || 0).toFixed(2)}%</td>
                                            <td className="px-1 xs:px-2 sm:px-4 py-3 whitespace-nowrap text-xs xs:text-sm font-bold text-gray-800 dark:text-white">{parseFloat(row.tx_lead_venda || 0).toFixed(2)}%</td>
                                        </tr>
                                    )) : ( <tr><td colSpan="8" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">Nenhum dado...</td></tr> )}
                                </tbody>
                            </table>
                         </div>
                    </section>

                    {/* Seção Análise por Faixa de Score */}
                    <section>
                        <SectionHeader icon={Star} title="Análise por Faixa de Score (Check-ins)" />
                        {scoreAnalysis.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                                <div className="bg-white dark:bg-gray-800 p-1 sm:p-2 md:p-4 rounded-lg shadow w-full overflow-hidden">
                                    <div className="h-64 sm:h-72 md:h-80">
                                        <Pie options={{...analysisPieOptions, plugins: {...analysisPieOptions.plugins, legend: { position: 'bottom', labels: {...commonChartOptions.plugins.legend.labels }}} }} data={scorePieChartData} />
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 md:p-4 rounded-lg shadow"> {renderAnalysisTable(scoreAnalysis, 'score_range_name', 'score_range_order')} </div>
                            </div>
                        ) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sem dados...</p>}
                    </section>

                    {/* Seção Análise por Nível MQL */}
                    <section>
                        <SectionHeader icon={UserCheck} title="Análise por Nível MQL (Check-ins)" />
                        {mqlAnalysis.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                                <div className="bg-white dark:bg-gray-800 p-1 sm:p-2 md:p-4 rounded-lg shadow w-full overflow-hidden">
                                     <div className="h-64 sm:h-72 md:h-80">
                                        <Pie options={{...analysisPieOptions, plugins: {...analysisPieOptions.plugins, legend: { position: 'bottom', labels: {...commonChartOptions.plugins.legend.labels }}} }} data={mqlPieChartData} />
                                     </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 md:p-4 rounded-lg shadow"> {renderAnalysisTable(mqlAnalysis, 'mql_level', 'mql_order')} </div>
                            </div>
                        ): <p className="text-center text-gray-500 dark:text-gray-400 py-8">Sem dados...</p>}
                    </section>

                    {/* Seção Insights Sugeridos */}
                    <section>
                        <SectionHeader icon={Lightbulb} title="Insights Sugeridos (Automático)" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
                                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3">✅ Manter / Escalar:</h3>
                                {automatedInsights?.escalar?.length > 0 ? ( <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-200"> {automatedInsights.escalar.map((item, index) => <li key={`esc-${index}`}>{item}</li>)} </ul> ) : ( <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nenhuma sugestão clara encontrada.</p> )}
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-3">⚠️ Ajustar / Otimizar:</h3>
                                {automatedInsights?.ajustar?.length > 0 ? ( <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-200"> {automatedInsights.ajustar.map((item, index) => <li key={`adj-${index}`}>{item}</li>)} </ul> ) : ( <p className="text-sm text-gray-500 dark:text-gray-400 italic">Nenhuma sugestão clara encontrada.</p> )}
                            </div>
                        </div>
                         <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">Use estes insights como ponto de partida para sua análise nas seções abaixo.</p>
                    </section>

                    {/* Seção 5: Conclusões Estratégicas (Manual) */}
                    <section>
                        <SectionHeader icon={CheckCheck} title="Conclusões Estratégicas (Sua Análise)" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <TextAreaCard title="O que funcionou..." placeholder="Baseado nos dados e insights, o que realmente deu certo?" value={conclusoes.funcionou} onChange={e => setConclusoes(prev => ({ ...prev, funcionou: e.target.value }))} onSave={() => handleSaveConclusoes('funcionou')} isLoading={isSaving} />
                            <TextAreaCard title="O que ajustar..." placeholder="Onde estão os pontos de melhoria mais claros?" value={conclusoes.ajustar} onChange={e => setConclusoes(prev => ({ ...prev, ajustar: e.target.value }))} onSave={() => handleSaveConclusoes('ajustar')} isLoading={isSaving} />
                            <TextAreaCard title="O que testar..." placeholder="Quais hipóteses surgiram para o próximo lançamento?" value={conclusoes.testar} onChange={e => setConclusoes(prev => ({ ...prev, testar: e.target.value }))} onSave={() => handleSaveConclusoes('testar')} isLoading={isSaving} />
                        </div>
                    </section>

                    {/* Seção 6: Briefing */}
                    <section>
                        <SectionHeader icon={Target} title="Briefing para Próximo Lançamento" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <TextAreaCard title="Metas..." placeholder="Ex: Meta de Leads: 20.000 / Meta Tx. Conv. Geral Check-in: >3.0%" value={conclusoes.briefing_metas} onChange={e => setConclusoes(prev => ({ ...prev, briefing_metas: e.target.value }))} onSave={() => handleSaveConclusoes('briefing_metas')} isLoading={isSaving} />
                            <TextAreaCard title="Diretrizes..." placeholder="Ex: Públicos: Focar em LAL Compradores. Criativos: Usar VSLs curtas..." value={conclusoes.briefing_estrategia} onChange={e => setConclusoes(prev => ({ ...prev, briefing_estrategia: e.target.value }))} onSave={() => handleSaveConclusoes('briefing_estrategia')} isLoading={isSaving} />
                        </div>
                    </section>
                </div>
            )}

            {/* CSS para o modo de impressão e Cores */}
            <style jsx global>{`
                @media print { .print-hide { display: none !important; } body.print-mode { padding: 0; margin: 0; background-color: #ffffff; } body.print-mode .dark, body.print-mode .dark\:bg-gray-800, body.print-mode .dark\:bg-gray-700, body.print-mode .bg-white { background-color: #ffffff !important; color: #000000 !important; } body.print-mode .dark\:text-white, body.print-mode .dark\:text-gray-100, body.print-mode .dark\:text-gray-200, body.print-mode .dark\:text-gray-300, body.print-mode .text-gray-700, body.print-mode .text-gray-900, body.print-mode .text-gray-800 { color: #000000 !important; } body.print-mode .dark\:text-gray-400, body.print-mode .dark\:text-gray-500, body.print-mode .text-gray-500, body.print-mode .dark\:text-gray-300 /* Ajusta cor cabeçalho tabela */ { color: #333333 !important; } body.print-mode #main-content { padding: 0 !important; margin: 0 !important; } body.print-mode section { page-break-inside: avoid; } body.print-mode .bg-white, body.print-mode .dark\:bg-gray-800, body.print-mode .shadow { box-shadow: none !important; border: 1px solid #ccc !important; } body.print-mode textarea { display: block; border: 1px solid #ddd; padding: 8px; height: 160px; color: #000 !important; background: #fff !important; -webkit-print-color-adjust: exact; } body.print-mode .grid button { display: none; } body.print-mode .divide-y > :not([hidden]) ~ :not([hidden]), body.print-mode .dark\:divide-gray-700 > :not([hidden]) ~ :not([hidden]) { border-color: #ccc !important; } body.print-mode table { border-collapse: collapse; } }
            `}</style>
        </div>
    );
} // Fim do componente DebriefingConversaoPage