//F:\plugscore\src\app\(main)\Dashboards\evolucao-canal\page.jsx
'use client';

import React, { useState, useEffect, useCallback, useContext, Fragment } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaSpinner, FaFilter, FaUsers, FaUserCheck, FaChevronDown, FaChevronRight, FaGlobe, FaBullseye, FaPercent } from 'react-icons/fa';
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
    const [loadingData, setLoadingData] = useState(true);
    const [expandedRows, setExpandedRows] = useState(new Set());
    
    const [filters, setFilters] = useState({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
    const [options, setOptions] = useState({ sources: [], mediums: [], campaigns: [], contents: [], terms: [] });

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

    useEffect(() => {
        if (!userProfile) return;
        setLoadingLaunches(true);
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
        
        supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend })
          .then(({ data, error }) => {
              if (error) throw new Error(error.message);
              if (data) {
                  // 1. Filtra para remover os lançamentos "Planejado"
                  const filtered = data.filter(launch => launch.status !== 'Planejado');

                  // 2. Ordena a lista já filtrada
                  const sorted = filtered.sort((a, b) => {
                      // Se 'a' está "Em Andamento" e 'b' não, 'a' vem primeiro (-1).
                      if (a.status === 'Em Andamento' && b.status !== 'Em Andamento') return -1;
                      // Se 'b' está "Em Andamento" e 'a' não, 'b' vem primeiro (1).
                      if (b.status === 'Em Andamento' && a.status !== 'Em Andamento') return 1;
                      
                      // Se ambos têm o mesmo status (ambos "Em Andamento" ou ambos não), ordena por nome.
                      return a.nome.localeCompare(b.nome);
                  });

                  setLaunches(sorted);
                  // Seleciona o primeiro da lista ordenada (que será 'Em Andamento' se existir)
                  setSelectedLaunchId(sorted[0] ? sorted[0].id : '');
              }
          })
          .catch(err => toast.error("Erro ao buscar lançamentos."))
          .finally(() => setLoadingLaunches(false));
    }, [userProfile, selectedClientId, supabase]);

    useEffect(() => {
        const launchSelector = (
            <select value={selectedLaunchId || ''} onChange={(e) => setSelectedLaunchId(e.target.value)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2" disabled={loadingLaunches}>
                {launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>)}
            </select>
        );
        setHeaderContent({ title: 'Evolução de Canal', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunchId, launches, loadingLaunches]);

    const fetchFilterOptions = useCallback(async (rpcName, params) => {
        if (!selectedLaunchId) return [];
        const { data } = await supabase.rpc(rpcName, params);
        return data?.map(d => d[Object.keys(d)[0]]) || [];
    }, [selectedLaunchId, supabase]);

    useEffect(() => {
        if (!selectedLaunchId) return;
        setFilters({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
        fetchFilterOptions('get_utm_sources', { p_launch_id: selectedLaunchId }).then(sources => setOptions({ sources, mediums: [], campaigns: [], contents: [], terms: [] }));
    }, [selectedLaunchId, fetchFilterOptions]);

    useEffect(() => {
        if (filters.source === 'all') { setOptions(p => ({...p, mediums:[]})); return; }
        setFilters(p => ({...p, medium: 'all', campaign: 'all', content: 'all', term: 'all'}));
        fetchFilterOptions('get_utm_mediums', { p_launch_id: selectedLaunchId, p_source: filters.source }).then(mediums => setOptions(p => ({...p, mediums, campaigns:[], contents:[], terms:[]})));
    }, [filters.source, selectedLaunchId, fetchFilterOptions]);
    
    useEffect(() => {
        if (filters.medium === 'all') { setOptions(p => ({...p, campaigns:[]})); return; }
        setFilters(p => ({...p, campaign: 'all', content: 'all', term: 'all'}));
        fetchFilterOptions('get_utm_campaigns', { p_launch_id: selectedLaunchId, p_source: filters.source, p_medium: filters.medium }).then(campaigns => setOptions(p => ({...p, campaigns, contents:[], terms:[]})));
    }, [filters.medium, filters.source, selectedLaunchId, fetchFilterOptions]);
    
    useEffect(() => {
        if (filters.campaign === 'all') { setOptions(p => ({...p, contents:[]})); return; }
        setFilters(p => ({...p, content: 'all', term: 'all'}));
        fetchFilterOptions('get_utm_contents', { p_launch_id: selectedLaunchId, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign }).then(contents => setOptions(p => ({...p, contents, terms:[]})));
    }, [filters.campaign, filters.medium, filters.source, selectedLaunchId, fetchFilterOptions]);
    
    useEffect(() => {
        if (filters.content === 'all') { setOptions(p => ({...p, terms:[]})); return; }
        setFilters(p => ({...p, term: 'all'}));
        fetchFilterOptions('get_utm_terms', { p_launch_id: selectedLaunchId, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign, p_content: filters.content }).then(terms => setOptions(p => ({...p, terms})));
    }, [filters.content, filters.campaign, filters.medium, filters.source, selectedLaunchId, fetchFilterOptions]);


    const fetchData = useCallback(async () => {
        if (!selectedLaunchId || !userProfile) return;
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
            }
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data: result, error } = await supabase.rpc('get_evolution_dashboard_data', {
                p_launch_id: selectedLaunchId, 
                p_start_date: startDate.toISOString(), 
                p_end_date: endDate.toISOString(),
                p_client_id: clientIdToSend,
                p_utm_source: filters.source === 'all' ? null : filters.source,
                p_utm_medium: filters.medium === 'all' ? null : filters.medium,
                p_utm_campaign: filters.campaign === 'all' ? null : filters.campaign,
                p_utm_content: filters.content === 'all' ? null : filters.content,
                p_utm_term: filters.term === 'all' ? null : filters.term,
            });
            if (error) throw error;
            setData(result);
        } catch (err) { toast.error(`Erro ao carregar dados: ${err.message}`); } 
        finally { setLoadingData(false); }
    }, [selectedLaunchId, period, filters, supabase, userProfile, selectedClientId]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const kpis = data?.kpis;
    const taxaCheckinGeral = (kpis && kpis.total_geral_inscricoes > 0) ? ((kpis.total_geral_checkins / kpis.total_geral_inscricoes) * 100) : 0;
    const taxaCheckinFiltrado = (kpis && kpis.total_filtrado_inscricoes > 0) ? ((kpis.total_filtrado_checkins / kpis.total_filtrado_inscricoes) * 100) : 0;

    const handleFilterChange = (level, value) => setFilters(prev => ({ ...prev, [level]: value }));
    
    return (
        <div className="p-4 md:p-6 space-y-6 bg-slate-50 dark:bg-gray-900 min-h-screen text-gray-800 dark:text-gray-200">
            <Toaster position="top-center" />
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
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinFiltrado.toFixed(1)}%`} subTitle="Filtro x Check-ins" icon={FaPercent}/>
                    </div>
                </div>
            </section>
            
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
                        {Object.keys(filters).map((key, index) => (
                            <div key={key}>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1 capitalize">{`UTM ${key}`}</label>
                                <select 
                                    value={filters[key]} 
                                    onChange={e => handleFilterChange(key, e.target.value)} 
                                    className="w-full p-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md disabled:opacity-50" 
                                    disabled={loadingData || (index > 0 && filters[(Object.keys(filters)[index-1])] === 'all')}>
                                    <option value="all">Todos</option>
                                    {options[`${key}s`]?.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {loadingData ? <Spinner /> : (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Visão Geral do Lançamento (por Dia)</h3><div style={{height: '400px'}}><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.overview_chart_data || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="Inscrições" fill="#4e79a7" /><Bar dataKey="Check-ins" fill="#59a14f" /></BarChart></ResponsiveContainer></div></div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Evolução no Período por Hora ({period})</h3><div style={{height: '400px'}}><ResponsiveContainer width="100%" height="100%"><LineChart data={data?.period_chart_data || []}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="Inscrições" stroke="#4e79a7" strokeWidth={2} /><Line type="monotone" dataKey="Check-ins" stroke="#59a14f" strokeWidth={2} /></LineChart></ResponsiveContainer></div></div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow overflow-x-auto"><h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Detalhes por Dia e Hora</h3>
                        <table className="min-w-full">
                            <thead className="bg-slate-100 dark:bg-gray-700"><tr><th className="w-8"></th><th className="p-2 text-left">Data</th><th className="p-2 text-left">Inscrições</th><th className="p-2 text-left">Check-ins</th><th className="p-2 text-left">Taxa de Check-in</th></tr></thead>
                            <tbody>
                            {(data?.table_data ?? []).map(row => {
                                const dayKey = format(parseISO(row.dia), 'yyyy-MM-dd');
                                const isExpanded = expandedRows.has(dayKey);
                                const dailyCheckinRate = row.total_inscricoes > 0 ? (row.total_checkins / row.total_inscricoes) * 100 : 0;
                                return (<Fragment key={dayKey}><tr onClick={() => toggleRow(dayKey)} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700">
                                    <td className="p-3 text-slate-500"><FaChevronDown className={`transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} size={12} /></td>
                                    <td className="p-3 font-medium">{format(parseISO(row.dia), 'dd/MM/yyyy', {locale: ptBR})}</td>
                                    <td className="p-3">{row.total_inscricoes.toLocaleString('pt-BR')}</td>
                                    <td className="p-3">{row.total_checkins.toLocaleString('pt-BR')}</td>
                                    <td className="p-3 font-semibold text-blue-600 dark:text-blue-400">{dailyCheckinRate.toFixed(1)}%</td>
                                </tr>
                                {isExpanded && <tr><td colSpan={5} className="p-0 bg-slate-50 dark:bg-gray-700/20"><div className="pl-10 pr-4 py-2"><table className="min-w-full text-sm">
                                    <thead className="bg-slate-200 dark:bg-gray-600"><tr ><th className="p-2 text-left">Hora</th><th className="p-2 text-left">Inscrições</th><th className="p-2 text-left">Check-ins</th></tr></thead>
                                    <tbody>{row.hourly_details?.map(item => (<tr key={item.hora}><td className="p-2">{`${item.hora.toString().padStart(2, '0')}:00`}</td><td className="p-2">{item.inscricoes}</td><td className="p-2">{item.checkins}</td></tr>))}</tbody>
                                </table></div></td></tr>}
                                </Fragment>)
                            })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

