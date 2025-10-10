// /src/app/(main)/Dashboards/perfil-de-score/page.jsx
'use client';

import { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaFileCsv } from "react-icons/fa";
import { Users, UserCheck, Percent } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

// --- Constantes e Configurações ---
const scoreCategories = [
    { key: 'quente', name: 'Quente (>=80)', color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-500/10', borderColor: 'border-red-500' },
    { key: 'quente_morno', name: 'Quente-Morno (65-79)', color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-500/10', borderColor: 'border-orange-500' },
    { key: 'morno', name: 'Morno (50-64)', color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-500/10', borderColor: 'border-amber-500' },
    { key: 'morno_frio', name: 'Morno-Frio (35-49)', color: 'text-sky-500', bgColor: 'bg-sky-50 dark:bg-sky-500/10', borderColor: 'border-sky-500' },
    { key: 'frio', name: 'Frio (1-34)', color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-500/10', borderColor: 'border-blue-500' },
];

const customQuestionOrder = [
    'Qual a sua idade?', 'Qual é a sua renda mensal?', 'Há quanto tempo você conhece a Professora Izabel?', 'Você já comprou cursos online?', 'Você é de onde?', 'Em qual rede social você conheceu a Professora Izabel?', 'Qual foi a forma de pagamento que você utilizou com mais frequência para se inscrever em cursos online?'
];

// --- Componentes ---
const Spinner = () => ( <div className="flex justify-center items-center h-40"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div> );
const KpiCard = ({ title, value, icon: Icon }) => ( <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm text-center flex flex-col justify-center h-full"><Icon className="mx-auto text-blue-500 mb-2" size={28} /><p className="text-3xl font-bold text-slate-800 dark:text-gray-100">{value}</p><h3 className="text-sm font-medium text-slate-500 dark:text-gray-400 mt-1">{title}</h3></div> );

// --- COMPONENTE ATUALIZADO ---
const ScoreProfileCard = ({ questionData }) => {
    const totalResponses = useMemo(() => questionData.answers?.reduce((sum, answer) => sum + answer.lead_count, 0) || 0, [questionData.answers]);
    
    if (!questionData.answers || totalResponses === 0) return null;

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
            <ul className="space-y-3 flex-grow">{questionData.answers.sort((a, b) => b.lead_count - a.lead_count).map((answer, index) => {
                const percentage = totalResponses > 0 ? (answer.lead_count / totalResponses) * 100 : 0;
                const displayText = getDisplayText(answer.answer_text);

                return (
                    <li key={index}>
                        <div className="flex justify-between items-center mb-1 text-sm">
                            <span className="text-slate-600 dark:text-gray-300">{displayText}</span>
                            <span className="font-medium text-slate-700 dark:text-gray-200">
                                {answer.lead_count.toLocaleString('pt-BR')}
                                <span className="text-slate-400 ml-2">({percentage.toFixed(1)}%)</span>
                            </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                        </div>
                    </li>
                );
            })}</ul>
        </div>
    );
};


export default function PerfilDeScorePage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [selectedScore, setSelectedScore] = useState('quente');
    
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
                    if (a.status === 'Em andamento' && b.status !== 'Em andamento') return -1;
                    if (b.status === 'Em andamento' && a.status !== 'Em andamento') return 1;
                    return (a.codigo || a.nome).localeCompare(b.codigo || b.nome);
                });
                setLaunches(sorted);
                if (sorted.length > 0) {
                    const inProgress = sorted.find(l => l.status === 'Em andamento');
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
        setHeaderContent({ title: 'Perfil de Score por Respostas', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    // Efeito para buscar os dados da dashboard
    useEffect(() => {
        if (!selectedLaunch || !userProfile || !selectedScore) return;
        
        const fetchData = async () => {
            setIsLoadingData(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_score_profile_dashboard', {
                p_launch_id: selectedLaunch,
                p_client_id: clientIdToSend,
                p_score_category: selectedScore
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
    }, [selectedLaunch, selectedScore, userProfile, selectedClientId, supabase]);

    const handleExport = async () => {
        if (!selectedLaunch || !selectedScore) { toast.error("Selecione um lançamento e um perfil de score para exportar."); return; }
        setIsExporting(true);
        const exportToast = toast.loading("A preparar a exportação completa...");
        try {
            const { data: csvText, error } = await supabase.rpc('exportar_perfil_csv', {
                p_launch_id: selectedLaunch,
                p_score_category: selectedScore,
                p_score_type: 'score'
            });
            if (error) throw error;
            if (!csvText) { toast.success("Não há leads para exportar neste perfil de score.", { id: exportToast }); return; }
            const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const launchName = launches.find(l => l.id === selectedLaunch)?.codigo || 'lancamento';
            link.setAttribute("download", `export_completo_${launchName}_${selectedScore}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Exportação completa concluída!", { id: exportToast });
        } catch (err) {
            console.error("Erro na exportação:", err);
            toast.error(`Falha na exportação: ${err.message}`, { id: exportToast });
        } finally {
            setIsExporting(false);
        }
    };

    const { generalKpis, scoreKpiData, breakdownData } = useMemo(() => {
        return {
            generalKpis: dashboardData?.general_kpis || { total_inscricoes: 0, total_checkins: 0 },
            scoreKpiData: dashboardData?.score_kpis || {},
            breakdownData: dashboardData?.breakdown_data || [],
        };
    }, [dashboardData]);
    
    const taxaDeCheckin = generalKpis.total_inscricoes > 0 ? ((generalKpis.total_checkins / generalKpis.total_inscricoes) * 100).toFixed(1) + '%' : '0.0%';

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-gray-900 min-h-screen space-y-6">
            <Toaster position="top-center" />
            
            <section className="space-y-6">
                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm">
                    <h3 className="font-bold text-center text-slate-600 dark:text-gray-300 mb-3">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard title="Total de Inscrições" value={isLoadingData ? '...' : generalKpis.total_inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Total de Check-ins" value={isLoadingData ? '...' : generalKpis.total_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Check-in" value={isLoadingData ? '...' : taxaDeCheckin} icon={Percent} />
                    </div>
                </div>

                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                            {scoreCategories.map(cat => {
                                const totalLeadsCategoria = scoreKpiData?.[cat.key] ?? 0;
                                const percentage = generalKpis.total_checkins > 0 ? (totalLeadsCategoria / generalKpis.total_checkins) * 100 : 0;
                                return (
                                <button key={cat.key} onClick={() => setSelectedScore(cat.key)} className={`p-4 rounded-lg shadow-sm text-center transition-all duration-200 border-2 flex flex-col justify-center min-h-[140px] ${selectedScore === cat.key ? `${cat.bgColor} ${cat.borderColor}` : 'bg-white dark:bg-gray-800 border-transparent hover:border-slate-300 dark:hover:border-gray-600'}`}>
                                    <p className="text-base font-medium text-slate-600 dark:text-gray-300">{cat.name}</p>
                                    <p className={`text-3xl font-bold ${cat.color} mt-1`}>{isLoadingData ? '...' : totalLeadsCategoria.toLocaleString('pt-BR')}</p>
                                    <p className="text-lg font-bold text-slate-800 dark:text-gray-100 mt-2">({percentage.toFixed(1)}%)</p>
                                </button>
                                );
                            })}
                        </div>
                        <div className="flex-shrink-0">
                            <button onClick={handleExport} disabled={isExporting || isLoadingData} className="w-full h-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-base"><FaFileCsv />Exportar Leads</button>
                        </div>
                    </div>
                </div>
            </section>

            <main>
                {isLoadingData ? <Spinner /> : (
                    breakdownData && breakdownData.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {breakdownData
                                .slice()
                                .sort((a, b) => {
                                    const indexA = customQuestionOrder.indexOf(a.question_text);
                                    const indexB = customQuestionOrder.indexOf(b.question_text);
                                    if (indexA === -1) return 1;
                                    if (indexB === -1) return -1;
                                    return indexA - indexB;
                                })
                                .map(question => (
                                    <ScoreProfileCard key={question.question_id} questionData={question} />
                                ))
                            }
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                            <p className="text-slate-500 dark:text-gray-400">Nenhum dado encontrado para este perfil de score.</p>
                        </div>
                    )
                )}
            </main>
        </div>
    );
}