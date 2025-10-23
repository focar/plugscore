// src\app\(main)\Dashboards\perfil-de-mql\page.jsx
'use client';

import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaFileCsv } from "react-icons/fa";
import { Users, UserCheck, Percent } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

// --- Constantes e Configurações (COM A NOVA ESCALA) ---
const mqlCategories = [
    { key: 'a', letter: 'A', name: '(>= 28)', color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10', borderColor: 'border-emerald-500' },
    { key: 'b', letter: 'B', name: '(19-27)', color: 'text-sky-500', bgColor: 'bg-sky-50 dark:bg-sky-500/10', borderColor: 'border-sky-500' },
    { key: 'c', letter: 'C', name: '(11-18)', color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-500/10', borderColor: 'border-amber-500' },
    { key: 'd', letter: 'D', name: '(1-10)', color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-500/10', borderColor: 'border-red-500' },
];

// --- Componentes ---
const Spinner = () => ( <div className="flex justify-center items-center h-40"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div> );
const KpiCard = ({ title, value, icon: Icon }) => ( <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-sm text-center flex flex-col justify-center h-full"><Icon className="mx-auto text-blue-500 mb-1.5" size={24} /><p className="text-2xl font-bold text-slate-800 dark:text-gray-100">{value}</p><h3 className="text-xs font-medium text-slate-500 dark:text-gray-400 mt-0.5">{title}</h3></div> );

const AnswerBreakdownCard = ({ questionData }) => {
    const totalResponses = useMemo(() => { return questionData.answers?.reduce((sum, answer) => sum + answer.lead_count, 0) || 0; }, [questionData.answers]);
    
    if (!questionData.answers || totalResponses === 0) { return null; }

    const getDisplayText = (answerText) => {
        try {
            const parsed = JSON.parse(answerText);
            if (parsed && typeof parsed === 'object' && parsed.hasOwnProperty('resposta')) {
                return parsed.resposta;
            }
        } catch (e) {
            // Não é um JSON, retorna o texto original
            return answerText;
        }
        return answerText; // Fallback para o texto original se o JSON não tiver a propriedade 'resposta'
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm flex flex-col h-full">
            <h3 className="font-bold text-slate-800 dark:text-gray-100 mb-4">{questionData.question_text}</h3>
            <ul className="space-y-3 flex-grow">
                {questionData.answers.sort((a,b) => b.lead_count - a.lead_count).map((answer, index) => {
                    const percentage = totalResponses > 0 ? (answer.lead_count / totalResponses) * 100 : 0;
                    const displayText = getDisplayText(answer.answer_text);
                    
                    return (
                        <li key={index}>
                            <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="text-slate-600 dark:text-gray-300">{displayText}</span>
                                <span className="font-medium text-slate-700 dark:text-gray-200">{answer.lead_count.toLocaleString('pt-BR')} <span className="text-slate-400 ml-2">({percentage.toFixed(1)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div></div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default function AnaliseMqlPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);
    
    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [selectedMql, setSelectedMql] = useState('a');
    
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    // Efeito para buscar lançamentos
    useEffect(() => {
        if (!userProfile) return;
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });

            if (error) {
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } else {
                const sorted = [...(data || [])].sort((a, b) => {
                    if (a.status.toLowerCase() === 'em andamento' && b.status.toLowerCase() !== 'em andamento') return -1;
                    if (b.status.toLowerCase() === 'em andamento' && a.status.toLowerCase() !== 'em andamento') return 1;
                    return (a.codigo || a.nome).localeCompare(b.codigo || b.nome);
                });
                setLaunches(sorted);
                if (sorted.length > 0) {
                    const inProgress = sorted.find(l => l.status.toLowerCase() === 'em andamento');
                    setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
                } else {
                    setSelectedLaunch('');
                }
            }
            setIsLoadingLaunches(false);
        };
        fetchLaunches();
    }, [userProfile, selectedClientId, supabase]);
    
    // Efeito para configurar o Header dinamicamente
    useEffect(() => {
        const launchSelector = (
            <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} disabled={isLoadingLaunches || launches.length === 0} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2">
                {isLoadingLaunches ? <option>A carregar...</option> :
                    launches.length > 0 ?
                    launches.map(l => <option key={l.id} value={l.id}>{(l.codigo || l.nome)} ({l.status})</option>) :
                    <option>Nenhum lançamento</option>}
            </select>
        );
        setHeaderContent({ title: 'Análise de MQL por Respostas', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    // Efeito para buscar os dados da dashboard
    useEffect(() => {
        if (!selectedLaunch || !userProfile || !selectedMql) return;
        
        const fetchData = async () => {
            setIsLoadingData(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_mql_profile_dashboard', {
                p_launch_id: selectedLaunch,
                p_client_id: clientIdToSend,
                p_mql_category: selectedMql
            });

            if(error) {
                toast.error(`Erro ao carregar dados: ${error.message}`);
                setDashboardData(null);
            } else {
                setDashboardData(data);
            }
            setIsLoadingData(false);
        };

        fetchData();
    }, [selectedLaunch, selectedMql, userProfile, selectedClientId, supabase]);

    // Lógica de exportação
    const handleExport = async () => {
        if (!selectedLaunch || !selectedMql) { toast.error("Selecione um lançamento e uma categoria para exportar."); return; }
        setIsExporting(true);
        const exportToast = toast.loading("A preparar a exportação...");
        try {
            const { data: csvText, error } = await supabase.rpc('exportar_perfil_csv', {
                p_launch_id: selectedLaunch,
                p_score_category: selectedMql,
                p_score_type: 'mql'
            });
            if (error) throw error;
            if (!csvText) { toast.success("Não há leads para exportar nesta categoria.", { id: exportToast }); return; }
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const launchName = launches.find(l => l.id === selectedLaunch)?.codigo || 'lancamento';
            link.setAttribute("download", `export_${launchName}_mql_${selectedMql}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Exportação concluída com sucesso!", { id: exportToast });
        } catch (err) {
            console.error("Erro na exportação:", err);
            toast.error(`Falha na exportação: ${err.message}`, { id: exportToast });
        } finally {
            setIsExporting(false);
        }
    };

    // Processamento dos dados para exibição
    const { generalKpis, mqlKpiData, breakdownData } = useMemo(() => {
        return {
            generalKpis: dashboardData?.general_kpis || { total_inscricoes: 0, total_checkins: 0 },
            mqlKpiData: dashboardData?.mql_kpis || {},
            breakdownData: dashboardData?.breakdown_data || [],
        };
    }, [dashboardData]);
    
    const taxaDeCheckin = generalKpis.total_inscricoes > 0 ? ((generalKpis.total_checkins / generalKpis.total_inscricoes) * 100).toFixed(1) + '%' : '0.0%';

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-gray-900 min-h-screen space-y-6">
            <Toaster position="top-center" />
            
            <section className="space-y-6">
                {/* --- KPIs Gerais (Layout já responsivo) --- */}
                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm">
                    <h3 className="font-bold text-center text-slate-600 dark:text-gray-300 mb-3">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard title="Total de Inscrições" value={isLoadingData ? '...' : generalKpis.total_inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Total de Check-ins" value={isLoadingData ? '...' : generalKpis.total_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Check-in" value={isLoadingData ? '...' : taxaDeCheckin} icon={Percent} />
                    </div>
                </div>

                {/* --- KPIs de MQL (Cards A, B, C, D) --- */}
                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* --- MUDANÇA: O grid 'grid-cols-2' está correto para mobile. O problema são as fontes. --- */}
                        <div className="flex-grow grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          {mqlCategories.map(cat => {
                                const totalLeadsCategoria = mqlKpiData?.[cat.key] ?? 0;
                                const percentage = generalKpis.total_checkins > 0 ? (totalLeadsCategoria / generalKpis.total_checkins) * 100 : 0;
                                return (
                                    // *** MUDANÇA: Padding (p-3) e gap (gap-2) reduzidos no mobile ***
                                    <button key={cat.key} onClick={() => setSelectedMql(cat.key)} className={`p-3 md:p-4 rounded-lg shadow-sm transition-all duration-200 border-2 flex items-center gap-2 md:gap-4 ${ selectedMql === cat.key ? `${cat.bgColor} ${cat.borderColor}` : 'bg-white dark:bg-gray-800 border-transparent hover:border-slate-300 dark:hover:border-gray-600' }`} >
                                        
                                        {/* *** MUDANÇA: Tamanho da fonte reduzido no mobile (text-6xl) e mantido no desktop (md:text-7xl) *** */}
                                        <span className={`text-6xl md:text-7xl font-black ${cat.color} -mt-2`}>{cat.letter}</span>
                                        
                                        <div className="flex flex-col items-start text-left">
                                            {/* *** MUDANÇA: Tamanho da fonte reduzido no mobile (text-3xl) e mantido no desktop (md:text-4xl) *** */}
                                            <p className={`text-3xl md:text-4xl font-bold text-slate-800 dark:text-gray-100`}>{isLoadingData ? '...' : totalLeadsCategoria.toLocaleString('pt-BR')}</p>
                                            <p className="text-sm text-slate-500 dark:text-gray-400">{cat.name}</p>
                                            <p className="text-base font-bold text-slate-700 dark:text-gray-200 mt-1">({percentage.toFixed(1)}%)</p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* --- Botão Exportar (Layout já responsivo) --- */}
                        <div className="flex-shrink-0">
                            <button onClick={handleExport} disabled={isExporting || isLoadingData} className="w-full h-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-base">
                                {isExporting ? <FaSpinner className="animate-spin" /> : <FaFileCsv />}
                                Exportar Leads
                            </button>
                        </div>
                    </div>
                </div>
            </section>
            
            <main>
                {isLoadingData ? <Spinner /> : (
                    breakdownData && breakdownData.length > 0 ? (
                        // --- Cards de Resposta (Layout já responsivo) ---
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {breakdownData.map(question => (
                                <AnswerBreakdownCard key={question.question_id} questionData={question} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <p className="text-slate-600 dark:text-gray-300 font-semibold">Nenhum dado encontrado para esta categoria de MQL.</p>
                            <p className="text-slate-400 text-sm mt-2">Isto pode significar que nenhum lead se enquadra nesta faixa de pontuação ou os scores MQL ainda não foram calculados.</p>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}