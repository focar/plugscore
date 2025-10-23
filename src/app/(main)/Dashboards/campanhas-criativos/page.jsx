// src\app\(main)\Dashboards\campanhas-criativos\page.jsx
'use client';

import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { Users, UserCheck, Percent } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useMobileCheck from '@/hooks/useMobileCheck';
import ExpandableSourcesTable from './components/ExpandableSourcesTable';

const TRAFFIC_TYPES = ['Todos', 'Pago', 'Orgânico', 'Não Traqueado'];

// --- Componentes (KpiCard, Spinner) sem alterações ---
const KpiCard = ({ title, value, icon: Icon }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-sm text-center flex flex-col justify-center">
        <Icon className="mx-auto text-blue-400 mb-2" size={24} />
        <p className="text-2xl md:text-3xl font-bold text-gray-100">{value}</p>
        <h3 className="text-xs md:text-sm font-medium text-gray-400 mt-1">{title}</h3>
    </div>
);
const Spinner = () => <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>;


export default function CampanhasCriativosPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);
    const isMobile = useMobileCheck();

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [flatData, setFlatData] = useState([]);
    const [masterSelectedCampaign, setMasterSelectedCampaign] = useState(null);
    const [trafficTypeFilter, setTrafficTypeFilter] = useState('Todos');

    // Efeitos de busca de dados (sem alterações)
    useEffect(() => { if (!userProfile) return; setIsLoadingLaunches(true); const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id; supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend }).then(({ data, error }) => { if (error) throw error; const sorted = [...(data || [])].sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome)); setLaunches(sorted); if (sorted.length > 0) { const inProgress = sorted.find(l => l.status.toLowerCase() === 'em andamento'); setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id); } else { setIsLoadingData(false); } }).catch(err => toast.error("Erro ao buscar lançamentos.")).finally(() => setIsLoadingLaunches(false)); }, [userProfile, selectedClientId, supabase]);
    useEffect(() => { const launchSelector = ( <select value={selectedLaunch} onChange={e => { setSelectedLaunch(e.target.value); setMasterSelectedCampaign(null); }} disabled={isLoadingLaunches || launches.length === 0} className="bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2.5"> {isLoadingLaunches ? <option>Carregando...</option> : launches.length > 0 ? launches.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>) : <option>Nenhum lançamento</option>} </select> ); setHeaderContent({ title: 'Análise de Campanhas e Criativos', controls: launchSelector }); return () => setHeaderContent({ title: '', controls: null }); }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);
    const fetchData = useCallback(async () => { if (!selectedLaunch || !userProfile) return; setIsLoadingData(true); setMasterSelectedCampaign(null); try { const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id; const { data, error } = await supabase.rpc('get_utm_performance_flat', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }); if (error) throw error; setFlatData(data || []); } catch (err) { toast.error(`Erro ao carregar dados: ${err.message}`); } finally { setIsLoadingData(false); } }, [selectedLaunch, supabase, userProfile, selectedClientId]);
    useEffect(() => { fetchData(); }, [fetchData]);

    const filteredData = useMemo(() => {
        if (trafficTypeFilter === 'Todos') return flatData;
        return flatData.filter(item => item.tipo_trafego === trafficTypeFilter);
    }, [flatData, trafficTypeFilter]);

    const { generalKpis, selectionKpis } = useMemo(() => {
        const calculateKpis = (dataArray) => {
            if (!dataArray) return { inscricoes: 0, checkins: 0, taxaCheckin: '0.0%' };
            const inscricoes = dataArray.reduce((sum, item) => sum + item.inscricoes, 0);
            const checkins = dataArray.reduce((sum, item) => sum + item.checkins, 0);
            const taxaCheckin = inscricoes > 0 ? `${((checkins / inscricoes) * 100).toFixed(1)}%` : '0.0%';
            return { inscricoes, checkins, taxaCheckin };
        };
        return { generalKpis: calculateKpis(flatData), selectionKpis: calculateKpis(filteredData) };
    }, [flatData, filteredData]);
    
    // ---- Componente MasterDetailView ----
    const MasterDetailView = () => {
        // Lógica interna (sem alterações)
        const campaignChartData = useMemo(() => { const groupedData = new Map(); filteredData.forEach(item => { const key = item.utm_campaign; if (!groupedData.has(key)) { groupedData.set(key, { name: key, checkins: 0 }); } groupedData.get(key).checkins += item.checkins; }); return Array.from(groupedData.values()).sort((a,b) => b.checkins - a.checkins); }, [filteredData]);
        const handleBarClick = (barData) => { if (!barData) return; const clickedName = barData.name; setMasterSelectedCampaign(prev => prev === clickedName ? null : clickedName); };
        const campaignDetailData = useMemo(() => { if (!masterSelectedCampaign) return []; return filteredData.filter(item => item.utm_campaign === masterSelectedCampaign); }, [filteredData, masterSelectedCampaign]);
        const MasterTooltip = ({ active, payload, label }) => { if (active && payload && payload.length) return <div className="bg-gray-800 p-2 rounded shadow-lg border-gray-700 text-sm text-gray-50"><strong className="text-gray-100">{label}</strong><br /><span className="text-gray-300">Check-ins: {payload[0].value.toLocaleString('pt-BR')}</span></div>; return null; };
        const ClickableBar = (props) => { const { x, y, width, height, payload } = props; const isSelected = masterSelectedCampaign === payload.name; const fill = isSelected ? '#60A5FA' : '#3B82F6'; return <rect x={x} y={y} width={width} height={height} fill={fill} onClick={() => handleBarClick(payload)} style={{ cursor: 'pointer' }} />; };

        return (
            <div className="space-y-6 w-full">
                <div className="p-4 rounded-lg shadow-md bg-gray-900/50 overflow-hidden">
                    <h3 className="text-lg font-semibold text-gray-200 mb-4">Performance por Campanha (Mestre)</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={campaignChartData} margin={{ top: 10, right: 10, bottom: isMobile ? 100 : 80, left: isMobile ? 0 : 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                                <XAxis dataKey="name" angle={isMobile ? -65 : -45} textAnchor="end" height={isMobile ? 90: 70} interval={0} stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                                <YAxis stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                                <Tooltip content={<MasterTooltip />} cursor={{fill: 'rgba(107, 114, 128, 0.2)'}} />
                                <Bar dataKey="checkins" shape={<ClickableBar />} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {masterSelectedCampaign && (
                    <div className="p-4 rounded-lg shadow-md bg-gray-900/50">
                        <h3 className="text-lg font-semibold text-gray-200 mb-4">Detalhes da Campanha: <span className="text-blue-400">{masterSelectedCampaign}</span></h3>
                        <div className="overflow-x-auto">
                           <ExpandableSourcesTable data={campaignDetailData} totalKpis={selectionKpis} />
                        </div>
                    </div>
                )}
            </div>
        )
    };

    // *** CORREÇÃO: Mantido overflow-hidden no container principal ***
    return (
        <div className="space-y-4 p-2 md:p-3 overflow-hidden">
            <Toaster position="top-center" />
            {/* KPIs Gerais e de Seleção */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                <div className="bg-gray-900/50 p-4 rounded-lg"><h3 className="font-bold text-center text-gray-300 mb-3">Totais do Lançamento</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><KpiCard title="Inscrições" value={generalKpis.inscricoes.toLocaleString('pt-BR')} icon={Users} /><KpiCard title="Check-ins" value={generalKpis.checkins.toLocaleString('pt-BR')} icon={UserCheck} /><KpiCard title="Taxa de Check-in" value={generalKpis.taxaCheckin} icon={Percent} /></div></div>
                <div className="bg-gray-900/50 p-4 rounded-lg"><h3 className="font-bold text-center text-gray-300 mb-3">Totais da Seleção ({trafficTypeFilter})</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><KpiCard title="Inscrições" value={selectionKpis.inscricoes.toLocaleString('pt-BR')} icon={Users} /><KpiCard title="Check-ins" value={selectionKpis.checkins.toLocaleString('pt-BR')} icon={UserCheck} /><KpiCard title="Taxa de Check-in" value={selectionKpis.taxaCheckin} icon={Percent} /></div></div>
            </section>
            
            {/* Filtro de Tráfego com scroll horizontal */}
            <div className="w-full bg-gray-800 p-1.5 rounded-lg shadow-md flex items-center space-x-1 overflow-x-auto whitespace-nowrap">
                {TRAFFIC_TYPES.map(type => ( <button key={type} onClick={() => { setTrafficTypeFilter(type); setMasterSelectedCampaign(null); }} className={`flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${trafficTypeFilter === type ? 'bg-blue-600 text-white shadow' : 'text-gray-300 hover:bg-gray-700'}`}> {type} </button> ))}
            </div>
            
            {/* Conteúdo Principal */}
            <div className="bg-gray-800 p-2 md:p-4 rounded-lg shadow-md">
                {isLoadingData ? <Spinner /> : filteredData.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">Nenhum dado encontrado para o filtro selecionado.</div>
                ) : (
                    <div>
                        <MasterDetailView />
                    </div>
                )}
            </div>
        </div>
    );
}