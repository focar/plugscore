'use client';

import React, { useState, useEffect, useCallback, useMemo, useContext, Fragment } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
// --- CORREÇÃO AQUI: Importando os ícones da biblioteca correta ---
import { FaChevronDown, FaChevronRight, FaUsers, FaUserCheck, FaPercent } from 'react-icons/fa';

// --- Componentes ---
const KpiCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-center gap-4">
        <div className="bg-blue-100 dark:bg-gray-700 p-3 rounded-full"><Icon className="text-blue-600 dark:text-blue-400" size={24} /></div>
        <div>
            <p className="text-base text-gray-500 dark:text-gray-400">{title}</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        </div>
    </div>
);
const Spinner = () => <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>;

export default function CampanhasCriativosPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [tableData, setTableData] = useState([]);
    const [expandedCampaigns, setExpandedCampaigns] = useState({});

    const toggleCampaign = (campaignName) => setExpandedCampaigns(prev => ({ ...prev, [campaignName]: !prev[campaignName] }));

    useEffect(() => {
        if (!userProfile) return;
        setIsLoadingLaunches(true);
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
        supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend })
            .then(({ data, error }) => {
                if (error) throw error;
                const sorted = [...(data || [])].sort((a, b) => a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) {
                    const inProgress = sorted.find(l => l.status === 'Em andamento');
                    setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
                } else {
                    setIsLoadingData(false); // Para o loading se não houver lançamentos
                }
            })
            .catch(err => toast.error("Erro ao buscar lançamentos."))
            .finally(() => setIsLoadingLaunches(false));
    }, [userProfile, selectedClientId, supabase]);

    useEffect(() => {
        const launchSelector = (
             <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} disabled={isLoadingLaunches || launches.length === 0} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2">
                 {isLoadingLaunches ? <option>Carregando...</option> : 
                  launches.length > 0 ? 
                  launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>) :
                  <option>Nenhum lançamento</option>}
            </select>
        );
        setHeaderContent({ title: 'Análise de Campanhas e Criativos', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    const fetchData = useCallback(async () => {
        if (!selectedLaunch || !userProfile) {
            if (!isLoadingLaunches) setIsLoadingData(false);
            return;
        };
        setIsLoadingData(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_creative_performance_analysis', {
                p_launch_id: selectedLaunch,
                p_client_id: clientIdToSend,
            });
            if (error) throw error;
            setTableData(data || []);
        } catch (err) { toast.error(`Erro ao carregar dados: ${err.message}`); } 
        finally { setIsLoadingData(false); }
    }, [selectedLaunch, supabase, userProfile, selectedClientId, isLoadingLaunches]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const kpis = useMemo(() => {
        const inscricoesPago = tableData.reduce((sum, campaign) => sum + campaign.inscricoes, 0);
        const checkinsPago = tableData.reduce((sum, campaign) => sum + campaign.checkins, 0);
        const taxaCheckinPago = inscricoesPago > 0 ? ((checkinsPago / inscricoesPago) * 100).toFixed(1) + '%' : '0.0%';
        return { inscricoesPago, checkinsPago, taxaCheckinPago };
    }, [tableData]);

    return (
        <div className="space-y-6 p-4 md:p-6">
            <Toaster />
            <section className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg">
                <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3">Performance do Tráfego Pago</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <KpiCard title="Inscrições Tr. Pago" value={kpis.inscricoesPago.toLocaleString('pt-BR')} icon={FaUsers} />
                    <KpiCard title="Check-ins Tr. Pago" value={kpis.checkinsPago.toLocaleString('pt-BR')} icon={FaUserCheck} />
                    <KpiCard title="Taxa Check-in" value={kpis.taxaCheckinPago} icon={FaPercent} />
                </div>
            </section>
            
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Detalhes por Campanha e Criativo</h2>
                {isLoadingData ? <Spinner /> : (
                    <div className="space-y-4">
                        {tableData.length === 0 ? (
                            <p className="text-center py-10 text-gray-500 dark:text-gray-400">Nenhum dado de tráfego pago encontrado para este lançamento.</p>
                        ) : tableData.map((campaign) => (
                            <div key={campaign.name} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                <div onClick={() => toggleCampaign(campaign.name)} className="bg-gray-100 dark:bg-gray-900/50 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className="text-gray-500 dark:text-gray-400">
                                            {expandedCampaigns[campaign.name] ? <FaChevronDown /> : <FaChevronRight />}
                                        </div>
                                        <span className="font-bold text-gray-800 dark:text-gray-100">{campaign.name}</span>
                                    </div>
                                    <div className="hidden sm:flex items-center gap-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
                                        <span>Inscrições: <span className="font-bold text-blue-600 dark:text-blue-400">{campaign.inscricoes.toLocaleString('pt-BR')}</span></span>
                                        <span>Check-ins: <span className="font-bold text-blue-600 dark:text-blue-400">{campaign.checkins.toLocaleString('pt-BR')}</span></span>
                                        <span>Taxa: <span className="font-bold text-blue-600 dark:text-blue-400">{campaign.checkinRate}</span></span>
                                    </div>
                                </div>
                                {expandedCampaigns[campaign.name] && (
                                    <div className="p-4 overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                                                <tr>
                                                    <th className="p-2 text-left font-medium">Criativo (UTM Term)</th>
                                                    <th className="p-2 text-right font-medium">Inscrições</th>
                                                    <th className="p-2 text-right font-medium">Check-ins</th>
                                                    <th className="p-2 text-right font-medium">Taxa de Check-in</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {campaign.creatives.map(creative => (
                                                    <tr key={creative.name}>
                                                        <td className="p-2 text-gray-800 dark:text-gray-300">{creative.name}</td>
                                                        <td className="p-2 text-right text-gray-600 dark:text-gray-400">{creative.inscricoes.toLocaleString('pt-BR')}</td>
                                                        <td className="p-2 text-right text-gray-600 dark:text-gray-400">{creative.checkins.toLocaleString('pt-BR')}</td>
                                                        <td className="p-2 text-right font-semibold text-blue-600 dark:text-blue-400">{creative.inscricoes > 0 ? ((creative.checkins / creative.inscricoes) * 100).toFixed(1) + '%' : '0.0%'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}