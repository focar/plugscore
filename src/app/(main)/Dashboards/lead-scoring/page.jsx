// /src/app/(main)/Dashboards/lead-scoring/page.jsx
'use client';

import React, { useState, useEffect, useContext, useMemo, Fragment } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { FaSpinner, FaFileCsv, FaFilter, FaUsers, FaUserCheck, FaGlobe, FaBullseye, FaPercent, FaChevronDown } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

// --- Componentes de UI ---
const KpiCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center gap-4">
        <div className="bg-blue-100 dark:bg-gray-700 p-3 rounded-full">
            <Icon className="text-blue-600 dark:text-blue-400 text-2xl" />
        </div>
        <div>
            <p className="text-base text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
    </div>
);

// *** CORREÇÃO AQUI ***
const ScoreDistributionChart = ({ data }) => (
    <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-200 mb-4">Distribuição por Score (Filtro)</h2>
        {/* Div pai com altura responsiva */}
        <div className="w-full h-80 md:h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    {/* Prop 'outerRadius' corrigida para usar porcentagem */}
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="90%" labelLine={false}>
                        {data.map((entry) => <Cell key={entry.name} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip formatter={(value) => `${value.toLocaleString('pt-BR')} leads`} />
                    <Legend iconType="circle" />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
);

// *** CORREÇÃO AQUI ***
const DailyEvolutionChart = ({ data }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md overflow-hidden">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-200 mb-4">Evolução Diária (Filtro)</h2>
        {/* Div pai com altura responsiva */}
        <div className="w-full h-80 md:h-[350px]">
            {/* ResponsiveContainer com 100% da altura do pai */}
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="data" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="inscricoes" stroke="#8884d8" strokeWidth={2} name="Inscrições" />
                    <Line type="monotone" dataKey="checkins" stroke="#82ca9d" strokeWidth={2} name="Check-ins" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);


// Componente de Tabela (Acordeão) - Sem alterações
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
        const headers = ["Canal", "Inscrições", "Check-ins", "Frio (<35)", "Morno-Frio", "Morno", "Quente-Morno", "Quente (>80)"];
        const csvRows = [
            headers.join(','),
            ...data.map(row => [
                `"${row.canal.replace(/"/g, '""')}"`,
                row.inscricoes, row.check_ins,
                row.frio_menos_35, row.morno_frio, row.morno, row.quente_morno, row.quente_mais_80
            ].join(','))
        ];
        const csvString = csvRows.join('\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `scoring_${launchName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-200">Scoring por Canal</h2>
                <button onClick={exportToCSV} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"><FaFileCsv /> Exportar</button>
            </div>

            {/* Cabeçalho Fixo (Visível apenas em Desktop) */}
            <div className="hidden md:grid md:grid-cols-8 gap-4 px-4 py-2 mt-4 text-xs font-medium text-slate-500 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">
                <span>Canal</span>
                <span className="text-center">Inscrições</span>
                <span className="text-center">Check-ins</span>
                <span className="text-center text-blue-800">Frio (&lt;35)</span>
                <span className="text-center text-blue-400">Morno-Frio</span>
                <span className="text-center text-yellow-500">Morno</span>
                <span className="text-center text-orange-500">Quente-Morno</span>
                <span className="text-center text-red-600">Quente (&gt;80)</span>
            </div>

            {/* Lista de Cards Acordeão */}
            <div className="space-y-2 md:mt-2">
                {(data || []).map((row, index) => {
                    const key = row.canal + index;
                    const isExpanded = expandedRows.has(key);

                    return (
                    <div key={key} className="bg-slate-50 dark:bg-gray-700/50 rounded-lg shadow-sm">
                        {/* Linha Clicável (Header do Card) */}
                        <div onClick={() => toggleRow(key)} className="cursor-pointer p-4 grid grid-cols-3 md:grid-cols-8 gap-4 items-center">
                            
                            {/* Col 1: Canal */}
                            <div className="font-medium text-slate-900 dark:text-gray-100 truncate" title={row.canal}>{row.canal}</div>

                            {/* Col 2: Inscrições (Mobile) */}
                            <div className="md:hidden text-center">
                                <p className="text-xs text-slate-500 dark:text-gray-400">Inscrições</p>
                                <p className="font-semibold text-slate-800 dark:text-gray-100">{row.inscricoes}</p>
                            </div>

                            {/* Col 3: Check-ins + Icon (Mobile) */}
                            <div className="md:hidden text-center">
                                <p className="text-xs text-slate-500 dark:text-gray-400">Check-ins</p>
                                <div className="flex items-center justify-center gap-2">
                                    <p className="font-semibold text-slate-800 dark:text-gray-100">{row.check_ins}</p>
                                    <FaChevronDown className={`ml-1 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} size={12} />
                                </div>
                            </div>
                            
                            {/* Colunas Desktop-Only (Dados de Score) */}
                            <div className="hidden md:block text-center text-sm text-slate-600 dark:text-gray-300">{row.inscricoes}</div>
                            <div className="hidden md:block text-center text-sm text-slate-600 dark:text-gray-300">{row.check_ins}</div>
                            <div className="hidden md:block text-center text-sm text-blue-800">{row.frio_menos_35}</div>
                            <div className="hidden md:block text-center text-sm text-blue-400">{row.morno_frio}</div>
                            <div className="hidden md:block text-center text-sm text-yellow-500">{row.morno}</div>
                            <div className="hidden md:block text-center text-sm text-orange-500">{row.quente_morno}</div>
                            <div className="hidden md:block text-center text-sm text-red-600">{row.quente_mais_80}</div>
                        </div>
                        
                        {/* Conteúdo Expandido (Visível apenas no Mobile) */}
                        {isExpanded && (
                            <div className="p-4 bg-slate-100 dark:bg-gray-700/20 border-t border-slate-200 dark:border-gray-600 md:hidden">
                                <h4 className="text-sm font-semibold text-slate-700 dark:text-gray-200 mb-2">Distribuição de Score</h4>
                                <div className="grid grid-cols-3 gap-3 text-center">
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded">
                                        <p className="text-xs text-blue-800">Frio</p>
                                        <p className="text-sm font-bold text-blue-800">{row.frio_menos_35}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded">
                                        <p className="text-xs text-blue-400">Morno-Frio</p>
                                        <p className="text-sm font-bold text-blue-400">{row.morno_frio}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded">
                                        <p className="text-xs text-yellow-500">Morno</p>
                                        <p className="text-sm font-bold text-yellow-500">{row.morno}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded">
                                        <p className="text-xs text-orange-500">Qte-Morno</p>
                                        <p className="text-sm font-bold text-orange-500">{row.quente_morno}</p>
                                    </div>
                                    <div className="bg-white dark:bg-gray-700 p-2 rounded">
                                        <p className="text-xs text-red-600">Quente</p>
                                        <p className="text-sm font-bold text-red-600">{row.quente_mais_80}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    )
                })}
            </div>
        </div>
    );
};


// --- Componente Principal da Página (Lógica de dados sem alteração) ---
export default function LeadScoringPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    
    const [filters, setFilters] = useState({ source: 'all', medium: 'all', content: 'all' });
    const [filterOptions, setFilterOptions] = useState({ sources: [], mediums: [], contents: [] });
    
    const [dashboardData, setDashboardData] = useState(null);

    // Efeito para buscar Lançamentos e definir o Header (sem alteração)
    useEffect(() => {
        if (!userProfile) return;

        const setupPage = async () => {
            setIsLoadingLaunches(true);
            
            // 1. Busca os lançamentos
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });

            if (error) {
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
                setHeaderContent({ title: 'Distribuição de Lead Scoring', controls: null });
                setIsLoadingLaunches(false);
                return;
            }
            
            // Processa e define os lançamentos no estado
            const filtered = (data || []).filter(l => l.status !== 'Planejado');
            const sorted = [...filtered].sort((a, b) => {
                // 'Em andamento' (com 'a' minúsculo)
                if (a.status.toLowerCase() === 'em andamento' && b.status.toLowerCase() !== 'em andamento') return -1;
                if (b.status.toLowerCase() === 'em andamento' && a.status.toLowerCase() !== 'em andamento') return 1;
                return (a.codigo || a.nome).localeCompare(b.codigo || b.nome);
            });
            setLaunches(sorted);
            
            let currentLaunchId = '';
            if (sorted.length > 0) {
                 // 'Em andamento' (com 'a' minúsculo)
                const inProgress = sorted.find(l => l.status.toLowerCase() === 'em andamento');
                currentLaunchId = inProgress ? inProgress.id : sorted[0].id;
                setSelectedLaunch(currentLaunchId);
            } else {
                setSelectedLaunch('');
            }

            // 2. Monta o seletor de lançamento
            const launchSelector = (
                <select 
                    value={currentLaunchId} 
                    onChange={e => setSelectedLaunch(e.target.value)} 
                    disabled={sorted.length === 0} 
                    className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2"
                >
                    {sorted.length > 0 ? 
                       sorted.map(l => <option key={l.id} value={l.id}>{(l.codigo || l.nome)} ({l.status})</option>) :
                       <option>Nenhum lançamento</option>}
                </select>
            );

            // 3. Atualiza o header uma única vez
            setHeaderContent({ title: 'Distribuição de Lead Scoring', controls: launchSelector });

            setIsLoadingLaunches(false);
        };

        setupPage();

        // Limpeza do header ao sair da página
        return () => setHeaderContent({ title: '', controls: null });
        
    }, [userProfile, selectedClientId, supabase, setHeaderContent]);


    // Efeito para buscar todos os dados da dashboard de uma só vez (sem alteração)
    useEffect(() => {
        if (!selectedLaunch || !userProfile) return;

        const fetchData = async () => {
            setIsLoadingData(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_lead_scoring_dashboard', {
                p_launch_id: selectedLaunch,
                p_client_id: clientIdToSend,
                p_utm_source: filters.source === 'all' ? null : filters.source,
                p_utm_medium: filters.medium === 'all' ? null : filters.medium,
                p_utm_content: filters.content === 'all' ? null : filters.content,
            });

            if (error) {
                toast.error(`Erro ao carregar dados do dashboard: ${error.message}`);
                setDashboardData(null);
            } else {
                setDashboardData(data);
                setFilterOptions({
                    sources: data.filter_options?.sources || [],
                    mediums: data.filter_options?.mediums || [],
                    contents: data.filter_options?.contents || [],
                });
            }
            setIsLoadingData(false);
        };
        
        fetchData();
    }, [selectedLaunch, filters, userProfile, selectedClientId, supabase]);
    
    // Memoização dos dados (sem alteração)
    const { generalKpis, filteredKpis, scoreDistributionChartData, dailyEvolutionChartData, scoringTableData } = useMemo(() => {
        const data = dashboardData || {};
        const genKpis = data.general_kpis || { inscricoes: 0, checkins: 0 };
        const taxaCheckinGeral = genKpis.inscricoes > 0 ? (genKpis.checkins / genKpis.inscricoes) * 100 : 0;
        const filtKpis = data.filtered_kpis || { inscricoes: 0, checkins: 0 };
        const taxaCheckinFiltrado = filtKpis.inscricoes > 0 ? (filtKpis.checkins / filtKpis.inscricoes) * 100 : 0;
        const scoreData = data.score_distribution || {};
        const scoreChart = [
            { name: 'Quente (>80)', value: scoreData.quente_mais_80 || 0, fill: '#fa0606ff' },
            { name: 'Quente-Morno (65-79)', value: scoreData.quente_morno || 0, fill: '#c1a519ff' },
            { name: 'Morno (50-64)', value: scoreData.morno || 0, fill: '#45b615ff' },
            { name: 'Morno-Frio (35-49)', value: scoreData.morno_frio || 0, fill: '#32abd3ff' },
            { name: 'Frio (<35)', value: scoreData.frio_menos_35 || 0, fill: '#4112e9ff' },
        ].filter(item => item.value > 0);
        return {
            generalKpis: { ...genKpis, taxaCheckin: taxaCheckinGeral },
            filteredKpis: { ...filtKpis, taxaCheckin: taxaCheckinFiltrado },
            scoreDistributionChartData: scoreChart,
            dailyEvolutionChartData: data.daily_evolution || [],
            scoringTableData: data.table_data || [],
        }
    }, [dashboardData]);

    const handleFilterChange = (level, value) => {
        if (level === 'source') {
            setFilters({ source: value, medium: 'all', content: 'all' });
        } else if (level === 'medium') {
            setFilters(prev => ({ ...prev, medium: value, content: 'all' }));
        } else {
            setFilters(prev => ({ ...prev, [level]: value }));
        }
    };

    // --- JSX Principal (sem alteração de layout) ---
    return (
        <div className="space-y-6 p-4 md:p-6 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <Toaster position="top-center" />
            
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg space-y-3">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={generalKpis.inscricoes.toLocaleString('pt-BR')} icon={FaGlobe}/>
                        <KpiCard title="Check-ins" value={generalKpis.checkins.toLocaleString('pt-BR')} icon={FaBullseye}/>
                        <KpiCard title="Taxa Check-in" value={`${generalKpis.taxaCheckin.toFixed(1)}%`} icon={FaPercent}/>
                    </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg space-y-3">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300">Totais do Filtro</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={filteredKpis.inscricoes.toLocaleString('pt-BR')} icon={FaUsers}/>
                        <KpiCard title="Check-ins" value={filteredKpis.checkins.toLocaleString('pt-BR')} icon={FaUserCheck}/>
                        <KpiCard title="Taxa Check-in" value={`${filteredKpis.taxaCheckin.toFixed(1)}%`} icon={FaPercent}/>
                    </div>
                </div>
            </section>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600 dark:text-blue-400"/>
                    <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-200">Filtros</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">UTM Source</label>
                        <select value={filters.source} onChange={e => handleFilterChange('source', e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.sources.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">UTM Medium</label>
                        <select value={filters.medium} onChange={e => handleFilterChange('medium', e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.mediums.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">UTM Content</label>
                        <select value={filters.content} onChange={e => handleFilterChange('content', e.target.value)} className="w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md">
                            <option value="all">Todos</option>
                            {filterOptions.contents.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {isLoadingData ? (
                <div className="flex justify-center items-center p-10"><FaSpinner className="animate-spin text-blue-600 text-4xl" /></div>
            ) : (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {scoreDistributionChartData.length > 0 && <ScoreDistributionChart data={scoreDistributionChartData} />}
                        {dailyEvolutionChartData.length > 0 && <DailyEvolutionChart data={dailyEvolutionChartData} />}
                    </div>
                    <ScoringTable data={scoringTableData} launchName={launches.find(l => l.id === selectedLaunch)?.nome || 'export'} />
                </div>
            )}
        </div>
    );
}