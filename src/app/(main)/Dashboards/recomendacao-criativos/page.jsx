'use client';

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { TrendingUp, TrendingDown, Eye, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// --- Constantes e Configurações ---
const profileOrder = ['Quente', 'Quente-Morno', 'Morno', 'Morno-Frio', 'Frio'];
const profileStyles = {
    'Quente': { text: 'dark:text-red-300 text-red-800', bg: 'bg-red-100 dark:bg-red-900/50' },
    'Quente-Morno': { text: 'dark:text-orange-300 text-orange-800', bg: 'bg-orange-100 dark:bg-orange-900/50' },
    'Morno': { text: 'dark:text-yellow-300 text-yellow-800', bg: 'bg-yellow-100 dark:bg-yellow-900/50' },
    'Morno-Frio': { text: 'dark:text-sky-300 text-sky-800', bg: 'bg-sky-100 dark:bg-sky-900/50' },
    'Frio': { text: 'dark:text-blue-300 text-blue-800', bg: 'bg-blue-100 dark:bg-blue-900/50' },
};
const recommendationStyles = {
    'Continuar': { icon: CheckCircle, text: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50' },
    'Observar': { icon: AlertCircle, text: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/50' },
    'Descontinuar': { icon: XCircle, text: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50' },
};

// --- Componentes ---
const Spinner = () => <div className="flex justify-center items-center h-60"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>;

const KpiCard = ({ title, value, icon: Icon, colorClass = 'text-blue-500 dark:text-blue-400' }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm text-center flex flex-col justify-center">
        <Icon className={`mx-auto ${colorClass} mb-2`} size={24} />
        <p className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        <h3 className="text-xs md:text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">{title}</h3>
    </div>
);

const RecommendationBadge = ({ recommendation }) => {
    const style = recommendationStyles[recommendation] || {};
    if (!style.icon) return null;
    return (
        <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
            <style.icon size={14} />
            {recommendation}
        </div>
    );
};

const ScoreDistributionDisplay = ({ distribution }) => {
    if (!distribution) return null;
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            {profileOrder.map(profile => {
                const count = distribution[profile] || 0;
                if (count === 0) return null;
                const style = profileStyles[profile];
                return (
                    // --- ALTERAÇÃO: Aumentado o tamanho da fonte de 'text-xs' para 'text-sm' ---
                    <div key={profile} title={`${profile}: ${count}`} className={`px-2.5 py-1 rounded-md text-sm font-semibold ${style.bg} ${style.text}`}>
                        {count}
                    </div>
                );
            })}
        </div>
    );
};

export default function RecomendacaoCriativosPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);

    // Lógica para buscar lançamentos
    useEffect(() => {
        if (!userProfile) return;
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data: launchesData } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
            const sorted = [...(launchesData || [])].sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome));
            setLaunches(sorted);
            if (sorted.length > 0) {
                const inProgress = sorted.find(l => l.status === 'Em andamento');
                setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
            }
            setIsLoadingLaunches(false);
        };
        fetchLaunches();
    }, [supabase, userProfile, selectedClientId]);

    // Lógica para buscar os dados de recomendação
    const fetchData = useCallback(async (launchId) => {
        if (!launchId) return;
        setLoading(true);
        setData([]);
        const { data: result, error } = await supabase.rpc('get_creative_recommendation_analysis', { p_launch_id: launchId });
        if (error) {
            console.error(error);
        } else {
            setData(result || []);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        if (selectedLaunch) {
            fetchData(selectedLaunch);
        } else if (!isLoadingLaunches && launches.length === 0) {
            setLoading(false);
        }
    }, [selectedLaunch, fetchData, isLoadingLaunches, launches.length]);

    // Lógica para atualizar o header
    useEffect(() => {
        const launchSelector = (
            <select value={selectedLaunch} onChange={e => setSelectedLaunch(e.target.value)} disabled={isLoadingLaunches || launches.length === 0} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2">
                {isLoadingLaunches ? <option>Carregando...</option> :
                 launches.length > 0 ?
                 launches.map(l => <option key={l.id} value={l.id}>{(l.codigo || l.nome)} ({l.status})</option>) :
                 <option>Nenhum lançamento</option>}
            </select>
        );
        setHeaderContent({ title: 'Análise de Criativos (Tráfego Pago)', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    const recommendationCounts = React.useMemo(() => {
        return data.reduce((acc, creative) => {
            acc[creative.recomendacao] = (acc[creative.recomendacao] || 0) + 1;
            return acc;
        }, { 'Continuar': 0, 'Observar': 0, 'Descontinuar': 0 });
    }, [data]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg mb-6">
                <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3">Resumo das Recomendações</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KpiCard title="Continuar" value={recommendationCounts['Continuar']} icon={TrendingUp} colorClass="text-green-500" />
                    <KpiCard title="Observar" value={recommendationCounts['Observar']} icon={Eye} colorClass="text-yellow-500" />
                    <KpiCard title="Descontinuar" value={recommendationCounts['Descontinuar']} icon={TrendingDown} colorClass="text-red-500" />
                </div>
            </div>

            <main className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
                {loading ? <Spinner /> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
                                <tr>
                                    <th className="px-4 py-3 w-[25%]">Criativo</th>
                                    <th className="px-4 py-3 text-center">Inscrições</th>
                                    <th className="px-4 py-3 text-center">Check-ins</th>
                                    <th className="px-4 py-3 text-center">Tx. Check-in</th>
                                    <th className="px-4 py-3 text-center w-[20%]">Qualidade (Leads Quentes)</th>
                                    <th className="px-4 py-3 text-center w-[15%]">Recomendação</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-800 dark:text-gray-200">
                                {data.length === 0 ? (
                                    <tr><td colSpan={6} className="text-center p-8 text-gray-500">Nenhum criativo de tráfego pago encontrado para este lançamento.</td></tr>
                                ) : data.map(creative => (
                                    <tr key={creative.criativo} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50" title={`Justificativa: ${creative.justificativa}`}>
                                        <td className="px-4 py-3 font-semibold">{creative.criativo}</td>
                                        <td className="px-4 py-3 text-center">{creative.total_inscricoes}</td>
                                        <td className="px-4 py-3 text-center">{creative.total_checkins}</td>
                                        <td className="px-4 py-3 text-center font-medium">{creative.taxa_checkin}%</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-4">
                                                {/* --- ALTERAÇÃO: Aumentado o tamanho da fonte do número principal --- */}
                                                <span className="text-lg font-bold text-red-600 dark:text-red-400">{creative.leads_quentes}</span>
                                                <ScoreDistributionDisplay distribution={creative.distribuicao_score} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <RecommendationBadge recommendation={creative.recomendacao} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
}