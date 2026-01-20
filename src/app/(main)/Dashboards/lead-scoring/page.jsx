// Arquivo: /app/(main)/dashboard/lead-scoring/page.jsx
'use client';

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { FaFileCsv, FaFilter, FaUsers, FaUserCheck, FaGlobe, FaBullseye, FaPercent, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Loader2 } from 'lucide-react';

// --- Componentes de UI ---
const KpiCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm flex items-center gap-3 sm:gap-4 border border-transparent dark:border-gray-700">
        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 sm:p-3 rounded-full">
            <Icon className="text-blue-600 dark:text-blue-400 text-xl sm:text-xl" />
        </div>
        <div>
            <p className="text-xs sm:text-base text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

const Spinner = () => <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;

const ScoreDistributionChart = ({ data }) => (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md overflow-hidden border border-transparent dark:border-gray-700">
        <h2 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-white mb-4">Distribuição por Score (Filtro)</h2>
        <div className="w-full">
            <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" labelLine={false}>
                        {data.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                        formatter={(value) => [`${value.toLocaleString('pt-BR')} leads`, 'Quantidade']} 
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const DailyEvolutionChart = ({ data }) => (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md overflow-hidden border border-transparent dark:border-gray-700">
        <h2 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-white mb-4">Evolução Diária (Filtro)</h2>
        <div className="w-full">
            <ResponsiveContainer width="100%" height={350}>
                <LineChart data={data} margin={{ top: 5, right: 15, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="data" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <YAxis allowDecimals={false} stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', fontSize: '12px', color: '#fff' }} itemStyle={{ color: '#E5E7EB' }} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="inscricoes" stroke="#818cf8" strokeWidth={2} name="Inscrições" dot={false} />
                    <Line type="monotone" dataKey="checkins" stroke="#34d399" strokeWidth={2} name="Check-ins" dot={false} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const ScoringTable = ({ data, launchName }) => {
    const [expandedRows, setExpandedRows] = useState(new Set());
    
    const toggleRow = (key) => { 
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            return newSet;
        });
    };
    
    const exportToCSV = () => { 
        if ((data || []).length === 0) {
            toast.error("Nenhum dado para exportar.");
            return;
        }
        const headers = ["Canal", "Inscrições", "Check-ins", "Check-ins % Filtro", "Frio Count", "Frio %", "Morno Count", "Morno %", "Quente Count", "Quente %", "Premium Count", "Premium %"];
        const csvRows = data.map(row => [
            `"${row.canal}"`, row.inscricoes, row.check_ins, `${row.check_ins_perc_filtro.toFixed(2)}%`,
            row.frio_count, `${row.frio_perc.toFixed(2)}%`,
            row.morno_count, `${row.morno_perc.toFixed(2)}%`,
            row.quente_count, `${row.quente_perc.toFixed(2)}%`,
            row.premium_count, `${row.premium_perc.toFixed(2)}%`
        ].join(','));

        const csvContent = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${launchName}-scoring-por-canal.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Exportação concluída!");
    };

    const formatScore = (count, percent, colorClass) => {
        if (count === 0) return <span className="text-gray-500 dark:text-gray-500 font-normal text-base">0</span>;
        return (
            <div className="flex flex-col md:flex-row md:gap-1 items-center justify-center">
                <span className={`font-bold text-base ${colorClass}`}>{count.toLocaleString('pt-BR')}</span> 
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400">- {percent.toFixed(1)}%</span>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-md overflow-x-auto border border-transparent dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                <h2 className="text-base sm:text-lg font-semibold text-slate-700 dark:text-white whitespace-nowrap">Scoring por Canal</h2>
                <button onClick={exportToCSV} className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 bg-blue-600 text-white text-xs sm:text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors">
                    <FaFileCsv /> Exportar
                </button>
            </div>

            <div className="min-w-max"> 
                <div className="hidden md:grid md:grid-cols-[1.5fr_0.5fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-2 py-2 mt-4 text-xs font-medium text-slate-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                    <span>Canal</span>
                    <span className="text-center">Insc.</span>
                    <span className="text-center">Ck.</span>
                    <span className="text-center">% Total</span>
                    <span className="text-center text-blue-500 text-sm">Frio</span>
                    <span className="text-center text-amber-500 text-sm">Morno</span>
                    <span className="text-center text-red-500 text-sm">Quente</span>
                    <span className="text-center text-purple-500 text-sm">Premium</span>
                </div>

                <div className="space-y-1 md:space-y-0">
                    {(data || []).length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">Sem dados disponíveis.</div>
                    ) : (
                        data.map((row, index) => {
                            const key = row.canal + index;
                            const isExpanded = expandedRows.has(key);
                            return (
                                <div key={key} className="bg-slate-50 dark:bg-gray-900/40 rounded-lg md:bg-transparent">
                                    <div className={`grid grid-cols-5 md:grid-cols-[1.5fr_0.5fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-4 p-2 text-sm font-medium ${index % 2 === 0 ? 'md:bg-white dark:md:bg-gray-800' : 'md:bg-slate-50 dark:md:bg-gray-900/20'} rounded-lg items-center`}>
                                        <span className="flex items-center gap-2 text-slate-800 dark:text-white font-semibold cursor-pointer text-base" onClick={() => toggleRow(key)}>
                                            <span className="md:hidden">{isExpanded ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}</span>
                                            {row.canal}
                                        </span>
                                        <span className="text-center text-base text-slate-700 dark:text-gray-300">{row.inscricoes.toLocaleString('pt-BR')}</span>
                                        <span className="text-center text-base text-slate-700 dark:text-gray-300">{row.check_ins.toLocaleString('pt-BR')}</span>
                                        <span className="text-center text-sm font-bold text-blue-500">{row.check_ins_perc_filtro.toFixed(1)}%</span>
                                        <span className="hidden md:block text-center">{formatScore(row.frio_count, row.frio_perc, 'text-blue-500')}</span>
                                        <span className="hidden md:block text-center">{formatScore(row.morno_count, row.morno_perc, 'text-amber-500')}</span>
                                        <span className="hidden md:block text-center">{formatScore(row.quente_count, row.quente_perc, 'text-red-500')}</span>
                                        <span className="hidden md:block text-center">{formatScore(row.premium_count, row.premium_perc, 'text-purple-500')}</span>
                                    </div>
                                    {isExpanded && (
                                        <div className="md:hidden p-3 text-sm bg-white dark:bg-gray-700 rounded-b-lg grid grid-cols-2 gap-2 border-t dark:border-gray-600">
                                            <p className="text-blue-500">Frio:</p><p className="text-right dark:text-white">{row.frio_count} ({row.frio_perc.toFixed(1)}%)</p>
                                            <p className="text-amber-500">Morno:</p><p className="text-right dark:text-white">{row.morno_count} ({row.morno_perc.toFixed(1)}%)</p>
                                            <p className="text-red-500">Quente:</p><p className="text-right dark:text-white">{row.quente_count} ({row.quente_perc.toFixed(1)}%)</p>
                                            <p className="text-purple-500">Premium:</p><p className="text-right dark:text-white">{row.premium_count} ({row.premium_perc.toFixed(1)}%)</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default function LeadScoringPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);
    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [filters, setFilters] = useState({ medium: 'all', source: 'all', content: 'all' });
    const [filterOptions, setFilterOptions] = useState({ mediums: [], sources: [], contents: [] });
    const [dashboardData, setDashboardData] = useState(null);

    useEffect(() => {
        if (!userProfile?.role) return;
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            const { data } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
            setLaunches(data || []);
            setIsLoadingLaunches(false);
        };
        fetchLaunches();
    }, [selectedClientId, userProfile]);

    useEffect(() => {
        if (setHeaderContent) {
            setHeaderContent({ 
                title: 'Lead Scoring', 
                controls: (
                    <select 
                        value={selectedLaunch} 
                        onChange={e => setSelectedLaunch(e.target.value)} 
                        className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-slate-900 dark:text-white text-sm rounded-lg block w-full p-2 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="" className="bg-white dark:bg-gray-800">Selecione um lançamento</option>
                        {launches.map(l => (
                            <option key={l.id} value={l.id} className="bg-white dark:bg-gray-800">
                                {l.codigo || l.nome}
                            </option>
                        ))}
                    </select>
                )
            });
        }
    }, [selectedLaunch, launches]);

    useEffect(() => {
        if (!selectedLaunch) return;
        const fetchData = async () => {
            setIsLoadingData(true);
            const { data, error } = await supabase.rpc('get_lead_scoring_dashboard', {
                p_launch_id: selectedLaunch,
                p_utm_medium: filters.medium === 'all' ? null : filters.medium,
                p_utm_source: filters.source === 'all' ? null : filters.source,
                p_utm_content: filters.content === 'all' ? null : filters.content,
            });
            if (error) {
                toast.error("Erro ao carregar dados.");
            } else {
                setDashboardData(data);
                setFilterOptions({
                    mediums: data?.filter_options?.mediums || [],
                    sources: data?.filter_options?.sources || [],
                    contents: data?.filter_options?.contents || []
                });
            }
            setIsLoadingData(false);
        };
        fetchData();
    }, [selectedLaunch, filters]);

    const { generalKpis, filteredKpis, scoreDistributionChartData, dailyEvolutionChartData, scoringTableData } = useMemo(() => {
        const d = dashboardData || {};
        const score = d.score_distribution || {};
        return {
            generalKpis: d.general_kpis || { inscricoes: 0, checkins: 0 },
            filteredKpis: d.filtered_kpis || { inscricoes: 0, checkins: 0 },
            scoreDistributionChartData: [
                { name: 'Premium (85-100)', value: score.premium || 0, fill: '#a855f7' },
                { name: 'Quente (70-84)', value: score.quente || 0, fill: '#ef4444' },
                { name: 'Morno (55-69)', value: score.morno || 0, fill: '#f59e0b' },
                { name: 'Frio (0-54)', value: score.frio || 0, fill: '#3b82f6' }
            ].filter(i => i.value > 0),
            dailyEvolutionChartData: d.daily_evolution || [],
            scoringTableData: d.table_data || []
        };
    }, [dashboardData]);

    const handleFilterChange = (key, val) => setFilters(p => ({ ...p, [key]: val }));

    return (
        <div className="space-y-6 p-4 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <Toaster />
            
            {/* KPIs Totais */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-800/40 p-3 rounded-xl border dark:border-gray-700">
                    <KpiCard title="Insc. Total" value={generalKpis.inscricoes.toLocaleString('pt-BR')} icon={FaGlobe} />
                    <KpiCard title="Ck. Total" value={generalKpis.checkins.toLocaleString('pt-BR')} icon={FaBullseye} />
                    <KpiCard title="Taxa" value={`${((generalKpis.checkins / (generalKpis.inscricoes || 1)) * 100).toFixed(1)}%`} icon={FaPercent} />
                </div>
                <div className="grid grid-cols-3 gap-2 bg-gray-100 dark:bg-gray-800/40 p-3 rounded-xl border dark:border-gray-700">
                    <KpiCard title="Insc. Filtro" value={filteredKpis.inscricoes.toLocaleString('pt-BR')} icon={FaUsers} />
                    <KpiCard title="Ck. Filtro" value={filteredKpis.checkins.toLocaleString('pt-BR')} icon={FaUserCheck} />
                    <KpiCard title="Taxa" value={`${((filteredKpis.checkins / (filteredKpis.inscricoes || 1)) * 100).toFixed(1)}%`} icon={FaPercent} />
                </div>
            </section>

            {/* Filtros UTM */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border dark:border-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4">
                {['medium', 'source', 'content'].map(f => (
                    <div key={f}>
                        <label className="block text-xs font-bold mb-1 uppercase text-gray-500 dark:text-gray-400">UTM {f}</label>
                        <select 
                            value={filters[f]} 
                            onChange={e => handleFilterChange(f, e.target.value)} 
                            className="w-full text-sm border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-900 dark:text-white p-2 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all" className="bg-white dark:bg-gray-800">Todos</option>
                            {filterOptions[`${f}s`].map(o => (
                                <option key={o} value={o} className="bg-white dark:bg-gray-800">{o}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            {isLoadingData ? <Spinner /> : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <ScoreDistributionChart data={scoreDistributionChartData} />
                        <DailyEvolutionChart data={dailyEvolutionChartData} />
                    </div>
                    <ScoringTable 
                        data={scoringTableData} 
                        launchName={launches.find(l => l.id === selectedLaunch)?.codigo || 'LeadScoring'} 
                    />
                </div>
            )}
        </div>
    );
}