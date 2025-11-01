'use client';

import React, { useState, useEffect, useCallback, useContext, Fragment } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { subDays, startOfDay, endOfDay, format, parseISO, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaSpinner, FaFilter, FaUsers, FaUserCheck, FaChevronDown, FaGlobe, FaBullseye, FaPercent } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';

// --- Componentes ---
const KpiCard = ({ title, value, subTitle, icon: Icon }) => (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md flex items-center gap-4">
        <div className="bg-blue-100 dark:bg-gray-700 p-3 rounded-full"><Icon className="text-blue-600 dark:text-blue-400 text-xl" /></div>
        <div>
            <p className="text-sm text-slate-500 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-gray-100">{value}</p>
            <p className="text-xs text-slate-400 dark:text-gray-400">{subTitle}</p>
        </div>
    </div>
);
const Spinner = () => <div className="text-center py-10"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div>;


export default function EvolucaoCanalPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState('');
    const [period, setPeriod] = useState('Hoje');
    const [data, setData] = useState(null);
    const [loadingLaunches, setLoadingLaunches] = useState(true);
    const [loadingData, setLoadingData] = useState(false);
    const [expandedRows, setExpandedRows] = useState(new Set());
    
    // --- LÓGICA DE FILTRO V2.0 (INVERTIDA) ---
    const filterHierarchy = ['medium', 'source', 'campaign', 'content', 'term'];
    const initialFilters = { medium: 'all', source: 'all', campaign: 'all', content: 'all', term: 'all' };
    const initialOptions = { mediums: [], sources: [], campaigns: [], contents: [], terms: [] };

    const [filters, setFilters] = useState(initialFilters);
    const [options, setOptions] = useState(initialOptions);
    // --- FIM LÓGICA V2.0 ---

    const clientIdToSend = userProfile?.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile?.cliente_id;

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

    // Efeito para buscar os lançamentos
    useEffect(() => {
        if (!userProfile || clientIdToSend === undefined) return; 

        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        
        if (isAllClients) {
            setLaunches([]); 
            setSelectedLaunchId(''); 
            setLoadingLaunches(false); 
            setData(null); 
            setFilters(initialFilters); 
            setOptions(initialOptions); 
            return; 
        }
        
        setLoadingLaunches(true);
        setData(null); 
        setLoadingData(true); 

        supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend })
          .then(({ data, error }) => {
              if (error) {
                  console.error(error);
                  toast.error("Erro ao buscar lançamentos.");
                  setLaunches([]); 
                  return; 
              }
              if (data) {
                  const allLaunches = data; 
                  const sorted = allLaunches.sort((a, b) => {
                      if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                      if (b.status === 'Em Andamento' && a.status !== 'Em Andamento') return 1;
                      return (a.codigo || a.nome).localeCompare(b.codigo || b.nome);
                  });
                  setLaunches(sorted);
                  setSelectedLaunchId(''); 
              }
          })
          .catch(err => {
              console.error(err);
              toast.error(`Erro ao buscar lançamentos: ${err.message}`);
              setLaunches([]);
          })
          .finally(() => {
              setLoadingLaunches(false);
              setLoadingData(false); 
          });
    }, [userProfile, selectedClientId, supabase, clientIdToSend]); 

    // Efeito para atualizar o Header
    useEffect(() => {
        const isClientSelected = !(userProfile?.role === 'admin' && selectedClientId === 'all');
        const isDisabled = loadingLaunches || !isClientSelected;

        const launchSelector = (
            <select 
                value={selectedLaunchId || ''} 
                onChange={(e) => setSelectedLaunchId(e.target.value)} 
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2" 
                disabled={isDisabled}
            >
                {!isClientSelected ? (
                    <option value="" disabled>Selecione um cliente</option>
                ) : loadingLaunches ? ( 
                    <option value="" disabled>Carregando...</option>
                ) : launches.length === 0 ? ( 
                    <option value="" disabled>Nenhum lançamento</option>
                ) : (
                    <option value="">Selecione um lançamento</option>
                )}
                
                {launches.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>)}
            </select>
        );
        setHeaderContent({ title: 'Evolução de Canal', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunchId, launches, loadingLaunches, userProfile, selectedClientId]);

    // Função centralizada para buscar opções de filtro
    const fetchFilterOptions = useCallback(async (rpcName, params) => {
        if (!params || !params.p_launch_id) return [];
        try {
            const { data, error } = await supabase.rpc(rpcName, params);
            if (error) {
                console.error(`Error fetching ${rpcName}:`, error);
                toast.error(`Falha ao buscar opções para ${rpcName}`);
                return [];
            }
            return (data || []).map(d => d[Object.keys(d)[0]]).filter(Boolean);
        } catch (err) {
            console.error(`Exception in fetchFilterOptions (${rpcName}):`, err);
            toast.error(`Erro ao processar filtros: ${rpcName}`);
            return [];
        }
    }, [supabase]); 

    
    // --- EFEITOS DE FILTRO V2.0 ---
    useEffect(() => {
        if (!selectedLaunchId || clientIdToSend === undefined) {
            setOptions(initialOptions);
            setFilters(initialFilters);
            return;
        }
        setFilters(initialFilters); 
        fetchFilterOptions('get_utm_mediums', { p_launch_id: selectedLaunchId, p_client_id: clientIdToSend })
            .then(mediums => setOptions({ ...initialOptions, mediums }));
    }, [selectedLaunchId, clientIdToSend, fetchFilterOptions]);

    useEffect(() => {
        if (filters.medium === 'all' || !selectedLaunchId || clientIdToSend === undefined) {
            setOptions(p => ({ ...p, sources: [], campaigns: [], contents: [], terms: [] }));
            return;
        }
        fetchFilterOptions('get_utm_sources', { p_launch_id: selectedLaunchId, p_client_id: clientIdToSend, p_medium: filters.medium })
            .then(sources => setOptions(p => ({ ...p, sources, campaigns: [], contents: [], terms: [] })));
    }, [filters.medium, selectedLaunchId, clientIdToSend, fetchFilterOptions]);

    useEffect(() => {
        if (filters.source === 'all' || !selectedLaunchId || clientIdToSend === undefined) {
            setOptions(p => ({ ...p, campaigns: [], contents: [], terms: [] }));
            return;
        }
        fetchFilterOptions('get_utm_campaigns', { p_launch_id: selectedLaunchId, p_client_id: clientIdToSend, p_medium: filters.medium, p_source: filters.source })
            .then(campaigns => setOptions(p => ({ ...p, campaigns, contents: [], terms: [] })));
    }, [filters.source, filters.medium, selectedLaunchId, clientIdToSend, fetchFilterOptions]);
    
    useEffect(() => {
        if (filters.campaign === 'all' || !selectedLaunchId || clientIdToSend === undefined) {
            setOptions(p => ({ ...p, contents: [], terms: [] }));
            return;
        }
        fetchFilterOptions('get_utm_contents', { p_launch_id: selectedLaunchId, p_client_id: clientIdToSend, p_medium: filters.medium, p_source: filters.source, p_campaign: filters.campaign })
            .then(contents => setOptions(p => ({ ...p, contents, terms: [] })));
    }, [filters.campaign, filters.source, filters.medium, selectedLaunchId, clientIdToSend, fetchFilterOptions]);
    
    useEffect(() => {
        if (filters.content === 'all' || !selectedLaunchId || clientIdToSend === undefined) {
            setOptions(p => ({ ...p, terms: [] }));
            return;
        }
        fetchFilterOptions('get_utm_terms', { p_launch_id: selectedLaunchId, p_client_id: clientIdToSend, p_medium: filters.medium, p_source: filters.source, p_campaign: filters.campaign, p_content: filters.content })
            .then(terms => setOptions(p => ({ ...p, terms })));
    }, [filters.content, filters.campaign, filters.source, filters.medium, selectedLaunchId, clientIdToSend, fetchFilterOptions]);

    // --- FIM DOS EFEITOS DE FILTRO V2.0 ---

    
    // --- FUNÇÃO PARA BUSCAR OS DADOS PRINCIPAIS ---
    const fetchData = useCallback(async () => {
        if (!selectedLaunchId || !userProfile || clientIdToSend === undefined) {
            setData(null); 
            setLoadingData(false);
            return;
        }
        setLoadingData(true);
        try {
            const now = new Date();
            let startDate, endDate = endOfDay(now);
            switch (period) {
                case 'Hoje': startDate = startOfDay(now); break;
                case 'Ontem': startDate = startOfDay(subDays(now, 1)); endDate = endOfDay(subDays(now, 1)); break;
                case '7 Dias': startDate = startOfDay(subDays(now, 6)); break;
                case '14 Dias': startDate = startOfDay(subDays(now, 13)); break;
                case '30 Dias': startDate = startOfDay(subDays(now, 29)); break;
                case '45 Dias': startDate = startOfDay(subDays(now, 44)); break;
                case 'Todos': startDate = new Date(2000, 0, 1); break;
                default: startDate = startOfDay(now);
            }
            
            const { data: result, error } = await supabase.rpc('get_evolution_dashboard_data', {
                p_launch_id: selectedLaunchId, 
                p_start_date: startDate.toISOString(), 
                p_end_date: endDate.toISOString(),
                p_client_id: clientIdToSend, 
                p_utm_medium: filters.medium === 'all' ? null : filters.medium,
                p_utm_source: filters.source === 'all' ? null : filters.source,
                p_utm_campaign: filters.campaign === 'all' ? null : filters.campaign,
                p_utm_content: filters.content === 'all' ? null : filters.content,
                p_utm_term: filters.term === 'all' ? null : filters.term,
            });

            if (error) throw error;
            setData(result);
        } catch (err) { 
            console.error("Erro ao buscar dados do dashboard:", err);
            toast.error(`Erro ao carregar dados: ${err.message}`); 
            setData(null); 
        } 
        finally { setLoadingData(false); }
    }, [selectedLaunchId, period, filters, supabase, userProfile, clientIdToSend]); 

    useEffect(() => { fetchData(); }, [fetchData]); 
    
    const kpis = data?.kpis;
    const taxaCheckinGeral = (kpis && kpis.total_geral_inscricoes > 0) ? ((kpis.total_geral_checkins / kpis.total_geral_inscricoes) * 100) : 0;
    const taxaCheckinFiltrado = (kpis && kpis.total_filtrado_inscricoes > 0) ? ((kpis.total_filtrado_checkins / kpis.total_filtrado_inscricoes) * 100) : 0; 

    // --- HANDLER DE FILTRO V2.0 ---
    const handleFilterChange = (level, value) => {
        setFilters(prev => {
            const newFilters = { ...prev, [level]: value };
            if (level === 'medium') {
                newFilters.source = 'all'; newFilters.campaign = 'all'; newFilters.content = 'all'; newFilters.term = 'all';
            } else if (level === 'source') {
                newFilters.campaign = 'all'; newFilters.content = 'all'; newFilters.term = 'all';
            } else if (level === 'campaign') {
                newFilters.content = 'all'; newFilters.term = 'all';
            } else if (level === 'content') {
                newFilters.term = 'all';
            }
            return newFilters;
        });
    };
    
    const isLoading = loadingData || loadingLaunches;
    const showSpinner = loadingLaunches || (loadingData && !!selectedLaunchId);

    const getDatesForPeriod = (periodStr) => {
        const now = new Date();
        let startDate, endDate = endOfDay(now);
        switch (periodStr) {
            case 'Hoje': startDate = startOfDay(now); break;
            case 'Ontem': startDate = startOfDay(subDays(now, 1)); endDate = endOfDay(subDays(now, 1)); break;
            case '7 Dias': startDate = startOfDay(subDays(now, 6)); break;
            case '14 Dias': startDate = startOfDay(subDays(now, 13)); break;
            case '30 Dias': startDate = startOfDay(subDays(now, 29)); break;
            case '45 Dias': startDate = startOfDay(subDays(now, 44)); break;
            case 'Todos': startDate = new Date(2000, 0, 1); endDate = new Date(2100, 0, 1); break;
            default: startDate = startOfDay(now);
        }
        return { startDate, endDate };
    }

    const filteredTableData = (data?.table_data ?? []).filter(row => {
        if (period === 'Todos') return true;
        const { startDate, endDate } = getDatesForPeriod(period);
        const rowDate = parseISO(row.dia);
        return isWithinInterval(rowDate, { start: startDate, end: endDate });
    });

    return (
        <div className="p-4 md:p-6 space-y-6 bg-slate-50 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200">
            <Toaster position="top-center" />
            
            {/* --- SEÇÃO DOS KPIs --- */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-3">
                    <h3 className="font-bold text-center text-slate-600 dark:text-gray-300">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_geral_inscricoes ?? 0).toLocaleString('pt-BR')} subTitle="Total no lançamento" icon={FaGlobe}/>
                        <KpiCard title="Check-ins" value={(kpis?.total_geral_checkins ?? 0).toLocaleString('pt-BR')} subTitle="Total no lançamento" icon={FaBullseye}/>
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinGeral.toFixed(1)}%`} subTitle="Inscrições x Check-ins" icon={FaPercent}/>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md space-y-3">
                    <h3 className="font-bold text-center text-slate-600 dark:text-gray-300">Totais do Filtro</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_filtrado_inscricoes ?? 0).toLocaleString('pt-BR')} subTitle="Resultado do filtro" icon={FaUsers}/>
                        <KpiCard title="Check-ins" value={(kpis?.total_filtrado_checkins ?? 0).toLocaleString('pt-BR')} subTitle="Resultado do filtro" icon={FaUserCheck}/>
                         <KpiCard title="Taxa Check-in" value={`${taxaCheckinFiltrado.toFixed(1)}%`} subTitle="Check-ins / Inscrições (Filtro)" icon={FaPercent}/>
                    </div>
                </div>
            </section>
            
            {/* --- SEÇÃO DE FILTROS --- */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md space-y-4">
                <div className="flex items-center gap-2"><FaFilter className="text-blue-600 dark:text-blue-400"/><h2 className="text-lg font-semibold text-slate-700 dark:text-gray-200">Filtros</h2></div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Período</label>
                        <div className="flex flex-wrap items-center gap-2">
                            {['Hoje', 'Ontem', '7 Dias', '14 Dias', '30 Dias', '45 Dias', 'Todos'].map(p => (
                                <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-2 rounded-md text-sm font-semibold transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-300 dark:hover:bg-gray-600'}`}>{p}</button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                        {filterHierarchy.map((key, index) => {
                            const previousKey = filterHierarchy[index-1];
                            const isDisabled = isLoading || (index > 0 && filters[previousKey] === 'all') || !selectedLaunchId; 
                            return (
                                <div key={key}>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1 capitalize">{`UTM ${key}`}</label>
                                    <select 
                                        value={filters[key]} 
                                        onChange={e => handleFilterChange(key, e.target.value)}
                                        className="w-full p-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md disabled:opacity-50" 
                                        disabled={isDisabled}>
                                        <option value="all">Todos</option>
                                        {(options[`${key}s`] || []).map(o => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* --- SEÇÃO DE DADOS (GRÁFICOS E TABELA) --- */}
            {showSpinner ? <Spinner /> : !selectedLaunchId ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                    Por favor, selecione um cliente e um lançamento para ver os dados.
                </div>
            ) : (
                <div className="space-y-6">
                    
                    {/* --- GRÁFICOS --- */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Visão Geral do Lançamento (por Dia)</h3>
                        
                        {/* 💡💡💡 CORREÇÃO 1 (ALERTA AMARELO) 💡💡💡 */}
                        <div className="w-full">
                            <ResponsiveContainer width="100%" height={400}>
                                <BarChart data={data?.overview_chart_data || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Inscrições" fill="#4e79a7" />
                                    <Bar dataKey="Check-ins" fill="#59a14f" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Evolução no Período por Hora ({period})</h3>
                        
                        {/* 💡💡💡 CORREÇÃO 1 (ALERTA AMARELO) 💡💡💡 */}
                        <div className="w-full">
                            <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={data?.period_chart_data || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="Inscrições" stroke="#4e79a7" strokeWidth={2} />
                                    <Line type="monotone" dataKey="Check-ins" stroke="#59a14f" strokeWidth={2} />
                                 </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* --- TABELA DE DETALHES (ACORDEÃO) --- */}
                    <div className="w-full bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Detalhes por Dia e Hora</h3>
                        
                        {/* 💡💡💡 CORREÇÃO 2 (NOVA TABELA PRINCIPAL) - HEADER 💡💡💡 */}
                        <div className="hidden md:grid md:grid-cols-6 gap-4 px-4 py-2 mt-4 text-sm font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            <span className="md:col-span-2">Data</span>
                            <span>Inscrições</span>
                            <span>Check-ins</span>
                            <span>Preench. Checkin</span>
                            <span>Taxa de Check-in</span>
                        </div>
                        
                        <div className="space-y-2 md:mt-2">
                            {filteredTableData.map(row => {
                                const dayKey = format(parseISO(row.dia), 'yyyy-MM-dd');
                                const isExpanded = expandedRows.has(dayKey); 
                                
                                // --- 💡💡💡 CORREÇÃO 2 (CÁLCULOS) 💡💡💡 ---
                                // "Atual" (Inscrições vs Checkins do Dia) -> Preench. Checkin
                                const preenchCheckin = (row.total_inscricoes > 0) ? (row.total_checkins / row.total_inscricoes) * 100 : 0;
                                // "Nova" (Checkins do Dia vs Total Checkins) -> Taxa de Check-in
                                const taxaCheckin = (kpis?.total_geral_checkins ?? 0) > 0
                                    ? ((row.total_checkins / kpis.total_geral_checkins) * 100)
                                    : 0;
                                // --- FIM DA CORREÇÃO ---

                                return (
                                <div key={dayKey} className="bg-slate-50 dark:bg-gray-700/50 rounded-lg shadow-sm">
                                    
                                    {/* --- 💡 CORREÇÃO 2 (GRID DA LINHA) --- */}
                                    <div onClick={() => toggleRow(dayKey)} className="cursor-pointer p-4 grid grid-cols-3 md:grid-cols-6 gap-4 items-center">
                                        
                                        {/* Col 1 & 2: Data + Stats Mobile */}
                                        <div className="md:col-span-2 col-span-2">
                                            <div className="font-medium text-gray-800 dark:text-gray-100">{format(parseISO(row.dia), 'dd/MM/yyyy', {locale: ptBR})}</div>
                                            
                                            {/* Stats Mobile (agora mostra ambas as taxas) */}
                                            <div className="md:hidden text-sm mt-1">
                                                <div>
                                                    <span className="text-gray-500 dark:text-gray-400">Insc: </span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-100">{row.total_inscricoes.toLocaleString('pt-BR')}</span>
                                                    <span className="ml-2 text-gray-500 dark:text-gray-400">Chk: </span>
                                                    <span className="font-semibold text-gray-800 dark:text-gray-100">{row.total_checkins.toLocaleString('pt-BR')}</span>
                                                </div>
                                                <div className="mt-1">
                                                    <span className="text-gray-500 dark:text-gray-400">Preench: </span>
                                                    <span className="font-semibold text-blue-600 dark:text-blue-400">{preenchCheckin.toFixed(1)}%</span>
                                                    <span className="ml-2 text-gray-500 dark:text-gray-400">Taxa: </span>
                                                    <span className="font-semibold text-green-600 dark:text-green-400">{taxaCheckin.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Col 3: Inscrições (Desktop) */}
                                        <div className="hidden md:block text-gray-700 dark:text-gray-200">{row.total_inscricoes.toLocaleString('pt-BR')}</div>
                                        
                                        {/* Col 4: Check-ins (Desktop) */}
                                        <div className="hidden md:block text-gray-700 dark:text-gray-200">{row.total_checkins.toLocaleString('pt-BR')}</div>
                                        
                                        {/* Col 5: Preench. Checkin (Desktop) */}
                                        <div className="hidden md:block font-semibold text-blue-600 dark:text-blue-400">
                                            {preenchCheckin.toFixed(1)}%
                                        </div>

                                        {/* Col 6: Taxa de Check-in (Desktop) + Chevron */}
                                        <div className="flex items-center justify-end md:justify-start">
                                            <span className="font-semibold text-green-600 dark:text-green-400">{taxaCheckin.toFixed(1)}%</span>
                                            <FaChevronDown className={`ml-3 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} size={12} />
                                        </div>
                                    </div>
                                    
                                    {isExpanded && (
                                        <div className="p-0 bg-slate-100 dark:bg-gray-700/20 border-t border-slate-200 dark:border-gray-600">
                                            <div className="overflow-x-auto pl-4 md:pl-10 pr-4 py-2">
                                                <table className="min-w-full text-sm">
                                                    
                                                    {/* --- 💡 CORREÇÃO 2 (TABELA ANINHADA) - HEADER --- */}
                                                    <thead className="bg-slate-200 dark:bg-gray-600">
                                                        <tr>
                                                            <th className="p-2 text-left">Hora</th>
                                                            <th className="p-2 text-left">Inscrições</th>
                                                            <th className="p-2 text-left">Check-ins</th>
                                                            <th className="p-2 text-left">Preench. Checkin</th>
                                                            <th className="p-2 text-left">Taxa de Check-in</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {row.hourly_details?.map(item => {
                                                            // --- 💡 CORREÇÃO 2 (TABELA ANINHADA) - CÁLCULOS ---
                                                            // "Atual" (Inscrições vs Checkins da Hora) -> Preench. Checkin
                                                            const hourlyPreenchRate = (item.inscricoes > 0) ? ((item.checkins / item.inscricoes) * 100) : 0;
                                                            // "Nova" (Checkins da Hora vs Total Checkins) -> Taxa de Check-in
                                                            const hourlyShareRate = (kpis?.total_geral_checkins ?? 0) > 0
                                                                ? ((item.checkins / kpis.total_geral_checkins) * 100)
                                                                : 0;

                                                            return (
                                                                <tr key={item.hora} className="border-b border-slate-100 dark:border-gray-600/50">
                                                                    <td className="p-2">{`${item.hora.toString().padStart(2, '0')}:00`}</td>
                                                                    <td className="p-2">{item.inscricoes}</td>
                                                                    <td className="p-2">{item.checkins}</td>
                                                                    {/* --- 💡 CORREÇÃO 2 (TABELA ANINHADA) - CÉLULAS --- */}
                                                                    <td className="p-2 font-semibold text-blue-600 dark:text-blue-400">
                                                                        {hourlyPreenchRate.toFixed(1)}%
                                                                    </td>
                                                                    <td className="p-2 font-semibold text-green-600 dark:text-green-400">
                                                                        {hourlyShareRate.toFixed(1)}%
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                )
                            })}
                            
                            {filteredTableData.length === 0 && (data?.table_data ?? []).length > 0 && (
                                <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                                    Nenhum dado encontrado para o período selecionado.
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}