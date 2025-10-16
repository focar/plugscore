'use client';

import React, { useState, useEffect, useCallback, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import { ChevronsUp, AlertTriangle, ChevronsDown, HelpCircle, X } from 'lucide-react';

// --- Componentes ---
function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl m-4" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center border-b p-4 dark:border-gray-600">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto text-gray-700 dark:text-gray-300 space-y-4">
                    {children}
                </div>
            </div>
        </div>
    );
}

const Spinner = () => <div className="flex justify-center items-center h-40"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>;
const profileOrder = ['Quente', 'Quente-Morno', 'Morno', 'Morno-Frio', 'Frio'];
const ScoreDistributionBar = ({ distribution }) => {
    if (!distribution) return <div className="text-xs text-gray-400 italic">Sem dados de score</div>;
    const total = profileOrder.reduce((sum, key) => sum + (distribution[key] || 0), 0);
    if (total === 0) return <div className="text-xs text-gray-400 italic">Sem dados de score</div>;

    const title = profileOrder.map(key => `${key}: ${distribution[key] || 0}`).join(', ');

    return (
        <div className="w-full flex rounded-full h-3 bg-gray-200 dark:bg-gray-600 overflow-hidden" title={title}>
            <div className="h-full bg-red-500" style={{ width: `${(distribution['Quente'] || 0) / total * 100}%` }}></div>
            <div className="h-full bg-orange-500" style={{ width: `${(distribution['Quente-Morno'] || 0) / total * 100}%` }}></div>
            <div className="h-full bg-yellow-500" style={{ width: `${(distribution['Morno'] || 0) / total * 100}%` }}></div>
            <div className="h-full bg-sky-500" style={{ width: `${(distribution['Morno-Frio'] || 0) / total * 100}%` }}></div>
            <div className="h-full bg-blue-500" style={{ width: `${(distribution['Frio'] || 0) / total * 100}%` }}></div>
        </div>
    );
};
const CampaignCard = ({ campaign }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-3">
            <h4 className="font-bold text-gray-800 dark:text-gray-100 truncate">{campaign.campaign_name}</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Inscrições</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-200">{campaign.total_inscricoes.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Check-ins</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-200">{campaign.total_checkins.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tx. Check-in</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-200">{parseFloat(campaign.taxa_checkin).toFixed(1)}%</p>
                </div>
            </div>
            <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Distribuição de Score (dos Check-ins)</p>
                <ScoreDistributionBar distribution={campaign.score_distribution} />
            </div>
        </div>
    );
};


export default function OtimizadorCampanhasPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [campaigns, setCampaigns] = useState([]);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

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
                  // --- ALTERAÇÃO AQUI: Trocado 'l.nome' por 'l.codigo' ---
                  launches.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>) :
                  <option>Nenhum lançamento</option>}
            </select>
        );
        setHeaderContent({ title: 'Otimizador de Campanhas', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    const fetchData = useCallback(async () => {
        if (!selectedLaunch || !userProfile) return;
        setIsLoadingData(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_automated_campaign_analysis', {
                p_launch_id: selectedLaunch,
                p_client_id: clientIdToSend,
            });
            if (error) throw error;
            setCampaigns(data || []);
        } catch (err) { toast.error(`Erro ao carregar dados: ${err.message}`); } 
        finally { setIsLoadingData(false); }
    }, [selectedLaunch, supabase, userProfile, selectedClientId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const campaignsContinuar = campaigns.filter(c => c.status === 'Continuar');
    const campaignsAtencao = campaigns.filter(c => c.status === 'Atenção');
    const campaignsSuspender = campaigns.filter(c => c.status === 'Suspender');

    return (
        <div className="p-4 md:p-6">
            <Toaster />
            
            <div className="flex justify-end mb-4">
                <button 
                    onClick={() => setIsHelpModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <HelpCircle size={18} /> Como funciona?
                </button>
            </div>

            {isLoadingData || isLoadingLaunches ? <Spinner /> : (
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-green-600 dark:text-green-400 border-b-2 border-green-500 pb-2">
                            <ChevronsUp size={20} /> CONTINUAR / ESCALAR ({campaignsContinuar.length})
                        </h3>
                        {campaignsContinuar.length > 0 ? 
                            campaignsContinuar.map(campaign => <CampaignCard key={campaign.campaign_name} campaign={campaign} />) :
                            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma campanha nesta categoria.</p>
                        }
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-yellow-600 dark:text-yellow-400 border-b-2 border-yellow-500 pb-2">
                           <AlertTriangle size={20} /> ATENÇÃO / OTIMIZAR ({campaignsAtencao.length})
                        </h3>
                        {campaignsAtencao.length > 0 ?
                            campaignsAtencao.map(campaign => <CampaignCard key={campaign.campaign_name} campaign={campaign} />) :
                            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma campanha nesta categoria.</p>
                        }
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-800/50 rounded-lg p-4 space-y-4">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-red-600 dark:text-red-400 border-b-2 border-red-500 pb-2">
                            <ChevronsDown size={20} /> SUSPENDER / PAUSAR ({campaignsSuspender.length})
                        </h3>
                        {campaignsSuspender.length > 0 ?
                            campaignsSuspender.map(campaign => <CampaignCard key={campaign.campaign_name} campaign={campaign} />) :
                            <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-8">Nenhuma campanha nesta categoria.</p>
                        }
                    </div>
                </div>
            )}

            <Modal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} title="Entendendo o Otimizador de Campanhas">
                <p className="text-sm">Este painel classifica automaticamente suas campanhas de tráfego pago em três categorias para te ajudar a tomar decisões rápidas. A análise é baseada na **Taxa de Check-in** e na **Qualidade dos Leads** (distribuição de score).</p>
                <div>
                    <h4 className="font-bold text-lg text-green-600 dark:text-green-400">🟢 Continuar / Escalar</h4>
                    <p className="text-sm pl-2 border-l-4 border-green-500 ml-2">Campanhas com ótima performance. Possuem **alta Taxa de Check-in** e geram leads de **alta qualidade** (maioria 'Quente' e 'Morno'). A recomendação é manter ou aumentar o investimento.</p>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-yellow-600 dark:text-yellow-400">🟡 Atenção / Otimizar</h4>
                    <p className="text-sm pl-2 border-l-4 border-yellow-500 ml-2">Campanhas com performance mista. Podem ter uma boa Taxa de Check-in mas com leads de baixa qualidade (muitos 'Frios'), ou vice-versa. Elas precisam de investigação para otimizar criativos, público ou a página de destino.</p>
                </div>
                <div>
                    <h4 className="font-bold text-lg text-red-600 dark:text-red-400">🔴 Suspender / Pausar</h4>
                    <p className="text-sm pl-2 border-l-4 border-red-500 ml-2">Campanhas com baixa performance. Possuem **baixa Taxa de Check-in** e leads de **qualidade muito baixa**. A recomendação é pausar imediatamente para não desperdiçar o orçamento.</p>
                </div>
                 <p className="text-xs italic text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-600">Nota: As metas exatas (ex: "Taxa de Check-in acima de 25%") estão atualmente fixas no código da função SQL e poderão ser configuráveis no futuro.</p>
            </Modal>
        </div>
    );
}