'use client';

import React, { useState, useEffect, useCallback, useContext, useMemo } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { Loader2 } from 'lucide-react'; // Usar Loader2
import { Users, UserCheck, Percent } from "lucide-react"; // Manter ícones do Lucide
import { FaFileCsv } from "react-icons/fa"; // Manter FaFileCsv
import toast, { Toaster } from 'react-hot-toast';

// --- Constantes e Configurações ---
const mqlCategories = [
    { key: 'a', letter: 'A', name: '(>= 28)', color: 'text-emerald-500', bgColor: 'bg-emerald-50 dark:bg-emerald-500/10', borderColor: 'border-emerald-500' },
    { key: 'b', letter: 'B', name: '(19-27)', color: 'text-sky-500', bgColor: 'bg-sky-50 dark:bg-sky-500/10', borderColor: 'border-sky-500' },
    { key: 'c', letter: 'C', name: '(11-18)', color: 'text-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-500/10', borderColor: 'border-amber-500' },
    { key: 'd', letter: 'D', name: '(1-10)', color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-500/10', borderColor: 'border-red-500' },
];

// Ordem customizada (sem alterações)
const customQuestionOrder = [
    'Qual a sua idade?', 'Qual é a sua renda mensal?', 'Há quanto tempo você conhece a Professora Izabel?', 'Você já comprou cursos online?', 'Você é de onde?', 'Em qual rede social você conheceu a Professora Izabel?', 'Qual foi a forma de pagamento que você utilizou com mais frequência para se inscrever em cursos online?'
];


// --- Componentes ---
const Spinner = () => ( <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-blue-500" size={32} /></div> ); // Usando Loader2

// KpiCard com ajustes responsivos
const KpiCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm text-center flex flex-col justify-center h-full">
        <Icon className="mx-auto text-blue-500 dark:text-blue-400 mb-1 sm:mb-2 h-5 w-5 sm:h-6 sm:w-6" />
        <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-gray-100">{value}</p>
        <h3 className="text-xs font-medium text-slate-500 dark:text-gray-400 mt-1">{title}</h3>
    </div>
);

// AnswerBreakdownCard com ajustes responsivos
const AnswerBreakdownCard = ({ questionData }) => {
    const totalResponses = useMemo(() => { return questionData.answers?.reduce((sum, answer) => sum + answer.lead_count, 0) || 0; }, [questionData.answers]);

    if (!questionData.answers || totalResponses === 0) { return null; }

    const getDisplayText = (answerText) => {
        try { const parsed = JSON.parse(answerText); if (parsed?.resposta) return parsed.resposta; } catch (e) { /* Ignora */ }
        return answerText;
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm flex flex-col h-full">
            <h3 className="font-bold text-slate-800 dark:text-gray-100 mb-3 sm:mb-4 text-sm sm:text-base">{questionData.question_text}</h3>
            <ul className="space-y-2 sm:space-y-3 flex-grow">
                {questionData.answers.sort((a,b) => b.lead_count - a.lead_count).map((answer, index) => {
                    const percentage = totalResponses > 0 ? (answer.lead_count / totalResponses) * 100 : 0;
                    const displayText = getDisplayText(answer.answer_text);

                    return (
                        <li key={index}>
                            <div className="flex justify-between items-center mb-1 text-xs sm:text-sm">
                                <span className="text-slate-600 dark:text-gray-300 truncate pr-2" title={displayText}>{displayText}</span>
                                <span className="font-medium text-slate-700 dark:text-gray-200 flex-shrink-0">{answer.lead_count.toLocaleString('pt-BR')} <span className="text-slate-400 ml-1 sm:ml-2">({percentage.toFixed(1)}%)</span></span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2.5"><div className="bg-blue-500 h-full rounded-full" style={{ width: `${percentage}%` }}></div></div>
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
    const [selectedMql, setSelectedMql] = useState('a'); // Mantém 'A' como default

    const [dashboardData, setDashboardData] = useState(null);
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false); // Inicia false
    const [isExporting, setIsExporting] = useState(false);

    // --- CORREÇÃO: Efeito para buscar lançamentos (com trava) ---
    useEffect(() => {
        if (!userProfile) return;

        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

        // Se "Todos os Clientes", limpa tudo e para
        if (isAllClients) {
            setLaunches([]); setSelectedLaunch(''); setIsLoadingLaunches(false);
            setDashboardData(null); setIsLoadingData(false);
            return;
        }

        // Busca lançamentos para cliente específico
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true); setDashboardData(null); setIsLoadingData(true);
            try {
                const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
                if (error) throw error;
                const sorted = [...(data || [])].filter(l => l.status !== 'Planejado').sort((a, b) => {
                    if (a.status.toLowerCase() === 'em andamento' && b.status.toLowerCase() !== 'em andamento') return -1;
                    if (b.status.toLowerCase() === 'em andamento' && a.status.toLowerCase() !== 'em andamento') return 1;
                    return (a.codigo || a.nome).localeCompare(b.codigo || b.nome);
                });
                setLaunches(sorted);
                setSelectedLaunch(''); // Não auto-seleciona
            } catch (err) {
                console.error("Erro ao buscar lançamentos:", err);
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } finally {
                setIsLoadingLaunches(false);
                setIsLoadingData(false); // Para spinner principal
            }
        };
        fetchLaunches();
    }, [userProfile, selectedClientId, supabase]);

    // --- CORREÇÃO: Efeito para configurar o Header (com trava) ---
    useEffect(() => {
        const isClientSelected = !(userProfile?.role === 'admin' && selectedClientId === 'all');
        const isDisabled = isLoadingLaunches || !isClientSelected;

        const launchSelector = (
            <select
                value={selectedLaunch}
                onChange={e => setSelectedLaunch(e.target.value)}
                disabled={isDisabled}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
            >
                {!isClientSelected ? (<option value="" disabled>Selecione um cliente</option>)
                 : isLoadingLaunches ? (<option value="" disabled>Carregando...</option>)
                 : launches.length === 0 ? (<option value="" disabled>Nenhum lançamento</option>)
                 : (<option value="">Selecione um lançamento</option>)}
                {launches.map(l => <option key={l.id} value={l.id}>{l.codigo || l.nome} ({l.status})</option>)}
            </select>
        );
        setHeaderContent({ title: 'Análise de MQL por Respostas', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches, userProfile, selectedClientId]);

    // --- CORREÇÃO: Efeito para buscar os dados da dashboard (com trava) ---
    useEffect(() => {
        // Só busca se um lançamento E um MQL forem selecionados
        if (!selectedLaunch || !userProfile || !selectedMql) {
            setDashboardData(null); // Limpa dados
            setIsLoadingData(false); // Garante que spinner pare
            return;
        }

        const fetchData = async () => {
            setIsLoadingData(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            try {
                const { data, error } = await supabase.rpc('get_mql_profile_dashboard', {
                    p_launch_id: selectedLaunch,
                    p_client_id: clientIdToSend,
                    p_mql_category: selectedMql
                });

                if(error) throw error;
                setDashboardData(data);
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                toast.error(`Erro ao carregar dados: ${err.message}`);
                setDashboardData(null);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    // Depende também do selectedMql agora
    }, [selectedLaunch, selectedMql, userProfile, selectedClientId, supabase]);

    // Lógica de exportação (sem alterações significativas)
    const handleExport = async () => {
        if (!selectedLaunch || !selectedMql) { toast.error("Selecione um lançamento e uma categoria."); return; }
        setIsExporting(true);
        const exportToast = toast.loading("Preparando exportação...");
        try {
            const { data: csvText, error } = await supabase.rpc('exportar_perfil_csv', {
                p_launch_id: selectedLaunch, p_score_category: selectedMql, p_score_type: 'mql'
            });
            if (error) throw error;
            if (!csvText) { toast.success("Não há leads para exportar.", { id: exportToast }); return; }
            const blob = new Blob([`\uFEFF${csvText}`], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel PT
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            const launchName = launches.find(l => l.id === selectedLaunch)?.codigo || 'lancamento';
            link.setAttribute("download", `export_${launchName}_mql_${selectedMql}.csv`);
            document.body.appendChild(link); link.click(); document.body.removeChild(link);
            toast.success("Exportação concluída!", { id: exportToast });
        } catch (err) {
            console.error("Erro na exportação:", err);
            toast.error(`Falha na exportação: ${err.message}`, { id: exportToast });
        } finally {
            setIsExporting(false);
        }
    };

    // Processamento dos dados para exibição (sem alterações)
    const { generalKpis, mqlKpiData, breakdownData } = useMemo(() => {
        return {
            generalKpis: dashboardData?.general_kpis || { total_inscricoes: 0, total_checkins: 0 },
            mqlKpiData: dashboardData?.mql_kpis || {},
            breakdownData: dashboardData?.breakdown_data || [],
        };
    }, [dashboardData]);

    const taxaDeCheckin = generalKpis.total_inscricoes > 0 ? ((generalKpis.total_checkins / generalKpis.total_inscricoes) * 100).toFixed(1) + '%' : '0.0%';

    // Condição de loading principal
    const isPageLoading = isLoadingData || isLoadingLaunches;

    return (
        // Padding responsivo
        <div className="p-2 sm:p-4 lg:p-6 bg-slate-50 dark:bg-gray-900 min-h-screen space-y-4 sm:space-y-6">
            <Toaster position="top-center" />

            {/* KPIs Gerais */}
            <section className="bg-gray-100 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg shadow-sm">
                <h3 className="font-bold text-center text-slate-600 dark:text-gray-300 mb-3 text-sm sm:text-base">Totais do Lançamento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <KpiCard title="Inscrições" value={isPageLoading ? '...' : generalKpis.total_inscricoes.toLocaleString('pt-BR')} icon={Users} />
                    <KpiCard title="Check-ins" value={isPageLoading ? '...' : generalKpis.total_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                    <KpiCard title="Taxa" value={isPageLoading ? '...' : taxaDeCheckin} icon={Percent} />
                </div>
            </section>

             {/* Seleção de MQL e Exportação */}
            <section className="bg-gray-100 dark:bg-gray-800/50 p-3 sm:p-4 rounded-lg shadow-sm">
                <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
                    {/* Grid responsivo para botões de MQL */}
                    {/* Alterado para grid-cols-2 md:grid-cols-4 */}
                    <div className="flex-grow grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                        {mqlCategories.map(cat => {
                            const totalLeadsCategoria = mqlKpiData?.[cat.key] ?? 0;
                            // Calcula percentual baseado no TOTAL de checkins
                            const percentage = generalKpis.total_checkins > 0 ? (totalLeadsCategoria / generalKpis.total_checkins) * 100 : 0;
                            return (
                                <button
                                    key={cat.key}
                                    onClick={() => setSelectedMql(cat.key)}
                                    // Padding e altura responsivos
                                    className={`p-2 sm:p-4 rounded-lg shadow-sm transition-all duration-200 border-2 flex items-center justify-center gap-2 sm:gap-4 min-h-[100px] sm:min-h-[140px] ${selectedMql === cat.key ? `${cat.bgColor} ${cat.borderColor}` : 'bg-white dark:bg-gray-800 border-transparent hover:border-slate-300 dark:hover:border-gray-600'}`}
                                >
                                     {/* Tamanho da letra responsivo */}
                                    <span className={`text-4xl sm:text-6xl md:text-7xl font-black ${cat.color}`}>{cat.letter}</span>
                                    <div className="flex flex-col items-start text-left">
                                         {/* Tamanho da fonte responsivo */}
                                        <p className={`text-xl sm:text-3xl md:text-4xl font-bold text-slate-800 dark:text-gray-100`}>{isLoadingData ? '...' : totalLeadsCategoria.toLocaleString('pt-BR')}</p>
                                        <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">{cat.name}</p>
                                        <p className="hidden xs:block text-sm sm:text-base font-bold text-slate-700 dark:text-gray-200 mt-1">({percentage.toFixed(1)}%)</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                     {/* Botão de Exportar */}
                    <div className="flex-shrink-0 mt-3 md:mt-0 md:ml-4">
                        <button
                            onClick={handleExport}
                            disabled={isExporting || isLoadingData || !selectedLaunch} // Desabilita se não houver lançamento
                            className="w-full h-full flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                        >
                            <FaFileCsv /> Exportar Leads
                        </button>
                    </div>
                </div>
            </section>

             {/* Conteúdo Principal (Cards de Perfil) */}
            <main>
                {/* Gerenciamento de estado de exibição */}
                {isPageLoading && selectedLaunch ? ( // Mostra spinner só se estiver carregando E um lançamento estiver selecionado
                    <Spinner />
                 ) : !selectedLaunch && !(userProfile?.role === 'admin' && selectedClientId === 'all') ? (
                     <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-sm sm:text-base text-slate-500 dark:text-gray-400">
                        Selecione um lançamento para ver o perfil.
                    </div>
                 ) : !dashboardData && selectedLaunch && !isLoadingData ? ( // Se terminou de carregar (isLoadingData=false) mas não veio nada
                     <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-sm sm:text-base text-slate-500 dark:text-gray-400">
                        Nenhum dado encontrado para este lançamento ou categoria MQL.
                    </div>
                 ) : !selectedLaunch && (userProfile?.role === 'admin' && selectedClientId === 'all') ? (
                    <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-sm sm:text-base text-slate-500 dark:text-gray-400">
                       Selecione um cliente específico para ver o perfil MQL.
                   </div>
               ) : breakdownData && breakdownData.length > 0 ? (
                    // Grid responsivo para os cards de perguntas
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {breakdownData
                            .slice() // Cria cópia para não mutar o original
                            .sort((a, b) => { // Ordena pela ordem customizada
                                const indexA = customQuestionOrder.indexOf(a.question_text);
                                const indexB = customQuestionOrder.indexOf(b.question_text);
                                if (indexA === -1 && indexB === -1) return 0;
                                if (indexA === -1) return 1;
                                if (indexB === -1) return -1;
                                return indexA - indexB;
                            })
                            .map(question => (
                                <AnswerBreakdownCard key={question.question_id} questionData={question} />
                            ))
                        }
                    </div>
                ) : (
                    // Mensagem se `breakdownData` estiver vazio após carregar
                     <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-sm sm:text-base text-slate-500 dark:text-gray-400">
                        Não há dados de respostas para esta categoria MQL.
                    </div>
                )}
            </main>
        </div>
    );
}
