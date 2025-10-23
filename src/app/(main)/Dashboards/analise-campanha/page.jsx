// /src/app/(main)/Dashboards/analise-campanha/page.jsx
'use client';

import React, { useState, useEffect, useCallback, useContext, Fragment } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { FaFilter, FaClock, FaChevronDown, FaChevronRight, FaGlobe, FaBullseye, FaUsers, FaUserCheck, FaPercent } from 'react-icons/fa';

// --- Componentes ---
const KpiCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center gap-4">
        <div className="bg-blue-100 dark:bg-gray-700 p-3 rounded-full"><Icon className="text-blue-600 dark:text-blue-400 text-2xl" /></div>
        <div>
            <p className="text-base text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
    </div>
);
const Spinner = () => <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>;


// --- COMPONENTE CARTÃO MOBILE ---
// MUDANÇA: Adicionado prop 'totalGeralCheckins'
const MobileHourlyCard = ({ row, totalGeralCheckins }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasDetails = row.details && row.details.length > 0;

    // MUDANÇA: Cálculo da taxa de check-in baseado no total geral
    const checkinRate = (totalGeralCheckins ?? 0) > 0 
        ? ((row.total_checkins / totalGeralCheckins) * 100).toFixed(1) + '%' 
        : '0.0%';

    return (
        <div className="bg-white dark:bg-gray-700/50 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
            {/* Cabeçalho do Cartão (Hora e Seta) */}
            <div 
                className={`flex justify-between items-center ${hasDetails ? 'cursor-pointer' : ''}`} 
                onClick={() => hasDetails && setIsExpanded(!isExpanded)}
            >
                <h4 className="font-semibold text-base text-gray-900 dark:text-white">
                    {new Date(row.creation_hour).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit' })}h
                </h4>
                {hasDetails && (
                    isExpanded ? <FaChevronDown size={14} className="ml-2 flex-shrink-0" /> : <FaChevronRight size={14} className="ml-2 flex-shrink-0" />
                )}
            </div>
            
            {/* Métricas Principais da Hora */}
            <div className="grid grid-cols-3 gap-4 text-center border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Inscrições</dt>
                    <dd className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">{row.total_inscricoes.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Check-ins</dt>
                    <dd className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">{row.total_checkins.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">Taxa de Check-in</dt>
                    {/* MUDANÇA: Usando a nova variável 'checkinRate' */}
                    <dd className="text-base font-semibold text-blue-600 dark:text-blue-400 mt-1">{checkinRate}</dd>
                </div>
            </div>

            {/* Sub-tabela (Detalhes UTM) */}
            {isExpanded && hasDetails && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-4 mt-4">
                    <h5 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">Detalhes (UTM)</h5>
                    <div className="space-y-3">
                        {row.details.map(detail => {
                            // MUDANÇA: Cálculo da taxa de check-in baseado no total geral
                            const detailCheckinRate = (totalGeralCheckins ?? 0) > 0 
                                ? ((detail.checkins / totalGeralCheckins) * 100).toFixed(1) + '%' 
                                : '0.0%';
                            
                            return (
                                <div key={detail.utm_value} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md shadow-inner space-y-2">
                                    <p className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate" title={detail.utm_value}>{detail.utm_value || "(não definido)"}</p>
                                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                        <div>
                                            <dt className="text-xs text-gray-500 dark:text-gray-400">Inscrições</dt>
                                            <dd className="font-medium text-gray-700 dark:text-gray-300">{detail.inscricoes.toLocaleString('pt-BR')}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-gray-500 dark:text-gray-400">Check-ins</dt>
                                            <dd className="font-medium text-gray-700 dark:text-gray-300">{detail.checkins.toLocaleString('pt-BR')}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-xs text-gray-500 dark:text-gray-400">Taxa Check-in</dt>
                                            {/* MUDANÇA: Usando a nova variável 'detailCheckinRate' */}
                                            <dd className="font-medium text-blue-500 dark:text-blue-400">{detailCheckinRate}</dd>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function AnaliseCampanhaPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [data, setData] = useState(null);
    const [expandedRows, setExpandedRows] = useState({}); // Para a tabela desktop
    const [filters, setFilters] = useState({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
    const [options, setOptions] = useState({ sources: [], mediums: [], campaigns: [], contents: [], terms: [] });

    const toggleRow = (hora) => setExpandedRows(prev => ({ ...prev, [hora]: !prev[hora] }));

    // Busca de lançamentos (sem alteração)
    useEffect(() => {
        if (!userProfile) return;
        setIsLoadingLaunches(true);
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
        supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend })
            .then(({ data, error }) => {
                if (error) throw error;
                const sorted = [...(data || [])].sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) {
                    const inProgress = sorted.find(l => l.status === 'Em andamento');
                    setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
                }
            })
            .catch(err => toast.error("Erro ao buscar lançamentos."))
            .finally(() => setIsLoadingLaunches(false));
    }, [userProfile, selectedClientId, supabase]);
    
    // Configura o Header (sem alteração)
    useEffect(() => {
        const launchSelector = (
             <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} disabled={isLoadingLaunches || launches.length === 0} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2">
                 {isLoadingLaunches ? <option>Carregando...</option> : 
                  launches.length > 0 ? 
                  launches.map(l => <option key={l.id} value={l.id}>{(l.codigo || l.nome)} ({l.status})</option>) :
                  <option>Nenhum lançamento</option>}
            </select>
        );
        setHeaderContent({ title: 'Análise de Campanha por Hora', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    // Lógica de Filtros em Cascata (sem alteração)
    const fetchFilterOptions = useCallback(async (level, params) => {
        if (!selectedLaunch || !userProfile) return [];
        const { data } = await supabase.rpc(level, { ...params, p_client_id: userProfile.role === 'admin' ? null : userProfile.cliente_id });
        return data?.map(d => d[Object.keys(d)[0]]) || [];
    }, [selectedLaunch, supabase, userProfile]);

    useEffect(() => {
        if (!selectedLaunch) return;
        setFilters({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
        fetchFilterOptions('get_utm_sources', { p_launch_id: selectedLaunch }).then(sources => setOptions({ sources, mediums: [], campaigns: [], contents: [], terms: [] }));
    }, [selectedLaunch, fetchFilterOptions]);

    useEffect(() => {
        if (filters.source === 'all') { setOptions(p => ({...p, mediums:[]})); return; }
        setFilters(p => ({...p, medium: 'all', campaign: 'all', content: 'all', term: 'all'}));
        fetchFilterOptions('get_utm_mediums', { p_launch_id: selectedLaunch, p_source: filters.source }).then(mediums => setOptions(p => ({...p, mediums, campaigns:[], contents:[], terms:[]})));
    }, [filters.source, selectedLaunch, fetchFilterOptions]);
    
    useEffect(() => {
        if (filters.medium === 'all') { setOptions(p => ({...p, campaigns:[]})); return; }
        setFilters(p => ({...p, campaign: 'all', content: 'all', term: 'all'}));
        fetchFilterOptions('get_utm_campaigns', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium }).then(campaigns => setOptions(p => ({...p, campaigns, contents:[], terms:[]})));
    }, [filters.medium, filters.source, selectedLaunch, fetchFilterOptions]);
    
    useEffect(() => {
        if (filters.campaign === 'all') { setOptions(p => ({...p, contents:[]})); return; }
        setFilters(p => ({...p, content: 'all', term: 'all'}));
        fetchFilterOptions('get_utm_contents', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign }).then(contents => setOptions(p => ({...p, contents, terms:[]})));
    }, [filters.campaign, filters.medium, filters.source, selectedLaunch, fetchFilterOptions]);
    
    useEffect(() => {
        if (filters.content === 'all') { setOptions(p => ({...p, terms:[]})); return; }
        setFilters(p => ({...p, term: 'all'}));
        fetchFilterOptions('get_utm_terms', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign, p_content: filters.content }).then(terms => setOptions(p => ({...p, terms})));
    }, [filters.content, filters.campaign, filters.medium, filters.source, selectedLaunch, fetchFilterOptions]);

    // Busca principal dos dados (sem alteração)
    const fetchData = useCallback(async () => {
        if (!selectedLaunch || !userProfile) return;
        setIsLoadingData(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_campaign_hourly_analysis', {
                p_launch_id: selectedLaunch,
                p_client_id: clientIdToSend,
                p_utm_source: filters.source === 'all' ? null : filters.source,
                p_utm_medium: filters.medium === 'all' ? null : filters.medium,
                p_utm_campaign: filters.campaign === 'all' ? null : filters.campaign,
                p_utm_content: filters.content === 'all' ? null : filters.content,
                p_utm_term: filters.term === 'all' ? null : filters.term,
            });
            if (error) throw error;
            setData(data);
        } catch (err) { toast.error(`Erro ao carregar dados: ${err.message}`); } 
        finally { setIsLoadingData(false); }
    }, [selectedLaunch, filters, supabase, userProfile, selectedClientId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const kpis = data?.kpis;
    const taxaCheckinGeral = (kpis && kpis.total_geral_inscricoes > 0) ? (kpis.total_geral_checkins / kpis.total_geral_inscricoes * 100) : 0;
    const taxaCheckinFiltrado = (kpis && kpis.total_filtrado_inscricoes > 0) ? (kpis.total_filtrado_checkins / kpis.total_filtrado_inscricoes * 100) : 0;
    
    const handleFilterChange = (level, value) => {
        setFilters(prev => ({ ...prev, [level]: value }));
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <Toaster />
            {/* Seção de KPIs (Original - Já responsiva) */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg space-y-3">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_geral_inscricoes ?? 0).toLocaleString('pt-BR')} icon={FaGlobe} />
                        <KpiCard title="Check-ins" value={(kpis?.total_geral_checkins ?? 0).toLocaleString('pt-BR')} icon={FaBullseye} />
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinGeral.toFixed(1)}%`} icon={FaPercent} />
                    </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg space-y-3">
                     <h3 className="font-bold text-center text-gray-600 dark:text-gray-300">Totais do Filtro Atual</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <KpiCard title="Inscrições" value={(kpis?.total_filtrado_inscricoes ?? 0).toLocaleString('pt-BR')} icon={FaUsers} />
                        <KpiCard title="Check-ins" value={(kpis?.total_filtrado_checkins ?? 0).toLocaleString('pt-BR')} icon={FaUserCheck} />
                        <KpiCard title="Taxa Check-in" value={`${taxaCheckinFiltrado.toFixed(1)}%`} icon={FaPercent} />
                    </div>
                </div>
            </section>
            
            {/* Seção de Filtros (Original - Já responsiva) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600 dark:text-blue-400"/> <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Filtros de Análise</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Object.keys(filters).map((key, index) => {
                        const previousKey = Object.keys(filters)[index-1];
                        const isDisabled = index > 0 && filters[previousKey] === 'all';
                        return (
                             <div key={key}>
                                 <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">{`UTM ${key}`}</label>
                                 <select 
                                     value={filters[key]} 
                                     onChange={e => handleFilterChange(key, e.target.value)} 
                                     className="w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md disabled:opacity-50" 
                                     disabled={isDisabled}>
                                     <option value="all">Todos</option>
                                     {options[`${key}s`]?.map(o => <option key={o} value={o}>{o}</option>)}
                                 </select>
                             </div>
                        )
                    })}
                </div>
            </div>

            {/* --- Seção da Tabela/Cartões --- */}
            <div className="bg-white dark:bg-gray-800 p-0 md:p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4 px-4 pt-4 md:px-0 md:pt-0">
                    <FaClock className="text-blue-600 dark:text-blue-400"/>
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Detalhes por Hora</h2>
                </div>
                
                {isLoadingData ? <Spinner /> : 
                    (!data?.hourly_data || data.hourly_data.length === 0) ? (
                        <p className="text-center py-10 text-gray-500">Nenhum dado encontrado para esta seleção.</p>
                    ) : (
                        <>
                            {/* --- 1. TABELA DESKTOP --- */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="min-w-full text-base">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                                        <tr>
                                            <th className="w-8"></th>
                                            {['Hora', 'Total Inscrições', 'Total Check-ins', 'Taxa de Check-in'].map(h => <th key={h} className="px-4 py-3 text-left text-sm font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200">
                                        {data.hourly_data.map((row) => {
                                            // MUDANÇA: Cálculo da taxa de check-in baseado no total geral
                                            const checkinRate = (kpis?.total_geral_checkins ?? 0) > 0 
                                                ? ((row.total_checkins / kpis.total_geral_checkins) * 100).toFixed(1) + '%' 
                                                : '0.0%';

                                            return (
                                                <Fragment key={row.creation_hour}>
                                                    <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => toggleRow(row.creation_hour)}>
                                                        <td className="px-4 py-4 text-gray-500">{expandedRows[row.creation_hour] ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}</td>
                                                        <td className="px-4 py-4 font-semibold">{new Date(row.creation_hour).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit' })}h</td>
                                                        <td className="px-4 py-4">{row.total_inscricoes.toLocaleString('pt-BR')}</td>
                                                        <td className="px-4 py-4">{row.total_checkins.toLocaleString('pt-BR')}</td>
                                                        {/* MUDANÇA: Usando a nova variável 'checkinRate' */}
                                                        <td className="px-4 py-4 font-bold text-blue-600 dark:text-blue-400">{checkinRate}</td>
                                                    </tr>
                                                    {expandedRows[row.creation_hour] && row.details && (
                                                        <tr className="bg-gray-50 dark:bg-gray-900/30"><td colSpan={5} className="p-0"><div className="p-4">
                                                            <table className="min-w-full text-base bg-white dark:bg-gray-800 rounded-md shadow-inner">
                                                                <thead className="bg-gray-200 dark:bg-gray-700 text-xs">
                                                                    <tr>
                                                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider pl-12">Detalhe (UTM)</th>
                                                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Inscrições</th>
                                                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Check-ins</th>
                                                                        <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-300 uppercase tracking-wider">Taxa Check-in</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
                                                                    {row.details.map(detail => {
                                                                        // MUDANÇA: Cálculo da taxa de check-in baseado no total geral
                                                                        const detailCheckinRate = (kpis?.total_geral_checkins ?? 0) > 0 
                                                                            ? ((detail.checkins / kpis.total_geral_checkins) * 100).toFixed(1) + '%' 
                                                                            : '0.0%';

                                                                        return (
                                                                            <tr key={detail.utm_value}>
                                                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300 pl-12 truncate" title={detail.utm_value}>{detail.utm_value}</td>
                                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{detail.inscricoes.toLocaleString('pt-BR')}</td>
                                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{detail.checkins.toLocaleString('pt-BR')}</td>
                                                                                {/* MUDANÇA: Usando a nova variável 'detailCheckinRate' */}
                                                                                <td className="px-4 py-3 font-semibold text-blue-500 dark:text-blue-400">{detailCheckinRate}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div></td></tr>
                                                    )}
                                                </Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* --- 2. CARDS MOBILE --- */}
                            <div className="block md:hidden space-y-4 p-4">
                                {data.hourly_data.map((row) => (
                                    // MUDANÇA: Passando 'total_geral_checkins' para o componente filho
                                    <MobileHourlyCard 
                                        key={row.creation_hour} 
                                        row={row} 
                                        totalGeralCheckins={kpis?.total_geral_checkins} 
                                    />
                                ))}
                            </div>
                        </>
                    )
                }
            </div>
        </div>
    );
}

