// Arquivo: /app/(main)/dashboard/lead-scoring/page.jsx

'use client';

import React, { useState, useEffect, useContext, useMemo, Fragment } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { FaFileCsv, FaFilter, FaUsers, FaUserCheck, FaGlobe, FaBullseye, FaPercent, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';

// --- Componentes de UI ---
const KpiCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm flex items-center gap-3 sm:gap-4">
        <div className="bg-blue-100 dark:bg-gray-700 p-2 sm:p-3 rounded-full">
            <Icon className="text-blue-600 dark:text-blue-400 text-xl sm:text-2xl" />
        </div>
        <div>
            <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
    </div>
);

const Spinner = () => <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

const ScoreDistributionChart = ({ data }) => (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md overflow-hidden">
        <h2 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-gray-200 mb-4">Distribuição por Score (Filtro)</h2>
        <div className="w-full">
            <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" labelLine={false}>
                        {data.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString('pt-BR')} leads`} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const DailyEvolutionChart = ({ data }) => (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md overflow-hidden">
        <h2 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-gray-200 mb-4">Evolução Diária (Filtro)</h2>
        <div className="w-full">
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                    <XAxis dataKey="data" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(55, 65, 81, 0.8)', border: 'none', fontSize: '12px' }} itemStyle={{ color: '#E5E7EB' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="inscricoes" stroke="#8884d8" strokeWidth={2} name="Inscrições" dot={false} />
                    <Line type="monotone" dataKey="checkins" stroke="#82ca9d" strokeWidth={2} name="Check-ins" dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);

// --- Componente da Tabela (Corrigido para Percentuais e Exportação) ---
const ScoringTable = ({ data, launchName }) => {
    const [expandedRows, setExpandedRows] = useState(new Set());
    
    const toggleRow = (key) => { 
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };
    
    const exportToCSV = () => { 
        // Lógica de exportação (mantida)
        if ((data || []).length === 0) {
            toast.error("Nenhum dado para exportar.");
            return;
        }

        const headers = [
            "Canal", 
            "Inscrições", 
            "Check-ins", 
            "Check-ins % Filtro",
            "Frio Count", "Frio %", 
            "M-Frio Count", "M-Frio %", 
            "Morno Count", "Morno %", 
            "Q-Morno Count", "Q-Morno %", 
            "Quente Count", "Quente %",
        ];

        const csvRows = data.map(row => {
            return [
                `"${row.canal}"`,
                row.inscricoes,
                row.check_ins,
                `${row.check_ins_perc_filtro.toFixed(2)}%`,
                row.frio_menos_35_count, 
                `${row.frio_menos_35_perc.toFixed(2)}%`,
                row.morno_frio_count, 
                `${row.morno_frio_perc.toFixed(2)}%`, 
                row.morno_count, 
                `${row.morno_perc.toFixed(2)}%`,
                row.quente_morno_count, 
                `${row.quente_morno_perc.toFixed(2)}%`, 
                row.quente_mais_80_count, 
                `${row.quente_mais_80_perc.toFixed(2)}%`,
            ].join(',');
        });

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) { 
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `${launchName}-scoring-por-canal.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Exportação concluída!");
        } else {
            toast.error("Seu navegador não suporta a exportação de CSV.");
        }
    };

    // Função auxiliar para formatar Count - Percentual (FONTES AUMENTADAS AQUI)
    const formatScore = (count, percent, colorClass) => {
        if (count === 0) return (
            <span className="text-gray-500 dark:text-gray-500 font-normal text-base">0</span> // Aumentado para text-base
        );
        return (
            <div className="flex flex-col md:flex-row md:gap-1 items-center justify-center">
                <span className={`font-bold text-base ${colorClass}`}>{count.toLocaleString('pt-BR')}</span> 
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> 
                    - {percent.toFixed(1)}%
                </span>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-md overflow-x-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-gray-200 whitespace-nowrap">Scoring por Canal</h2>
                <button onClick={exportToCSV} className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors self-end sm:self-center">
                    <FaFileCsv /> Exportar
                </button>
            </div>

            <div className="min-w-max"> 
                {/* Cabeçalho da Tabela (Mantido o layout ajustado) */}
                <div className="hidden md:grid md:grid-cols-[1.5fr_0.5fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-2 py-2 mt-4 text-xs font-medium text-slate-500 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">
                    <span className="col-span-1">Canal</span>
                    <span className="text-center">Inscrições</span>
                    <span className="text-center">Check-ins</span>
                    <span className="text-center text-xs font-normal text-gray-400" title="% do total filtrado">% Ck Total</span>
                    
                    <span className="text-center text-blue-800 dark:text-blue-300 text-sm">Frio</span>
                    <span className="text-center text-sky-500 dark:text-sky-300 text-sm">M-Frio</span>
                    <span className="text-center text-yellow-500 dark:text-yellow-300 text-sm">Morno</span>
                    <span className="text-center text-orange-500 dark:text-orange-300 text-sm">Q-Morno</span>
                    <span className="text-center text-red-600 dark:text-red-300 text-sm">Quente</span>
                </div>

                {/* Corpo da Tabela */}
                <div className="space-y-1 md:space-y-0 md:mt-0">
                    {(data || []).length === 0 ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">Nenhum dado de scoring por canal encontrado para o filtro.</div>
                    ) : (
                        (data || []).map((row, index) => {
                            const key = row.canal + index;
                            const isExpanded = expandedRows.has(key);
                            return (
                                <div key={key} className="bg-slate-50 dark:bg-gray-700/50 rounded-lg shadow-sm md:bg-transparent md:dark:bg-transparent md:shadow-none md:rounded-none">
                                    {/* Linha da Tabela (Principal) */}
                                    <div className={`grid grid-cols-5 md:grid-cols-[1.5fr_0.5fr_1fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 p-2 text-sm font-medium ${index % 2 === 0 ? 'md:bg-white dark:md:bg-gray-800' : 'md:bg-slate-50 dark:md:bg-gray-700/50'} rounded-lg transition-colors`}>
                                        
                                        {/* Coluna 1: Canal + Toggle */}
                                        <span className="col-span-1 md:col-span-1 flex items-center gap-2 text-slate-800 dark:text-gray-100 font-semibold cursor-pointer text-base" onClick={() => toggleRow(key)}>
                                            <span className="md:hidden">{isExpanded ? <FaChevronDown className="text-blue-500" size={10} /> : <FaChevronRight className="text-blue-500" size={10} />}</span>
                                            {row.canal}
                                        </span>

                                        {/* Colunas Iniciais */}
                                        <span className="col-span-1 text-center text-gray-700 dark:text-gray-300 text-base">{row.inscricoes.toLocaleString('pt-BR')}</span>
                                        <span className="col-span-1 text-center text-gray-700 dark:text-gray-300 text-base">{row.check_ins.toLocaleString('pt-BR')}</span>
                                        
                                        {/* Check-ins % Filtro */}
                                        <span className="col-span-2 text-center text-sm font-bold text-blue-500 dark:text-blue-400 md:col-span-1 md:text-base">
                                            {row.check_ins_perc_filtro.toFixed(1)}%
                                        </span>
                                        
                                        {/* Níveis de Score (Contagem - Percentual UNIFICADOS) */}
                                        <span className="col-span-1 text-center hidden md:block">
                                            {formatScore(row.frio_menos_35_count, row.frio_menos_35_perc, 'text-blue-800 dark:text-blue-300')}
                                        </span>
                                        
                                        <span className="col-span-1 text-center hidden md:block">
                                            {formatScore(row.morno_frio_count, row.morno_frio_perc, 'text-sky-500 dark:text-sky-300')}
                                        </span>
                                        
                                        <span className="col-span-1 text-center hidden md:block">
                                            {formatScore(row.morno_count, row.morno_perc, 'text-yellow-500 dark:text-yellow-300')}
                                        </span>

                                        <span className="col-span-1 text-center hidden md:block">
                                            {formatScore(row.quente_morno_count, row.quente_morno_perc, 'text-orange-500 dark:text-orange-300')}
                                        </span>

                                        <span className="col-span-1 text-center hidden md:block">
                                            {formatScore(row.quente_mais_80_count, row.quente_mais_80_perc, 'text-red-600 dark:text-red-300')}
                                        </span>
                                    </div>

                                    {/* Conteúdo Expansível (Mobile View - Fontes ajustadas) */}
                                    {isExpanded && (
                                        <div className="md:hidden p-3 text-sm bg-white dark:bg-gray-700 rounded-b-lg border-t border-gray-100 dark:border-gray-600 grid grid-cols-2 gap-2">
                                            <p className="font-semibold text-gray-500 dark:text-gray-400">Inscrições:</p><p className="text-right text-gray-800 dark:text-gray-100 text-base">{row.inscricoes.toLocaleString('pt-BR')}</p>
                                            <p className="font-semibold text-gray-500 dark:text-gray-400">Check-ins:</p><p className="text-right text-gray-800 dark:text-gray-100 text-base">{row.check_ins.toLocaleString('pt-BR')}</p>
                                            <p className="font-semibold text-blue-500 dark:text-blue-400">Check-ins % Filtro:</p><p className="text-right text-blue-500 dark:text-blue-400 font-bold text-base">{row.check_ins_perc_filtro.toFixed(1)}%</p>
                                            
                                            <p className="font-semibold text-blue-800 dark:text-blue-300">Frio (Count - %):</p><p className="text-right text-blue-800 dark:text-blue-300 text-base">{row.frio_menos_35_count.toLocaleString('pt-BR')} - {row.frio_menos_35_perc.toFixed(1)}%</p>
                                            <p className="font-semibold text-sky-500 dark:text-sky-300">M-Frio (Count - %):</p><p className="text-right text-sky-500 dark:text-sky-300 text-base">{row.morno_frio_count.toLocaleString('pt-BR')} - {row.morno_frio_perc.toFixed(1)}%</p>
                                            <p className="font-semibold text-yellow-500 dark:text-yellow-300">Morno (Count - %):</p><p className="text-right text-yellow-500 dark:text-yellow-300 text-base">{row.morno_count.toLocaleString('pt-BR')} - {row.morno_perc.toFixed(1)}%</p>
                                            <p className="font-semibold text-orange-500 dark:text-orange-300">Q-Morno (Count - %):</p><p className="text-right text-orange-500 dark:text-orange-300 text-base">{row.quente_morno_count.toLocaleString('pt-BR')} - {row.quente_morno_perc.toFixed(1)}%</p>
                                            <p className="font-semibold text-red-600 dark:text-red-300">Quente (Count - %):</p><p className="text-right text-red-600 dark:text-red-300 text-base">{row.quente_mais_80_count.toLocaleString('pt-BR')} - {row.quente_mais_80_perc.toFixed(1)}%</p>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    );
};


// --- Componente Principal da Página ---
export default function LeadScoringPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const userRole = userProfile?.role;
    const userClienteId = userProfile?.cliente_id;

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);

    const [filters, setFilters] = useState({ medium: 'all', source: 'all', content: 'all' });
    const [filterOptions, setFilterOptions] = useState({ mediums: [], sources: [], contents: [] });

    const { medium, source, content } = filters;

    const [dashboardData, setDashboardData] = useState(null);

    // Efeito para buscar Lançamentos (Mantido)
    useEffect(() => {
        if (!userRole) {
            setLaunches([]); setSelectedLaunch(''); setIsLoadingLaunches(false);
            setDashboardData(null); setIsLoadingData(false);
            setFilters({ medium: 'all', source: 'all', content: 'all' });
            setFilterOptions({ mediums: [], sources: [], contents: [] });
            return;
        };
        
        const isAllClients = userRole === 'admin' && selectedClientId === 'all';
        const clientIdToSend = userRole === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userClienteId;

        if (isAllClients) {
            setLaunches([]); setSelectedLaunch(''); setIsLoadingLaunches(false);
            setDashboardData(null); setIsLoadingData(false);
            setFilters({ medium: 'all', source: 'all', content: 'all' });
            setFilterOptions({ mediums: [], sources: [], contents: [] });
            return;
        }

        const fetchLaunches = async () => {
            setIsLoadingLaunches(true); setDashboardData(null); setIsLoadingData(true);
            try {
                const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
                if (error) throw error;
                const sorted = [...(data || [])].sort((a, b) => {
                    if (a.status.toLowerCase() === 'em andamento' && b.status.toLowerCase() !== 'em andamento') return -1;
                    if (b.status.toLowerCase() === 'em andamento' && a.status.toLowerCase() !== 'em andamento') return 1;
                    return (a.codigo || a.nome).localeCompare(b.codigo || b.nome);
                });
                setLaunches(sorted);
                setSelectedLaunch('');
            } catch (err) {
                console.error("Erro ao buscar lançamentos:", err);
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } finally {
                setIsLoadingLaunches(false);
                setIsLoadingData(false);
            }
        };
        fetchLaunches();
    }, [userRole, userClienteId, selectedClientId, supabase]);

    // Efeito para configurar o Header (Mantido)
    useEffect(() => {
        const isClientSelected = !(userRole === 'admin' && selectedClientId === 'all');
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
        
        if (setHeaderContent) {
            setHeaderContent({ title: 'Distribuição de Lead Scoring', controls: launchSelector });
            return () => setHeaderContent({ title: '', controls: null });
        }
    
    }, [selectedLaunch, launches, isLoadingLaunches, userRole, selectedClientId]);


    // Efeito para buscar todos os dados (Mantido)
    useEffect(() => {
        if (!selectedLaunch || !userRole) { 
            setDashboardData(null); 
            setIsLoadingData(false); 
            setFilterOptions({ mediums: [], sources: [], contents: [] });
            return;
        }

        const fetchData = async () => {
            setIsLoadingData(true);
            
            const clientIdToSend = userRole === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userClienteId;
            
            const { data, error } = await supabase.rpc('get_lead_scoring_dashboard', {
                p_launch_id: selectedLaunch,
                p_client_id: clientIdToSend,
                p_utm_medium: medium === 'all' ? null : medium,
                p_utm_source: source === 'all' ? null : source,
                p_utm_content: content === 'all' ? null : content,
            });

            if (error) {
                toast.error(`Erro ao carregar dados: ${error.message}`);
                setDashboardData(null);
                setFilterOptions({ mediums: [], sources: [], contents: [] });
            } else {
                setDashboardData(data);
                setFilterOptions({
                    mediums: data?.filter_options?.mediums || [],
                    sources: data?.filter_options?.sources || [],
                    contents: data?.filter_options?.contents || [],
                });
            }
            setIsLoadingData(false);
        };

        fetchData();
        
    }, [selectedLaunch, medium, source, content, userRole, userClienteId, selectedClientId, supabase]);

    // Memoização dos dados
    const { generalKpis, filteredKpis, scoreDistributionChartData, dailyEvolutionChartData, scoringTableData } = useMemo(() => {
        const data = dashboardData || {};
        const genKpis = data.general_kpis || { inscricoes: 0, checkins: 0 };
        const taxaCheckinGeral = genKpis.inscricoes > 0 ? (genKpis.checkins / genKpis.inscricoes) * 100 : 0;
        const filtKpis = data.filtered_kpis || { inscricoes: 0, checkins: 0 };
        const taxaCheckinFiltrado = filtKpis.inscricoes > 0 ? (filtKpis.checkins / filtKpis.inscricoes) * 100 : 0;
        const scoreData = data.score_distribution || {};
        const scoreChart = [
            { name: 'Quente (>80)', value: scoreData.quente_mais_80 || 0, fill: '#ef4444' },
            { name: 'Quente-Morno (65-79)', value: scoreData.quente_morno || 0, fill: '#f97316' },
            { name: 'Morno (50-64)', value: scoreData.morno || 0, fill: '#eab308' },
            { name: 'Morno-Frio (35-49)', value: scoreData.morno_frio || 0, fill: '#38bdf8' },
            { name: 'Frio (<35)', value: scoreData.frio_menos_35 || 0, fill: '#60a5fa' },
        ].filter(item => item.value > 0);
        return {
            generalKpis: { ...genKpis, taxaCheckin: taxaCheckinGeral },
            filteredKpis: { ...filtKpis, taxaCheckin: taxaCheckinFiltrado },
            scoreDistributionChartData: scoreChart,
            dailyEvolutionChartData: data.daily_evolution || [],
            scoringTableData: data.table_data || [], 
        }
    }, [dashboardData]);

    // Handler para mudança de filtro (Mantido)
    const handleFilterChange = (level, value) => {
        setFilters(prev => {
            const newFilters = { ...prev, [level]: value };
            if (level === 'medium') {
                newFilters.source = 'all';
                newFilters.content = 'all';
            } else if (level === 'source') {
                newFilters.content = 'all';
            }
            return newFilters;
        });
    };

    const filterKey = JSON.stringify(filters);
    const isPageLoading = isLoadingData || isLoadingLaunches;

    return (
        <div className="space-y-4 sm:space-y-6 px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <Toaster position="top-center" />

             {/* KPIs - CORRIGIDO com (value || 0) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3 text-sm sm:text-base">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        <KpiCard 
                            title="Inscrições" 
                            value={(generalKpis.inscricoes || 0).toLocaleString('pt-BR')} 
                            icon={FaGlobe}
                        />
                        <KpiCard 
                            title="Check-ins" 
                            value={(generalKpis.checkins || 0).toLocaleString('pt-BR')} 
                            icon={FaBullseye}
                        />
                        <KpiCard 
                            title="Taxa" 
                            value={`${(generalKpis.taxaCheckin || 0).toFixed(1)}%`} 
                            icon={FaPercent}
                        />
                    </div>
                </div>
                <div className="dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3 text-sm sm:text-base">Totais do Filtro</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        <KpiCard 
                            title="Inscrições" 
                            value={(filteredKpis.inscricoes || 0).toLocaleString('pt-BR')} 
                            icon={FaUsers}
                        />
                        <KpiCard 
                            title="Check-ins" 
                            value={(filteredKpis.checkins || 0).toLocaleString('pt-BR')} 
                            icon={FaUserCheck}
                        />
                        <KpiCard 
                            title="Taxa" 
                            value={`${(filteredKpis.taxaCheckin || 0).toFixed(1)}%`} 
                            icon={FaPercent}
                        />
                    </div>
                </div>
            </section>

             {/* Filtros (Mantido) */}
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600 dark:text-blue-400"/>
                    <h2 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-gray-200">Filtros</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                    {/* 1. UTM Medium */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">UTM Medium</label>
                        <select value={filters.medium} onChange={e => handleFilterChange('medium', e.target.value)} disabled={isPageLoading || !selectedLaunch} className="w-full pl-2 pr-8 sm:pl-3 sm:pr-10 py-1.5 sm:py-2 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md disabled:opacity-50">
                            <option value="all">Todos</option>
                            {filterOptions.mediums.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    {/* 2. UTM Source */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">UTM Source</label>
                        <select 
                            value={filters.source} 
                            onChange={e => handleFilterChange('source', e.target.value)} 
                            disabled={isPageLoading || !selectedLaunch} 
                            className="w-full pl-2 pr-8 sm:pl-3 sm:pr-10 py-1.5 sm:py-2 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md disabled:opacity-50"
                        >
                            <option value="all">Todos</option>
                            {filterOptions.sources.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    {/* 3. UTM Content */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">UTM Content</label>
                        <select 
                            value={filters.content} 
                            onChange={e => handleFilterChange('content', e.target.value)} 
                            disabled={isPageLoading || !selectedLaunch} 
                            className="w-full pl-2 pr-8 sm:pl-3 sm:pr-10 py-1.5 sm:py-2 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md disabled:opacity-50"
                        >
                            <option value="all">Todos</option>
                            {filterOptions.contents.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Gerenciamento de estado de exibição (Mantido) */}
            {isPageLoading ? (
                <Spinner />
            ) : !selectedLaunch && !(userRole === 'admin' && selectedClientId === 'all') ? (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Selecione um lançamento para ver os dados.
                 </div>
            ) : !dashboardData && selectedLaunch ? ( 
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Nenhum dado encontrado para este lançamento ou filtro.
                 </div>
            ) : !selectedLaunch && (userRole === 'admin' && selectedClientId === 'all') ? (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Selecione um cliente específico para ver os dados de scoring.
                 </div>
            ) : dashboardData && ( 
                <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                        {scoreDistributionChartData.length > 0 && <ScoreDistributionChart key={`score-${filterKey}`} data={scoreDistributionChartData} />}
                        {dailyEvolutionChartData.length > 0 && <DailyEvolutionChart key={`daily-${filterKey}`} data={dailyEvolutionChartData} />}
                    </div>
                    <ScoringTable key={`table-${filterKey}`} data={scoringTableData} launchName={launches.find(l => l.id === selectedLaunch)?.codigo || 'export'} />
                </div>
            )}
        </div>
    );
}