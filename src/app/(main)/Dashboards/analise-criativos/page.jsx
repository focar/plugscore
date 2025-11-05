// Arquivo: /app/(main)/dashboard/analise-criativos/page.jsx

'use client';

import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { TrendingUp, TrendingDown, Eye, CheckCircle, XCircle, AlertCircle, Hash, Percent, Target, UserCheck, Loader2 } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// --- Constantes e Configurações ---
// MANTEMOS A ORDEM CORRETA DE QUALIDADE PARA ORDENAÇÃO
const profileOrder = ['Quente', 'Quente-Morno', 'Morno', 'Morno-Frio', 'Frio']; 
const profileStyles = {
    'Quente': { text: 'dark:text-red-300 text-red-800', bg: 'bg-red-100 dark:bg-red-900/50', color: 'bg-red-500' },
    'Quente-Morno': { text: 'dark:text-orange-300 text-orange-800', bg: 'bg-orange-100 dark:bg-orange-900/50', color: 'bg-orange-500' },
    'Morno': { text: 'dark:text-yellow-300 text-yellow-800', bg: 'bg-yellow-100 dark:bg-yellow-900/50', color: 'bg-yellow-500' },
    'Morno-Frio': { text: 'dark:text-sky-300 text-sky-800', bg: 'bg-sky-100 dark:bg-sky-900/50', color: 'bg-sky-500' },
    'Frio': { text: 'dark:text-blue-300 text-blue-800', bg: 'bg-blue-100 dark:bg-blue-900/50', color: 'bg-blue-500' },
};
const recommendationStyles = {
    'Continuar': { icon: CheckCircle, text: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50' },
    'Observar': { icon: AlertCircle, text: 'text-yellow-700 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/50' },
    'Descontinuar': { icon: XCircle, text: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50' },
    'A calcular': { icon: Eye, text: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700/50' }, 
};

// --- Componentes ---
const Spinner = () => <div className="flex justify-center items-center h-60"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

const KpiCard = ({ title, value, icon: Icon, colorClass = 'text-blue-500 dark:text-blue-400' }) => (
    <div className="bg-white dark:bg-gray-800 p-2 sm:p-4 rounded-lg shadow-sm text-center flex flex-col justify-center">
        <Icon className={`mx-auto ${colorClass} mb-1 sm:mb-2 h-5 w-5 sm:h-6 sm:w-6`} /> 
        <p className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{title}</h3>
    </div>
);

const RecommendationBadge = ({ recommendation }) => {
    const style = recommendationStyles[recommendation] || recommendationStyles['A calcular']; 
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
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {profileOrder.map(profile => {
                const perc = distribution[profile]?.perc || 0; 
                if (perc < 0.1) return null; 
                
                const style = profileStyles[profile];
                return (
                    <div 
                        key={profile} 
                        title={`${profile}: ${perc.toFixed(1)}%`} 
                        className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}
                    >
                        {perc.toFixed(1)}%
                    </div>
                );
            })}
        </div>
    );
};

const MobileCreativeCard = ({ creative }) => (
    <div className="bg-white dark:bg-gray-700/50 rounded-lg shadow-md p-3 space-y-3 border border-gray-200 dark:border-gray-700" title={`Justificativa: ${creative.justificativa}`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white break-words w-full sm:w-auto">{creative.criativo}</h4>
            <div className="flex-shrink-0">
                <RecommendationBadge recommendation={creative.recomendacao} />
            </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
            <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Qualidade (Percentual de Check-ins)</h5>
            <div className="flex items-center justify-start gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
                <div className="text-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Quente %</span>
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">{creative.leads_quentes_perc.toFixed(1)}%</span> 
                </div>
                <div className="flex-1">
                    <ScoreDistributionDisplay distribution={creative.distribuicao_score} />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-200 dark:border-gray-600 pt-3">
            <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center gap-1"><Hash size={12} /> Inscrições</dt>
                <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{creative.total_inscricoes.toLocaleString('pt-BR')}</dd>
            </div>
            <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center gap-1"><UserCheck size={12} /> Check-ins</dt>
                <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{creative.total_checkins.toLocaleString('pt-BR')}</dd>
            </div>
            <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center justify-center gap-1"><Percent size={12} /> Tx. Check-in</dt>
                <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{creative.checkin_share.toFixed(1)}%</dd>
            </div>
        </div>
    </div>
);


export default function RecomendacaoCriativosPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);

    // Efeito para buscar lançamentos (Mantido)
    useEffect(() => {
        if (!userProfile) return;
        
        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

        if (isAllClients) {
            setLaunches([]);
            setSelectedLaunch('');
            setIsLoadingLaunches(false);
            setData([]);
            setLoading(false);
            return;
        }

        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            setData([]);
            setLoading(true);
            
            const { data: launchesData, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
            
            if (error) {
                toast.error("Falha ao carregar lançamentos.");
                setLaunches([]);
            } else {
                const sorted = [...(launchesData || [])].sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome));
                setLaunches(sorted);
                setSelectedLaunch(''); 
            }
            setIsLoadingLaunches(false);
            setLoading(false); 
        };
        fetchLaunches();
    }, [supabase, userProfile, selectedClientId]);

    // Efeito para buscar os dados de recomendação (CORRIGIDO com ordenação em cascata)
    const fetchData = useCallback(async (launchId) => {
        if (!launchId || !userProfile) {
            setData([]);
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setData([]); 

        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
        
        const { data: result, error } = await supabase.rpc('get_creative_recommendation_analysis', { 
            p_launch_id: launchId,
            p_client_id: clientIdToSend 
        });
        
        if (error) {
            console.error("Supabase RPC Error:", error); 
            toast.error(`Falha ao carregar análise de criativos: ${error.message}`); 
            setData([]);
        } else {
            const rawData = result?.criativos || [];
            const totalCheckinsLancamento = result?.total_checkins_lancamento || 0;
            
            const processedData = rawData.map(creative => {
                const totalCheckinsCreative = creative.total_checkins || 0;
                
                // CÁLCULO 1: Nova Taxa de Check-in (Share of Total Check-ins)
                const checkinShare = totalCheckinsLancamento > 0 
                    ? (totalCheckinsCreative / totalCheckinsLancamento) * 100 
                    : 0;

                // CÁLCULO 3: Transformar Contagem Bruta de Score em Percentual
                const scorePercents = profileOrder.reduce((acc, profile) => {
                    const count = creative.distribuicao_score_raw?.[profile] || 0;
                    const perc = totalCheckinsCreative > 0 ? (count / totalCheckinsCreative) * 100 : 0;
                    
                    if (profile === 'Quente') {
                        creative.leads_quentes_perc = perc;
                    }

                    acc[profile] = { count, perc };
                    return acc;
                }, {});

                return {
                    ...creative,
                    checkin_share: checkinShare,
                    // Mantém o raw para ordenação!
                    distribuicao_score_raw: creative.distribuicao_score_raw, 
                    distribuicao_score: scorePercents, // Armazena {count, perc}
                };
            });

            // 2. CORREÇÃO FINAL: Ordenação por Scores em Cascata (Quente > Q-Morno > Morno > M-Frio > Frio)
            const sortedData = processedData.sort((a, b) => {
                const scores = ['Quente', 'Quente-Morno', 'Morno', 'Morno-Frio', 'Frio'];

                for (const score of scores) {
                    // Obtém a contagem bruta de cada score
                    const aCount = a.distribuicao_score_raw[score] || 0;
                    const bCount = b.distribuicao_score_raw[score] || 0;

                    if (aCount !== bCount) {
                        return bCount - aCount; // ORDENAÇÃO DESCENDENTE (MAIOR VALOR PRIMEIRO)
                    }
                }
                
                // Segundo critério de desempate: Tx. Check-in (Share)
                if (b.checkin_share !== a.checkin_share) {
                    return b.checkin_share - a.checkin_share; // Descendente
                }

                // Terceiro critério (Tie-breaker): Nome do criativo
                return a.criativo.localeCompare(b.criativo);
            });


            setData(sortedData);
        }
        setLoading(false);
    }, [userProfile, selectedClientId]); 

    // Efeito que dispara a busca de dados quando o lançamento selecionado muda
    useEffect(() => {
        fetchData(selectedLaunch);
    }, [selectedLaunch, fetchData]);

    // Efeito para atualizar o header (Dropdown de Lançamento) (Mantido)
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
                {!isClientSelected ? (
                    <option value="" disabled>Selecione um cliente</option>
                ) : isLoadingLaunches ? (
                    <option value="" disabled>Carregando...</option>
                ) : launches.length === 0 ? (
                    <option value="" disabled>Nenhum lançamento</option>
                ) : (
                    <option value="">Selecione um lançamento</option>
                )}
                
                {launches.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>)}
            </select>
        );
        setHeaderContent({ title: 'Análise de Criativos (Tráfego Pago)', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches, userProfile, selectedClientId]);

    // Lógica de contagem (Mantido)
    const recommendationCounts = useMemo(() => {
        return data.reduce((acc, creative) => {
            acc[creative.recomendacao] = (acc[creative.recomendacao] || 0) + 1;
            return acc;
        }, { 'Continuar': 0, 'Observar': 0, 'Descontinuar': 0 });
    }, [data]);

    // Condição de loading principal
    const isPageLoading = loading || isLoadingLaunches;

    return (
        <div className="px-0 py-2 sm:px-4 sm:py-4 lg:px-6 lg:py-6">
            <Toaster position="top-center" /> 
            
            <div className="bg-gray-100 dark:bg-gray-800/50 px-0 py-2 sm:p-4 rounded-lg mb-4">
                <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3">Resumo das Recomendações</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4">
                    <KpiCard title="Continuar" value={recommendationCounts['Continuar']} icon={TrendingUp} colorClass="text-green-500" />
                    <KpiCard title="Observar" value={recommendationCounts['Observar']} icon={Eye} colorClass="text-yellow-500" />
                    <KpiCard title="Descontinuar" value={recommendationCounts['Descontinuar']} icon={TrendingDown} colorClass="text-red-500" />
                </div>
            </div>

            <main className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden px-2 md:px-0">
                {isPageLoading ? (
                    <Spinner /> 
                ) : !selectedLaunch ? (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                        Por favor, selecione um cliente e um lançamento para ver a análise.
                    </div>
                ) : data.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                        Nenhum criativo de tráfego pago encontrado para este lançamento.
                    </div>
                ) : (
                    <>
                        {/* Tabela Desktop */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 w-[25%]">Criativo</th>
                                        <th className="px-4 py-3 text-center">Inscrições</th>
                                        <th className="px-4 py-3 text-center">Check-ins</th>
                                        <th className="px-4 py-3 text-center" title="Participação no Total de Check-ins">Tx. Check-in (Share)</th>
                                        <th className="px-4 py-3 text-center w-[25%] lg:w-[20%]" title="Distribuição de Scores (Porcentagem do total de check-ins do criativo)">Qualidade (Percentual)</th>
                                        <th className="px-4 py-3 text-center w-[15%]">Recomendação</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-800 dark:text-gray-200">
                                    {data.map(creative => (
                                        <tr key={creative.criativo} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50" title={`Justificativa: ${creative.justificativa}`}>
                                            <td className="px-4 py-3 font-semibold break-words">{creative.criativo}</td>
                                            <td className="px-4 py-3 text-center">{creative.total_inscricoes.toLocaleString('pt-BR')}</td>
                                            <td className="px-4 py-3 text-center">{creative.total_checkins.toLocaleString('pt-BR')}</td>
                                            {/* Tx. Check-in agora é Share of Total Check-ins */}
                                            <td className="px-4 py-3 text-center font-bold text-blue-500">{creative.checkin_share.toFixed(1)}%</td> 
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2 sm:gap-4">
                                                     {/* Exibe a % de Quentes em relação ao total de Check-ins do Criativo */}
                                                    <span className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400" title={`Leads Quentes: ${creative.leads_quentes_perc.toFixed(1)}%`}>
                                                        {creative.leads_quentes_perc.toFixed(1)}%
                                                    </span>
                                                    {/* Exibe o restante da distribuição em porcentagem */}
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

                        {/* Cartões Mobile (Usa MobileCreativeCard atualizado) */}
                        <div className="block md:hidden space-y-4 py-4"> 
                            {data.map(creative => (
                                <MobileCreativeCard key={creative.criativo} creative={creative} />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}