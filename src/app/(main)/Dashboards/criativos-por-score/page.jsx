'use client';

import React, { useState, useEffect, useCallback, Fragment, useMemo, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { ChevronDown, ChevronRight, Users, UserCheck, Percent, Loader2 } from 'lucide-react'; // Adicionado Loader2
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast'; // Adicionado Toaster

// --- Constantes e Configurações ---
const profileOrder = ['Quente', 'Quente-Morno', 'Morno', 'Morno-Frio', 'Frio'];
const profileStyles = {
    'Quente': { text: 'dark:text-red-300 text-red-800', bg: 'bg-red-100 dark:bg-red-900/50' },
    'Quente-Morno': { text: 'dark:text-orange-300 text-orange-800', bg: 'bg-orange-100 dark:bg-orange-900/50' },
    'Morno': { text: 'dark:text-yellow-300 text-yellow-800', bg: 'bg-yellow-100 dark:bg-yellow-900/50' },
    'Morno-Frio': { text: 'dark:text-sky-300 text-sky-800', bg: 'bg-sky-100 dark:bg-sky-900/50' },
    'Frio': { text: 'dark:text-blue-300 text-blue-800', bg: 'bg-blue-100 dark:bg-blue-900/50' },
};
const TRAFFIC_TYPES = ['Pago', 'Orgânico', 'Não Traqueado'];

// --- Componentes ---
const Spinner = () => <div className="flex justify-center items-center h-60"><Loader2 className="animate-spin text-blue-500" size={48} /></div>;

// Componente KpiCard ajustado para responsividade
const KpiCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm text-center flex flex-col justify-center">
        <Icon className="mx-auto text-blue-500 dark:text-blue-400 mb-1 sm:mb-2 h-5 w-5 sm:h-6 sm:w-6" />
        <p className="text-xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{title}</h3>
    </div>
);

// Componente ScoreDistributionDisplay ajustado para responsividade
const ScoreDistributionDisplay = ({ distribution }) => (
    <div className="flex flex-wrap items-center gap-1"> {/* Reduzido gap padrão */}
        {profileOrder.map(profile => {
            const count = distribution?.[profile] || 0;
            if (count === 0) return null;
            const style = profileStyles[profile];
            return (
                <div key={profile} className={`px-1.5 py-0.5 rounded-md text-xs font-semibold ${style.bg} ${style.text}`}>
                    {profile}: {count}
                </div>
            );
        })}
    </div>
);

// Componente MobileCampaignCard ajustado para responsividade
const MobileCampaignCard = ({ campaign, subLevelKeyName, generalTotalCheckins, onDetailClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasDetails = campaign.details && campaign.details.length > 0;
    const checkinRate = generalTotalCheckins > 0 ? ((campaign.total_checkins / generalTotalCheckins) * 100).toFixed(1) + '%' : '0.0%';

    return (
        // Padding interno p-3
        <div className="bg-white dark:bg-gray-700/50 rounded-lg shadow-md p-3 space-y-3 border border-gray-200 dark:border-gray-700">
            <div 
                className={`flex items-center justify-between ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && setIsExpanded(!isExpanded)}
            >
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white break-words flex-1 pr-2"> {/* Adicionado pr-2 */}
                    {campaign.primary_grouping}
                </h4>
                {hasDetails && (
                    isExpanded ? <ChevronDown size={18} className="ml-2 flex-shrink-0"/> : <ChevronRight size={18} className="ml-2 flex-shrink-0"/>
                )}
            </div>

            {/* Métricas Principais com texto menor */}
            <div className="grid grid-cols-3 gap-2 text-center border-t border-gray-200 dark:border-gray-600 pt-3">
                <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">Inscrições</dt>
                    <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{campaign.total_inscricoes}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">Check-ins</dt>
                    <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{campaign.total_checkins}</dd>
                </div>
                <div>
                    <dt className="text-xs text-gray-500 dark:text-gray-400 font-medium">Tx. Check-in</dt>
                    <dd className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-1">{checkinRate}</dd>
                </div>
            </div>

            {/* Detalhes Expansíveis */}
            {isExpanded && hasDetails && (
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <h4 className="font-semibold mb-2 text-xs text-gray-700 dark:text-gray-300">Detalhes por {subLevelKeyName}:</h4>
                    <div className="space-y-2">
                        {campaign.details.map(detail => {
                            const detailCheckinRate = generalTotalCheckins > 0 ? ((detail.total_checkins / generalTotalCheckins) * 100).toFixed(1) + '%' : '0.0%';
                            return (
                                <div 
                                    key={detail.utm_detail} 
                                    className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md shadow-inner space-y-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                    onClick={() => onDetailClick(detail.utm_detail)}
                                >
                                    <p className="font-semibold text-xs text-gray-800 dark:text-gray-200 break-words">{detail.utm_detail || '(não definido)'}</p>
                                    
                                    <div className="grid grid-cols-3 gap-1 text-center">
                                        <div>
                                            <dt className="text-[10px] text-gray-500 dark:text-gray-400">Inscrições</dt>
                                            <dd className="text-xs font-medium text-gray-900 dark:text-gray-100">{detail.total_inscricoes}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[10px] text-gray-500 dark:text-gray-400">Check-ins</dt>
                                            <dd className="text-xs font-medium text-gray-900 dark:text-gray-100">{detail.total_checkins}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[10px] text-gray-500 dark:text-gray-400">Tx. Check-in</dt>
                                            <dd className="text-xs font-medium text-gray-900 dark:text-gray-100">{detailCheckinRate}</dd>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                                        <dt className="text-[10px] text-gray-500 dark:text-gray-400 mb-1">Distribuição de Score</dt>
                                        <ScoreDistributionDisplay distribution={detail.score_distribution} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};


export default function CriativosPorScorePage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);
    const router = useRouter(); 

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [trafficType, setTrafficType] = useState('Pago');
    const [data, setData] = useState({});
    const [loading, setLoading] = useState(false); // Inicia como false
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [error, setError] = useState(null);
    const [expandedRows, setExpandedRows] = useState({}); 

    // Efeito para buscar lançamentos
    useEffect(() => {
        if (!userProfile) return;

        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

        // Se "Todos os Clientes", limpa e para
        if (isAllClients) {
            setLaunches([]);
            setSelectedLaunch('');
            setIsLoadingLaunches(false);
            setData({}); // Limpa dados da tabela
            setLoading(false); // Para spinner principal
            setError(null); // Limpa erros
            return;
        }

        // Busca lançamentos para cliente específico
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            setData({}); // Limpa dados ao trocar cliente
            setLoading(true); // Mostra spinner principal
            setError(null); // Limpa erros
            
            const { data: launchesData, error: launchError } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
            
            if (launchError) { 
                console.error(launchError);
                toast.error("Falha ao carregar lançamentos.");
                setLaunches([]);
            } else {
                const sorted = [...(launchesData || [])].sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome));
                setLaunches(sorted);
                setSelectedLaunch(''); // Não auto-seleciona
            }
            setIsLoadingLaunches(false);
            setLoading(false); // Para spinner principal
        };
        fetchLaunches();
    }, [supabase, userProfile, selectedClientId]);

    // Efeito para buscar os dados de análise de score
    const fetchData = useCallback(async (launchId) => {
        // Só busca se um launchId for selecionado
        if (!launchId || !userProfile) {
            setData({});
            setLoading(false);
            setError(null);
            return;
        }
        
        setLoading(true);
        setData({}); // Limpa dados antigos
        setError(null);

        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
        
        try {
            const { data: result, error: rpcError } = await supabase.rpc('get_campaign_score_analysis', { 
                p_launch_id: launchId,
                p_client_id: clientIdToSend
            });
            if (rpcError) throw rpcError;
            setData(result || {});
        } catch (err) {
            console.error("Supabase RPC Error:", err);
            setError("Falha ao carregar a análise de score."); // Mensagem genérica
            setData({});
        } finally {
            setLoading(false);
        }
    }, [supabase, userProfile, selectedClientId]); // Depende do userProfile e selectedClientId

    // Efeito que dispara a busca de dados quando o lançamento selecionado muda
    useEffect(() => {
        fetchData(selectedLaunch);
    }, [selectedLaunch, fetchData]);
    
    // Efeito para atualizar o header (Dropdown de Lançamento)
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
        setHeaderContent({ title: 'Análise de Criativos por Score', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches, userProfile, selectedClientId]);


    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Navegação ao clicar no detalhe
    const handleDetailClick = (termo) => {
        if (!termo || !selectedLaunch) return; // Precisa do termo e do lançamento
        // Encontra o nome/código do lançamento selecionado para passar como parâmetro
        const launchInfo = launches.find(l => l.id === selectedLaunch);
        const launchName = launchInfo?.codigo || launchInfo?.nome || selectedLaunch; // Usa código, nome ou ID

        // Navega para a página de análise de criativos, filtrando por esse termo E lançamento
        // Assumindo que a página 'analise-criativos' aceita esses parâmetros na URL
        router.push(`/Dashboards/analise-criativos?termo=${encodeURIComponent(termo)}&launchId=${selectedLaunch}&launchName=${encodeURIComponent(launchName)}`);
    };

    // Lógica de KPIs
    const { generalKpis, selectionKpis } = useMemo(() => {
        const allCampaigns = Object.values(data).flat();
        const gen_total_inscricoes = allCampaigns.reduce((sum, camp) => sum + (camp?.total_inscricoes || 0), 0);
        const gen_total_checkins = allCampaigns.reduce((sum, camp) => sum + (camp?.total_checkins || 0), 0);
        
        const currentCampaigns = data[trafficType] || [];
        const sel_total_inscricoes = currentCampaigns.reduce((sum, camp) => sum + camp.total_inscricoes, 0);
        const sel_total_checkins = currentCampaigns.reduce((sum, camp) => sum + camp.total_checkins, 0);

        return {
            generalKpis: {
                total_inscricoes: gen_total_inscricoes,
                total_checkins: gen_total_checkins,
                taxa_checkin: gen_total_inscricoes > 0 ? `${((gen_total_checkins / gen_total_inscricoes) * 100).toFixed(1)}%` : '0.0%',
            },
            selectionKpis: {
                total_inscricoes: sel_total_inscricoes,
                total_checkins: sel_total_checkins,
                taxa_checkin: sel_total_inscricoes > 0 ? `${((sel_total_checkins / sel_total_inscricoes) * 100).toFixed(1)}%` : '0.0%',
            }
        };
    }, [data, trafficType]);
    
    const currentData = data[trafficType] || [];
    const trafficKeyName = trafficType === 'Pago' ? 'Campanha' : 'Origem';
    const subLevelKeyName = trafficType === 'Pago' ? 'Termo' : 'Medium';

    // Condição de loading principal
    const isPageLoading = loading || isLoadingLaunches;

    return (
        // Padding principal ajustado para responsividade
        <div className="px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
            <Toaster position="top-center" /> 
            
            {/* Blocos de KPI com padding ajustado e gap */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4 sm:mb-6">
                {/* Removido bg-gray, padding agora é p-2 sm:p-4 */}
                <div className="dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3 text-sm sm:text-base">Totais do Lançamento</h3>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4"> {/* Reduzido gap no mobile */}
                        <KpiCard title="Inscrições" value={generalKpis.total_inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Check-ins" value={generalKpis.total_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Check-in" value={generalKpis.taxa_checkin} icon={Percent} />
                    </div>
                </div>
                {/* Removido bg-gray, padding agora é p-2 sm:p-4 */}
                <div className="dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3 text-sm sm:text-base">Totais da Seleção ({trafficType})</h3>
                    <div className="grid grid-cols-3 gap-2 sm:gap-4"> {/* Reduzido gap no mobile */}
                        <KpiCard title="Inscrições" value={selectionKpis.total_inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Check-ins" value={selectionKpis.total_checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa de Check-in" value={selectionKpis.taxa_checkin} icon={Percent} />
                    </div>
                </div>
            </div>

            {/* Botões de Tráfego com ajuste de padding e texto */}
            <div className="mb-4 sm:mb-6 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-md flex items-center justify-center space-x-1 max-w-md mx-auto">
                {TRAFFIC_TYPES.map(type => (
                    <button
                        key={type}
                        onClick={() => { setTrafficType(type) }}
                        // Texto menor e padding menor no mobile
                        className={`w-full px-2 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors ${trafficType === type ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>
            
            {/* Conteúdo Principal */}
            {/* Removido padding p-0 */}
            <main className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                {isPageLoading ? (
                    <Spinner /> 
                ) : error ? (
                    <div className="text-center p-8 text-red-500 dark:text-red-400">
                        Erro ao carregar dados: {error}
                    </div>
                ) : !selectedLaunch ? (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                        Por favor, selecione um cliente e um lançamento para ver a análise.
                    </div>
                ) : currentData.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                        Nenhum dado encontrado para este tipo de tráfego.
                    </div>
                ) : (
                    <>
                        {/* --- TABELA (Desktop) --- */}
                        {/* Padding ajustado px-4 py-3 */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">{trafficKeyName}</th>
                                        <th className="px-4 py-3 text-center">Inscrições</th>
                                        <th className="px-4 py-3 text-center">Check-ins</th>
                                        <th className="px-4 py-3 text-center">Taxa de Check-in</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-800 dark:text-gray-200">
                                    {currentData.map(campaign => (
                                        <Fragment key={campaign.primary_grouping}>
                                            <tr onClick={() => toggleRow(campaign.primary_grouping)} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                                                <td className="px-4 py-3 font-semibold flex items-center">
                                                    { (campaign.details && campaign.details.length > 0) ? (
                                                        expandedRows[campaign.primary_grouping] ? <ChevronDown size={16} className="mr-2"/> : <ChevronRight size={16} className="mr-2"/>
                                                    ) : <div className="w-4 mr-2"></div>} {/* Espaçador */}
                                                    {campaign.primary_grouping}
                                                </td>
                                                <td className="px-4 py-3 text-center">{campaign.total_inscricoes}</td>
                                                <td className="px-4 py-3 text-center">{campaign.total_checkins}</td>
                                                <td className="px-4 py-3 text-center font-medium">
                                                    {generalKpis.total_checkins > 0 ? ((campaign.total_checkins / generalKpis.total_checkins) * 100).toFixed(1) + '%' : '0.0%'}
                                                </td>
                                            </tr>
                                            
                                            {expandedRows[campaign.primary_grouping] && campaign.details && campaign.details.length > 0 && (
                                                <tr className="bg-gray-50 dark:bg-gray-900/30">
                                                    <td colSpan={4} className="p-0">
                                                        <div className="p-4">
                                                            <h4 className="font-semibold mb-2 text-sm text-gray-600 dark:text-gray-400">Detalhes por {subLevelKeyName}:</h4>
                                                            <table className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-inner">
                                                                <thead className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
                                                                    <tr>
                                                                        <th className="px-3 py-2">{subLevelKeyName}</th>
                                                                        <th className="px-3 py-2 text-center">Inscrições</th>
                                                                        <th className="px-3 py-2 text-center">Check-ins</th>
                                                                        <th className="px-3 py-2 text-center">Tx. Check-in</th>
                                                                        <th className="px-3 py-2 w-[40%] md:w-[50%]">Distribuição de Score</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                                    {campaign.details.map(detail => {
                                                                        const checkinRate = generalKpis.total_checkins > 0 ? ((detail.total_checkins / generalKpis.total_checkins) * 100).toFixed(1) + '%' : '0.0%';
                                                                        return (
                                                                            <tr 
                                                                                key={detail.utm_detail}
                                                                                className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                                                                                onClick={() => handleDetailClick(detail.utm_detail)}
                                                                            >
                                                                                <td className="px-3 py-2 font-medium break-words">{detail.utm_detail || '(não definido)'}</td>
                                                                                <td className="px-3 py-2 text-center">{detail.total_inscricoes}</td>
                                                                                <td className="px-3 py-2 text-center">{detail.total_checkins}</td>
                                                                                <td className="px-3 py-2 text-center">{checkinRate}</td>
                                                                                <td className="px-3 py-2"><ScoreDistributionDisplay distribution={detail.score_distribution} /></td>
                                                                            </tr>
                                                                        );

                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* --- CARTÕES (Mobile) --- */}
                        {/* Padding p-2 */}
                        <div className="block md:hidden space-y-3 p-2">
                            {currentData.map(campaign => (
                                <MobileCampaignCard 
                                    key={campaign.primary_grouping} 
                                    campaign={campaign} 
                                    subLevelKeyName={subLevelKeyName} 
                                    generalTotalCheckins={generalKpis.total_checkins}
                                    onDetailClick={handleDetailClick}
                                />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}