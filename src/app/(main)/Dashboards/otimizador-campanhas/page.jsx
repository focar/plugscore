// Arquivo: /app/(main)/dashboard/otimizador-campanhas/page.jsx

'use client';

import React, { useState, useEffect, useCallback, useContext, Fragment } from 'react'; 
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { Loader2 } from 'lucide-react'; 
import { ChevronsUp, AlertTriangle, ChevronsDown, HelpCircle, X, ChevronDown, ChevronRight } from 'lucide-react';

// --- Componentes Compartilhados ---
function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b p-4 dark:border-gray-600">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X className="h-4 w-4 sm:h-5 sm:w-5" />
                    </button>
                </div>
                <div className="p-4 sm:p-6 max-h-[70vh] sm:max-h-[80vh] overflow-y-auto text-gray-700 dark:text-gray-300 space-y-3 sm:space-y-4 text-sm sm:text-base">
                    {children}
                </div>
            </div>
        </div>
    );
}

const Spinner = () => <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;
const profileOrder = ['Quente', 'Quente-Morno', 'Morno', 'Morno-Frio', 'Frio'];

const ScoreDistributionBar = ({ distribution }) => {
    if (!distribution) return <div className="text-xs text-gray-400 italic">Sem dados</div>;
    const total = profileOrder.reduce((sum, key) => sum + (distribution[key] || 0), 0);
    if (total === 0) return <div className="text-xs text-gray-400 italic">Sem dados</div>;
    const title = profileOrder.map(key => `${key}: ${distribution[key] || 0}`).join(', ');
    return (
        <div className="w-full flex rounded-full h-2 sm:h-3 bg-gray-200 dark:bg-gray-600 overflow-hidden" title={title}>
            <div className="h-full bg-red-500" style={{ width: `${(distribution['Quente'] || 0) / total * 100}%` }}></div>
            <div className="h-full bg-orange-500" style={{ width: `${(distribution['Quente-Morno'] || 0) / total * 100}%` }}></div>
            <div className="h-full bg-yellow-500" style={{ width: `${(distribution['Morno'] || 0) / total * 100}%` }}></div>
            <div className="h-full bg-sky-500" style={{ width: `${(distribution['Morno-Frio'] || 0) / total * 100}%` }}></div>
            <div className="h-full bg-blue-500" style={{ width: `${(distribution['Frio'] || 0) / total * 100}%` }}></div>
        </div>
    );
};

// --- Componente da Tabela de Detalhes (Nova) ---
const CampaignDetailsTable = ({ data, campaignName }) => {
    const [expandedSources, setExpandedSources] = useState(new Set());
    const toggleSource = (source) => {
        setExpandedSources(prev => {
            const newSet = new Set(prev);
            if (newSet.has(source)) {
                newSet.delete(source);
            } else {
                newSet.add(source);
            }
            return newSet;
        });
    };

    if (!data || data.length === 0) {
        return <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhum detalhe de origem/criativo encontrado para esta campanha.</p>;
    }

    return (
        <div className="space-y-4">
            <h4 className="text-md sm:text-lg font-semibold text-slate-700 dark:text-gray-200 border-b dark:border-gray-600 pb-2">Detalhes da Campanha: <span className="text-blue-500">{campaignName}</span></h4>

            <div className="overflow-x-auto min-w-full">
                <div className="min-w-[500px]">
                    {/* Cabeçalho */}
                    <div className="grid grid-cols-5 gap-4 px-3 py-2 text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400 uppercase border-b border-gray-300 dark:border-gray-600">
                        <span className="col-span-2">Origem / Criativo</span>
                        <span className="text-right">Inscrições</span>
                        <span className="text-right">Check-ins</span>
                        <span className="text-right">% do Total</span>
                    </div>

                    {/* Linhas */}
                    {(data || []).map((sourceRow, index) => (
                        <Fragment key={sourceRow.origem}>
                            {/* Linha Principal (Origem) */}
                            <div 
                                className={`grid grid-cols-5 gap-4 px-3 py-2 text-sm sm:text-base font-semibold bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer`}
                                onClick={() => toggleSource(sourceRow.origem)}
                            >
                                <span className="col-span-2 flex items-center gap-2 text-gray-800 dark:text-gray-100">
                                    {sourceRow.criativos && sourceRow.criativos.length > 0 ? (
                                        expandedSources.has(sourceRow.origem) ? <ChevronDown className="h-4 w-4 text-blue-500" /> : <ChevronRight className="h-4 w-4 text-blue-500" />
                                    ) : (
                                        <span className="w-4 h-4 inline-block"></span> 
                                    )}
                                    {sourceRow.origem}
                                </span>
                                <span className="text-right text-gray-800 dark:text-gray-100">{sourceRow.inscricoes.toLocaleString('pt-BR')}</span>
                                <span className="text-right text-gray-800 dark:text-gray-100">{sourceRow.checkins.toLocaleString('pt-BR')}</span>
                                <span className="text-right text-blue-500 dark:text-blue-400 font-bold">{sourceRow.perc_total.toFixed(1)}%</span>
                            </div>

                            {/* Detalhes (Criativos) */}
                            {expandedSources.has(sourceRow.origem) && sourceRow.criativos && sourceRow.criativos.length > 0 && (
                                sourceRow.criativos.map((creative, cIndex) => (
                                    <div 
                                        key={creative.criativo} 
                                        className={`grid grid-cols-5 gap-4 px-3 py-1.5 text-xs sm:text-sm ${cIndex % 2 !== 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700/50'} border-l-4 border-gray-200 dark:border-gray-600`}
                                    >
                                        <span className="col-span-2 pl-6 text-gray-600 dark:text-gray-300">{creative.criativo}</span>
                                        <span className="text-right text-gray-600 dark:text-gray-300">{creative.inscricoes.toLocaleString('pt-BR')}</span>
                                        <span className="text-right text-gray-600 dark:text-gray-300">{creative.checkins.toLocaleString('pt-BR')}</span>
                                        <span className="text-right text-gray-600 dark:text-gray-300">{creative.perc_total.toFixed(1)}%</span>
                                    </div>
                                ))
                            )}
                        </Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};


// --- Componente CampaignCard (Tornado Clicável) ---
const CampaignCard = ({ campaign, onCardClick }) => {
    return (
        // O card inteiro agora é um botão clicável
        <button 
            onClick={() => onCardClick(campaign)}
            className="w-full text-left bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4 space-y-2 sm:space-y-3 transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate text-sm sm:text-base">{campaign.campaign_name}</h4>
            <div className="grid grid-cols-3 gap-1 sm:gap-2 text-center">
                {/* ... KPIs de Inscrições, Check-ins e Taxa (mantidos) ... */}
                <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Inscrições</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-200">{campaign.total_inscricoes.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Check-ins</p>
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-200">{campaign.total_checkins.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Tx. Check-in</p>
                    {/* APLICANDO A CORREÇÃO: Usando checkin_share (Share of Total Check-ins) */}
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-200">{parseFloat(campaign.checkin_share).toFixed(1)}%</p> 
                </div>
            </div>
            <div>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mb-1">Score (Check-ins)</p>
                <ScoreDistributionBar distribution={campaign.score_distribution} />
            </div>
        </button>
    );
};


// --- Componente Principal da Página (OtimizadorCampanhasPage) ---
export default function OtimizadorCampanhasPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [campaigns, setCampaigns] = useState([]);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    
    // NOVOS ESTADOS PARA O MODAL DE DETALHES
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [campaignDetails, setCampaignDetails] = useState(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);


    // Efeito para buscar lançamentos (mantido)
    useEffect(() => {
        if (!userProfile) return;

        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

        if (isAllClients) {
            setLaunches([]);
            setSelectedLaunch('');
            setIsLoadingLaunches(false);
            setCampaigns([]);
            setIsLoadingData(false);
            return;
        }

        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            setCampaigns([]); 
            setIsLoadingData(true); 
            try {
                const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
                if (error) throw error;
                const sorted = [...(data || [])].sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome));
                setLaunches(sorted);
                setSelectedLaunch(''); 
            } catch (err) {
                console.error("Erro ao buscar lançamentos:", err);
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } finally {
                setIsLoadingLaunches(false);
                setIsLoadingData(false); 
            }
        };
        fetchLaunches();
    }, [userProfile, selectedClientId, supabase]);


    // Efeito para configurar o Header (mantido)
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
        setHeaderContent({ title: 'Otimizador de Campanhas', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches, userProfile, selectedClientId]);


    // Busca principal de dados (Campanhas)
    const fetchData = useCallback(async () => {
        if (!selectedLaunch || !userProfile) {
            setCampaigns([]);
            setIsLoadingData(false); 
            return;
        }
        setIsLoadingData(true);
        setCampaigns([]);

        try {
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_automated_campaign_analysis', {
                p_launch_id: selectedLaunch,
                p_client_id: clientIdToSend,
            });
            if (error) throw error;
            
            const fetchedCampaigns = data || [];
            
            // NOVO CÁLCULO: Mudar Taxa de Check-in para % do Total de Check-ins (Share)
            const grandTotalCheckins = fetchedCampaigns.reduce((sum, c) => sum + c.total_checkins, 0);

            const campaignsWithShare = fetchedCampaigns.map(campaign => ({
                ...campaign,
                // Nova propriedade 'checkin_share': (Check-ins da campanha / Total Check-ins) * 100
                checkin_share: grandTotalCheckins > 0 ? (campaign.total_checkins / grandTotalCheckins) * 100 : 0,
            }));
            
            setCampaigns(campaignsWithShare); // Usar a nova lista
            
        } catch (err) {
            console.error("Erro ao carregar análise:", err)
            toast.error(`Erro ao carregar dados: ${err.message}`);
            setCampaigns([]); 
        }
        finally { setIsLoadingData(false); }
    }, [selectedLaunch, supabase, userProfile, selectedClientId]);

    useEffect(() => { fetchData(); }, [fetchData]);


    // --- LÓGICA: Função para buscar detalhes da campanha clicada ---
    const fetchCampaignDetails = useCallback(async (campaign) => {
        if (!selectedLaunch || !campaign.campaign_name) return;

        setSelectedCampaign(campaign);
        setIsDetailsModalOpen(true); // Abre o modal imediatamente
        setIsLoadingDetails(true);
        setCampaignDetails(null); // Limpa detalhes antigos

        try {
            const { data, error } = await supabase.rpc('get_campaign_details_by_creative', {
                p_launch_id: selectedLaunch,
                p_campaign_name: campaign.campaign_name,
            });

            if (error) throw error;
            setCampaignDetails(data || []); 
        } catch (err) {
            console.error("Erro ao carregar detalhes:", err)
            toast.error(`Erro ao carregar detalhes: ${err.message}`);
            setCampaignDetails([]);
        }
        finally { setIsLoadingDetails(false); }
    }, [selectedLaunch, supabase]);

    // Função que o CampaignCard chama ao ser clicado
    const handleCardClick = (campaign) => {
        fetchCampaignDetails(campaign);
    };

    const campaignsContinuar = campaigns.filter(c => c.status === 'Continuar');
    const campaignsAtencao = campaigns.filter(c => c.status === 'Atenção');
    const campaignsSuspender = campaigns.filter(c => c.status === 'Suspender');

    const isPageLoading = isLoadingData || isLoadingLaunches;

    return (
        <div className="p-2 sm:p-4 md:p-6">
            <Toaster />

            {/* Botão Como Funciona */}
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setIsHelpModalOpen(true)}
                    className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <HelpCircle className="h-4 w-4 sm:h-[18px] sm:w-[18px]" /> Como funciona?
                </button>
            </div>

            {/* Gerenciamento dos estados de exibição */}
            {isPageLoading ? (
                <Spinner />
            ) : !selectedLaunch && !(userProfile?.role === 'admin' && selectedClientId === 'all') ? (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Por favor, selecione um lançamento para ver a análise.
                 </div>
            ) : campaigns.length === 0 && selectedLaunch ? (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Nenhuma campanha encontrada para este lançamento.
                 </div>
            ) : !selectedLaunch && (userProfile?.role === 'admin' && selectedClientId === 'all') ? (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Selecione um cliente específico para ver o otimizador de campanhas.
                 </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    {/* Coluna Continuar */}
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                        <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-green-600 dark:text-green-400 border-b-2 border-green-500 pb-2">
                            <ChevronsUp className="h-[18px] w-[18px] sm:h-5 sm:w-5" /> CONTINUAR / ESCALAR ({campaignsContinuar.length})
                        </h3>
                        {campaignsContinuar.length > 0 ?
                            campaignsContinuar.map(campaign => <CampaignCard key={campaign.campaign_name} campaign={campaign} onCardClick={handleCardClick} />) :
                            <p className="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma campanha nesta categoria.</p>
                        }
                    </div>
                    {/* Coluna Atenção */}
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                        <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-500 pb-2">
                           <AlertTriangle className="h-[18px] w-[18px] sm:h-5 sm:w-5" /> ATENÇÃO / OTIMIZAR ({campaignsAtencao.length})
                        </h3>
                        {campaignsAtencao.length > 0 ?
                            campaignsAtencao.map(campaign => <CampaignCard key={campaign.campaign_name} campaign={campaign} onCardClick={handleCardClick} />) :
                            <p className="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma campanha nesta categoria.</p>
                        }
                    </div>
                    {/* Coluna Suspender */}
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                        <h3 className="flex items-center gap-2 text-base sm:text-lg font-bold text-red-600 dark:text-red-400 border-b-2 border-red-500 pb-2">
                            <ChevronsDown className="h-[18px] w-[18px] sm:h-5 sm:w-5" /> SUSPENDER / PAUSAR ({campaignsSuspender.length})
                        </h3>
                        {campaignsSuspender.length > 0 ?
                            campaignsSuspender.map(campaign => <CampaignCard key={campaign.campaign_name} campaign={campaign} onCardClick={handleCardClick} />) :
                            <p className="text-xs sm:text-sm text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma campanha nesta categoria.</p>
                        }
                    </div>
                </div>
            )}

            {/* Modal de Ajuda (Mantido) */}
            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} title="Entendendo o Otimizador de Campanhas">
                 <p className="text-sm">Este painel classifica automaticamente suas campanhas de tráfego pago em três categorias para te ajudar a tomar decisões rápidas. A análise é baseada na **Taxa de Check-in** e na **Qualidade dos Leads** (distribuição de score).</p>
                 <div>
                      <h4 className="font-bold text-base sm:text-lg text-green-600 dark:text-green-400">🟢 Continuar / Escalar</h4>
                      <p className="text-sm pl-2 border-l-4 border-green-500 ml-2">Campanhas com ótima performance. Possuem **alta Taxa de Check-in** e geram leads de **alta qualidade** (maioria 'Quente' e 'Morno'). A recomendação é manter ou aumentar o investimento.</p>
                 </div>
                 <div>
                      <h4 className="font-bold text-base sm:text-lg text-yellow-600 dark:text-yellow-400">🟡 Atenção / Otimizar</h4>
                      <p className="text-sm pl-2 border-l-4 border-yellow-500 ml-2">Campanhas com performance mista. Podem ter uma boa Taxa de Check-in mas com leads de baixa qualidade (muitos 'Frios'), ou vice-versa. Elas precisam de investigação para otimizar criativos, público ou a página de destino.</p>
                 </div>
                 <div>
                      <h4 className="font-bold text-base sm:text-lg text-red-600 dark:text-red-400">🔴 Suspender / Pausar</h4>
                      <p className="text-sm pl-2 border-l-4 border-red-500 ml-2">Campanhas com baixa performance. Possuem **baixa Taxa de Check-in** e leads de **qualidade muito baixa**. A recomendação é pausar imediatamente para não desperdiçar o orçamento.</p>
                 </div>
                 <p className="text-xs italic text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-600">Nota: As metas exatas (ex: "Taxa de Check-in acima de 25%") estão atualmente fixas no código da função SQL e poderão ser configuráveis no futuro.</p>
            </Modal>
            
            {/* NOVO MODAL DE DETALHES DA CAMPANHA */}
            <Modal 
                isOpen={isDetailsModalOpen} 
                onClose={() => setIsDetailsModalOpen(false)} 
                title={`Detalhes de: ${selectedCampaign?.campaign_name || ''}`}
            >
                {isLoadingDetails ? (
                    <Spinner />
                ) : campaignDetails ? (
                    <CampaignDetailsTable 
                        data={campaignDetails} 
                        campaignName={selectedCampaign?.campaign_name}
                    />
                ) : (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-4">Não foi possível carregar os detalhes.</p>
                )}
            </Modal>
        </div>
    );
}