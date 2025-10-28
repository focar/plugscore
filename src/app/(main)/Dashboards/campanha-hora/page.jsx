'use client';

import React, { useState, useEffect, useCallback, useContext, Fragment } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { FaFilter, FaClock, FaChevronDown, FaChevronRight, FaGlobe, FaBullseye, FaUsers, FaUserCheck, FaPercent } from 'react-icons/fa';
import { Loader2 } from 'lucide-react'; 

// --- Componentes ---
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


const MobileHourlyCard = ({ row, totalGeralCheckins }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasDetails = row.details && row.details.length > 0;
    const checkinRate = (totalGeralCheckins ?? 0) > 0 
        ? ((row.total_checkins / totalGeralCheckins) * 100).toFixed(1) + '%' 
        : '0.0%';

    return (
        <div className="bg-white dark:bg-gray-700/50 rounded-lg shadow p-3 border border-gray-200 dark:border-gray-700">
            <div 
                className={`flex justify-between items-center ${hasDetails ? 'cursor-pointer' : ''}`} 
                onClick={() => hasDetails && setIsExpanded(!isExpanded)}
            >
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    {new Date(row.creation_hour).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit' })}h
                </h4>
                {hasDetails && (
                    isExpanded ? <FaChevronDown size={14} className="ml-2 flex-shrink-0" /> : <FaChevronRight size={14} className="ml-2 flex-shrink-0" />
                )}
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">Inscrições</dt>
                    <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{row.total_inscricoes.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">Check-ins</dt>
                    <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{row.total_checkins.toLocaleString('pt-BR')}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">Taxa</dt> 
                    <dd className="text-sm font-semibold text-blue-600 dark:text-blue-400 mt-1">{checkinRate}</dd>
                </div>
            </div>

            {isExpanded && hasDetails && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                    <h5 className="font-semibold text-xs mb-2 text-gray-700 dark:text-gray-300">Detalhes (UTM)</h5>
                    <div className="space-y-2">
                        {row.details.map(detail => {
                            const detailCheckinRate = (totalGeralCheckins ?? 0) > 0 
                                ? ((detail.checkins / totalGeralCheckins) * 100).toFixed(1) + '%' 
                                : '0.0%';
                            
                            return (
                                <div key={detail.utm_value} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md shadow-inner space-y-1.5"> 
                                    <p className="font-medium text-xs text-gray-800 dark:text-gray-200 truncate" title={detail.utm_value}>{detail.utm_value || "(não definido)"}</p>
                                    <div className="grid grid-cols-3 gap-1 text-center text-xs"> 
                                        <div>
                                            <dt className="text-[10px] text-gray-500 dark:text-gray-400">Inscrições</dt>
                                            <dd className="font-medium text-gray-700 dark:text-gray-300">{detail.inscricoes.toLocaleString('pt-BR')}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[10px] text-gray-500 dark:text-gray-400">Check-ins</dt>
                                            <dd className="font-medium text-gray-700 dark:text-gray-300">{detail.checkins.toLocaleString('pt-BR')}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[10px] text-gray-500 dark:text-gray-400">Taxa</dt> 
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
    const [isLoadingData, setIsLoadingData] = useState(false); 
    const [data, setData] = useState(null);
    const [expandedRows, setExpandedRows] = useState({}); 
    const [filters, setFilters] = useState({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
    const [options, setOptions] = useState({ sources: [], mediums: [], campaigns: [], contents: [], terms: [] });

    const toggleRow = (hora) => setExpandedRows(prev => ({ ...prev, [hora]: !prev[hora] }));

    // Efeito para buscar Lançamentos (com trava)
    useEffect(() => {
        if (!userProfile) return;
        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

        if (isAllClients) {
            setLaunches([]); setSelectedLaunch(''); setIsLoadingLaunches(false); setData(null); setIsLoadingData(false);
            setFilters({ source: 'all', medium: 'all', campaign: 'all', content: 'all', term: 'all' });
            setOptions({ sources: [], mediums: [], campaigns: [], contents: [], terms: [] });
            return;
        }

        const fetchLaunches = async () => {
            setIsLoadingLaunches(true); setData(null); setIsLoadingData(true); 
            try {
                const { data: launchesData, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
                if (error) throw error;
                const sorted = [...(launchesData || [])].sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome));
                setLaunches(sorted); setSelectedLaunch(''); 
            } catch (err) { console.error(err); toast.error("Erro ao buscar lançamentos."); setLaunches([]); } 
            finally { setIsLoadingLaunches(false); setIsLoadingData(false); }
        };
        fetchLaunches();
    }, [supabase, userProfile, selectedClientId]);
    
    // Efeito para configurar o Header (com trava)
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
                {launches.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>)}
            </select>
        );
        setHeaderContent({ title: 'Análise de Campanha por Hora', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches, userProfile, selectedClientId]);

    // Busca de opções de filtro
    const fetchFilterOptions = useCallback(async (rpcName, params) => {
        if (!selectedLaunch || !userProfile) return [];
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
        try {
            const { data, error } = await supabase.rpc(rpcName, { ...params, p_client_id: clientIdToSend });
            if (error) { console.error(`Erro ao buscar ${rpcName}:`, error.message); return []; }
            return data?.map(d => d[Object.keys(d)[0]]).filter(Boolean) || []; 
        } catch (err) { console.error(`Exceção ao buscar ${rpcName}:`, err); return []; }
    }, [selectedLaunch, supabase, userProfile, selectedClientId]); 

    // Efeitos para carregar opções dos filtros
    useEffect(() => {
        if (!selectedLaunch) { setOptions(o => ({...o, sources: []})); setFilters(f => ({...f, source:'all', medium:'all', campaign:'all', content:'all', term:'all'})); return; }
        setFilters(f => ({...f, source:'all', medium:'all', campaign:'all', content:'all', term:'all'})); 
        fetchFilterOptions('get_utm_sources', { p_launch_id: selectedLaunch })
            .then(sources => setOptions({ sources, mediums: [], campaigns: [], contents: [], terms: [] }));
    }, [selectedLaunch, fetchFilterOptions]);

    useEffect(() => {
        if (!selectedLaunch || filters.source === 'all') { setOptions(p => ({ ...p, mediums: [], campaigns: [], contents: [], terms: [] })); return; }
        fetchFilterOptions('get_utm_mediums', { p_launch_id: selectedLaunch, p_source: filters.source })
            .then(mediums => setOptions(p => ({ ...p, mediums, campaigns: [], contents: [], terms: [] })));
    }, [filters.source, selectedLaunch, fetchFilterOptions]);
    
    useEffect(() => {
        if (!selectedLaunch || filters.medium === 'all') { setOptions(p => ({ ...p, campaigns: [], contents: [], terms: [] })); return; }
        fetchFilterOptions('get_utm_campaigns', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium })
             .then(campaigns => setOptions(p => ({ ...p, campaigns, contents: [], terms: [] })));
    }, [filters.medium, filters.source, selectedLaunch, fetchFilterOptions]);
    
    useEffect(() => {
        if (!selectedLaunch || filters.campaign === 'all') { setOptions(p => ({ ...p, contents: [], terms: [] })); return; }
        fetchFilterOptions('get_utm_contents', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign })
             .then(contents => setOptions(p => ({ ...p, contents, terms: [] })));
    }, [filters.campaign, filters.medium, filters.source, selectedLaunch, fetchFilterOptions]);
    
    useEffect(() => {
        if (!selectedLaunch || filters.content === 'all') { setOptions(p => ({ ...p, terms: [] })); return; }
        fetchFilterOptions('get_utm_terms', { p_launch_id: selectedLaunch, p_source: filters.source, p_medium: filters.medium, p_campaign: filters.campaign, p_content: filters.content })
             .then(terms => setOptions(p => ({ ...p, terms })));
    }, [filters.content, filters.campaign, filters.medium, filters.source, selectedLaunch, fetchFilterOptions]);

    // Busca principal dos dados (com trava)
    const fetchData = useCallback(async () => {
        if (!selectedLaunch || !userProfile) { setData(null); setIsLoadingData(false); return; } 
        setIsLoadingData(true); setData(null); setExpandedRows({}); 
        try {
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data: result, error } = await supabase.rpc('get_campaign_hourly_analysis', {
                p_launch_id: selectedLaunch, p_client_id: clientIdToSend,
                p_utm_source: filters.source === 'all' ? null : filters.source,
                p_utm_medium: filters.medium === 'all' ? null : filters.medium,
                p_utm_campaign: filters.campaign === 'all' ? null : filters.campaign,
                p_utm_content: filters.content === 'all' ? null : filters.content,
                p_utm_term: filters.term === 'all' ? null : filters.term,
            });
            if (error) throw error;
            setData(result); 
        } catch (err) { 
             console.error("Erro ao buscar dados horários:", err);
             toast.error(`Erro ao carregar dados: ${err.message}`); 
             setData(null);
        } finally { setIsLoadingData(false); }
    }, [selectedLaunch, filters.source, filters.medium, filters.campaign, filters.content, filters.term, supabase, userProfile, selectedClientId]);

    // Dispara busca de dados
    useEffect(() => { fetchData(); }, [fetchData]);

    const kpis = data?.kpis; 
    const hourlyData = data?.hourly_data || []; 
    
    const taxaCheckinGeral = (kpis && kpis.total_geral_inscricoes > 0) ? (kpis.total_geral_checkins / kpis.total_geral_inscricoes * 100) : 0;
    const taxaCheckinFiltrado = (kpis && kpis.total_filtrado_inscricoes > 0) ? (kpis.total_filtrado_checkins / kpis.total_filtrado_inscricoes * 100) : 0;
    
    // Handler para mudança de filtros
    const handleFilterChange = (level, value) => {
         setFilters(prev => {
            const newFilters = { ...prev, [level]: value };
            if (level === 'source') {
                newFilters.medium = 'all'; newFilters.campaign = 'all'; newFilters.content = 'all'; newFilters.term = 'all';
            } else if (level === 'medium') {
                newFilters.campaign = 'all'; newFilters.content = 'all'; newFilters.term = 'all';
            } else if (level === 'campaign') {
                newFilters.content = 'all'; newFilters.term = 'all';
            } else if (level === 'content') {
                newFilters.term = 'all';
            }
            return newFilters;
        });
    };

    // Condição de loading principal
    const isPageLoading = isLoadingData || isLoadingLaunches;

    return (
        <div className="space-y-4 sm:space-y-6 px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
            <Toaster />
            {/* Seção de KPIs */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4"> 
                <div className="dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3 text-sm sm:text-base">Totais do Lançamento</h3>
                    {/* *** CORREÇÃO: grid-cols-1 no mobile, sm:grid-cols-3 em telas maiores *** */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3"> 
                        <KpiCard title="Inscrições" value={(kpis?.total_geral_inscricoes ?? 0).toLocaleString('pt-BR')} icon={FaGlobe} />
                        <KpiCard title="Check-ins" value={(kpis?.total_geral_checkins ?? 0).toLocaleString('pt-BR')} icon={FaBullseye} />
                        <KpiCard title="Taxa" value={`${taxaCheckinGeral.toFixed(1)}%`} icon={FaPercent} /> 
                    </div>
                </div>
                <div className="dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg">
                   <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3 text-sm sm:text-base">Totais do Filtro Atual</h3>
                    {/* *** CORREÇÃO: grid-cols-1 no mobile, sm:grid-cols-3 em telas maiores *** */}
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3"> 
                       <KpiCard title="Inscrições" value={(kpis?.total_filtrado_inscricoes ?? 0).toLocaleString('pt-BR')} icon={FaUsers} />
                       <KpiCard title="Check-ins" value={(kpis?.total_filtrado_checkins ?? 0).toLocaleString('pt-BR')} icon={FaUserCheck} />
                       <KpiCard title="Taxa" value={`${taxaCheckinFiltrado.toFixed(1)}%`} icon={FaPercent} /> 
                   </div>
                </div>
            </section>
            
            {/* Seção de Filtros */}
            <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-2 mb-4">
                    <FaFilter className="text-blue-600 dark:text-blue-400"/> 
                    <h2 className="text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-200">Filtros de Análise</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                    {Object.keys(filters).map((key, index) => {
                        const previousKey = Object.keys(filters)[index-1];
                        const isDisabled = isPageLoading || (index > 0 && filters[previousKey] === 'all') || !selectedLaunch; 
                        return (
                            <div key={key}>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 capitalize">{`UTM ${key}`}</label>
                                <select 
                                    value={filters[key]} 
                                    onChange={e => handleFilterChange(key, e.target.value)} 
                                    className="w-full pl-2 pr-8 sm:pl-3 sm:pr-10 py-1.5 sm:py-2 text-sm border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-md disabled:opacity-50" 
                                    disabled={isDisabled}>
                                    <option value="all">Todos</option>
                                    {(options[`${key}s`] || []).map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* --- Seção da Tabela/Cartões --- */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                <div className="flex items-center gap-2 mb-4 px-3 pt-4 sm:px-4 sm:pt-4 md:px-6 md:pt-6"> 
                    <FaClock className="text-blue-600 dark:text-blue-400"/>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-700 dark:text-gray-200">Detalhes por Hora</h2>
                </div>
                
                {isPageLoading ? (
                    <Spinner /> 
                ) : !selectedLaunch ? (
                     <p className="text-center py-10 text-gray-500 text-sm sm:text-base">Selecione um cliente e um lançamento.</p>
                ) : hourlyData.length === 0 ? (
                    <p className="text-center py-10 text-gray-500 text-sm sm:text-base">Nenhum dado encontrado para esta seleção.</p>
                ) : (
                    <>
                        {/* --- TABELA DESKTOP --- */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="min-w-full text-sm"> 
                                <thead className="bg-gray-50 dark:bg-gray-900/50">
                                    <tr>
                                        <th className="w-8"></th>
                                        {['Hora', 'Inscrições', 'Check-ins', 'Taxa'].map(h => <th key={h} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200">
                                    {hourlyData.map((row) => {
                                        const checkinRate = (kpis?.total_geral_checkins ?? 0) > 0 
                                            ? ((row.total_checkins / kpis.total_geral_checkins) * 100).toFixed(1) + '%' 
                                            : '0.0%';

                                        return (
                                            <Fragment key={row.creation_hour}>
                                                <tr className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer" onClick={() => toggleRow(row.creation_hour)}>
                                                    <td className="px-3 py-3 text-gray-500">{expandedRows[row.creation_hour] ? <FaChevronDown size={14} /> : <FaChevronRight size={14} />}</td>
                                                    <td className="px-3 py-3 font-semibold">{new Date(row.creation_hour).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit' })}h</td>
                                                    <td className="px-3 py-3">{row.total_inscricoes.toLocaleString('pt-BR')}</td>
                                                    <td className="px-3 py-3">{row.total_checkins.toLocaleString('pt-BR')}</td>
                                                    <td className="px-3 py-3 font-bold text-blue-600 dark:text-blue-400">{checkinRate}</td>
                                                </tr>
                                                {expandedRows[row.creation_hour] && row.details && (
                                                    <tr className="bg-gray-50 dark:bg-gray-900/30"><td colSpan={5} className="p-0"><div className="p-3"> 
                                                        <table className="min-w-full text-xs bg-white dark:bg-gray-800 rounded-md shadow-inner"> 
                                                            <thead className="bg-gray-200 dark:bg-gray-700 text-[10px] uppercase"> 
                                                                <tr>
                                                                    <th className="px-2 py-1 text-left font-medium text-gray-600 dark:text-gray-300 tracking-wider pl-8">Detalhe (UTM)</th>
                                                                    <th className="px-2 py-1 text-left font-medium text-gray-600 dark:text-gray-300 tracking-wider">Inscrições</th>
                                                                    <th className="px-2 py-1 text-left font-medium text-gray-600 dark:text-gray-300 tracking-wider">Check-ins</th>
                                                                    <th className="px-2 py-1 text-left font-medium text-gray-600 dark:text-gray-300 tracking-wider">Taxa</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                {row.details.map(detail => {
                                                                    const detailCheckinRate = (kpis?.total_geral_checkins ?? 0) > 0 
                                                                        ? ((detail.checkins / kpis.total_geral_checkins) * 100).toFixed(1) + '%' 
                                                                        : '0.0%';

                                                                    return (
                                                                        <tr key={detail.utm_value}>
                                                                            <td className="px-2 py-1.5 text-gray-700 dark:text-gray-300 pl-8 truncate" title={detail.utm_value}>{detail.utm_value || "(não definido)"}</td>
                                                                            <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{detail.inscricoes.toLocaleString('pt-BR')}</td>
                                                                            <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{detail.checkins.toLocaleString('pt-BR')}</td>
                                                                            <td className="px-2 py-1.5 font-semibold text-blue-500 dark:text-blue-400">{detailCheckinRate}</td>
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
                        
                        {/* --- CARTÕES MOBILE --- */}
                        <div className="block md:hidden space-y-3 p-2">
                            {hourlyData.map((row) => (
                                <MobileHourlyCard 
                                    key={row.creation_hour} 
                                    row={row} 
                                    totalGeralCheckins={kpis?.total_geral_checkins} 
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

