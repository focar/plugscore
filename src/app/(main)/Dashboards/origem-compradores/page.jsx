//src/app/(main)/Dashboards/origem-compradores/page.jsx
'use client';

import React, { useState, useEffect, useContext, useMemo, Fragment } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { Loader2 } from 'lucide-react'; // Usar Loader2
import { FaUsers, FaUserCheck, FaShoppingCart, FaPercentage, FaChevronDown, FaChevronRight } from "react-icons/fa"; // Adicionado FaChevronRight
import { Toaster, toast } from 'react-hot-toast';

// --- Componentes ---
const Spinner = () => ( <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-blue-500" size={32} /></div> ); // Usando Loader2

// KpiCard com ajustes responsivos
const KpiCard = ({ title, value, icon: Icon, colorClass = 'text-blue-500 dark:text-blue-400' }) => (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm flex items-center space-x-3 sm:space-x-4">
        <div className={`p-2 sm:p-3 rounded-full bg-slate-100 dark:bg-gray-700 ${colorClass}`}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" /> {/* Tamanho responsivo */}
        </div>
        <div>
            <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-100">{value}</p>
            <h3 className="text-xs sm:text-sm font-medium text-slate-500 dark:text-gray-400">{title}</h3>
        </div>
    </div>
);

// PieChart (Gráfico de Pizza Simplificado)
const PieChart = ({ data }) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.total, 0), [data]);
    const colors = {
        'Não Traqueado': 'bg-gray-400 dark:bg-gray-500', // Cor ajustada para dark mode
        'Tráfego Pago': 'bg-sky-500',
        'Orgânico/Outros': 'bg-emerald-500',
    };

    if (!data || data.length === 0 || total === 0) {
        return (
            <div className="flex items-center justify-center h-full min-h-[150px]"> {/* Altura mínima */}
                <p className="text-slate-500 dark:text-gray-400 text-sm">Nenhum comprador encontrado</p>
            </div>
        );
    }

    return (
        // Padding ajustado
        <div className="flex flex-col justify-center h-full p-2 sm:p-0">
            {/* Barra de progresso */}
            <div className="w-full h-6 sm:h-8 flex rounded-full overflow-hidden mb-3 sm:mb-4">
                {data.map(item => (
                    <div
                        key={item.origem}
                        className={colors[item.origem] || 'bg-gray-300 dark:bg-gray-600'}
                        style={{ width: `${(item.total / total) * 100}%` }}
                        title={`${item.origem}: ${item.total} (${((item.total / total) * 100).toFixed(1)}%)`} // Tooltip na barra
                    />
                ))}
            </div>
            {/* Legenda */}
            <ul className="space-y-1 sm:space-y-2">
                {data.map(item => (
                    <li key={item.origem} className="flex justify-between items-center text-xs sm:text-sm">
                        <div className="flex items-center">
                            <span className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full mr-2 ${colors[item.origem] || 'bg-gray-300 dark:bg-gray-600'}`}></span>
                            <span className="text-slate-600 dark:text-gray-300">{item.origem}</span>
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-gray-200">{item.total.toLocaleString('pt-BR')} <span className="text-slate-500 dark:text-gray-400">({((item.total / total) * 100).toFixed(1)}%)</span></span>
                    </li>
                ))}
            </ul>
        </div>
    );
};


export default function OrigemCompradoresPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);

    const [dashboardData, setDashboardData] = useState(null);
    const [isLoadingData, setIsLoadingData] = useState(false); // Inicia false

    const [expandedRows, setExpandedRows] = useState(new Set());
    const toggleRow = (key) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) newSet.delete(key); else newSet.add(key);
            return newSet;
        });
    };

    // --- CORREÇÃO: Efeito para buscar lançamentos (com trava) ---
    useEffect(() => {
        if (!userProfile) return;

        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

        // Se "Todos os Clientes", limpa tudo e para
        if (isAllClients) {
            setLaunches([]); setSelectedLaunch(''); setIsLoadingLaunches(false);
            setDashboardData(null); setIsLoadingData(false);
            return;
        }

        // Busca lançamentos para cliente específico
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true); setDashboardData(null); setIsLoadingData(true);
            try {
                const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
                if (error) throw error;
                const sorted = [...(data || [])].filter(l => l.status !== 'Planejado').sort((a, b) => {
                    if (a.status.toLowerCase() === 'em andamento' && b.status.toLowerCase() !== 'em andamento') return -1;
                    if (b.status.toLowerCase() === 'em andamento' && a.status.toLowerCase() !== 'em andamento') return 1;
                    return (a.codigo || a.nome).localeCompare(b.codigo || b.nome);
                });
                setLaunches(sorted);
                setSelectedLaunch(''); // Não auto-seleciona
            } catch (err) {
                console.error("Erro ao buscar lançamentos:", err);
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } finally {
                setIsLoadingLaunches(false);
                setIsLoadingData(false); // Para spinner principal
            }
        };
        fetchLaunches();
    }, [userProfile, selectedClientId, supabase]);

    // --- CORREÇÃO: Efeito para configurar o Header (com trava) ---
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
                {launches.map(l => <option key={l.id} value={l.id}>{l.codigo || l.nome} ({l.status})</option>)}
            </select>
        );
        setHeaderContent({ title: 'Origem e Desempenho dos Compradores', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches, userProfile, selectedClientId]);

    // --- CORREÇÃO: Efeito para buscar os dados (com trava) ---
    useEffect(() => {
        // Só busca se um lançamento for selecionado
        if (!selectedLaunch || !userProfile) {
            setDashboardData(null); // Limpa dados
            setIsLoadingData(false); // Garante que spinner pare
            return;
        }

        const fetchData = async () => {
            setIsLoadingData(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

            try {
                const { data, error } = await supabase.rpc('get_compradores_origem_dashboard', {
                    p_launch_id: selectedLaunch,
                    p_client_id: clientIdToSend
                });

                if (error) throw error;
                setDashboardData(data);
            } catch (err) {
                 console.error("Erro ao carregar dados:", err);
                 toast.error(`Erro ao carregar dados: ${err.message}`);
                 setDashboardData(null);
            } finally {
                setIsLoadingData(false);
            }
        };

        fetchData();
    }, [selectedLaunch, userProfile, selectedClientId, supabase]); // Depende apenas do lançamento

    // Memoização dos dados
    const { kpis, tabelaCanais, graficoOrigem } = useMemo(() => {
        const data = dashboardData || {};
        return {
            kpis: data.kpis || { total_inscricoes: 0, total_checkins: 0, total_compradores: 0 },
            tabelaCanais: data.tabela_canais || [],
            graficoOrigem: data.grafico_origem || [],
        };
    }, [dashboardData]);

    const conversaoFinal = kpis.total_checkins > 0 ? ((kpis.total_compradores / kpis.total_checkins) * 100).toFixed(2) + '%' : '0.00%';

    // Condição de loading principal
    const isPageLoading = isLoadingData || isLoadingLaunches;

    return (
        // Padding responsivo
        <div className="p-2 sm:p-4 lg:p-6 bg-slate-50 dark:bg-gray-900 min-h-screen space-y-4 sm:space-y-6">
            <Toaster position="top-center" />

            {/* Gerenciamento de estado de exibição */}
            {isPageLoading && selectedLaunch ? ( // Spinner só se estiver carregando E um lançamento estiver selecionado
                <Spinner />
            ) : !selectedLaunch && !(userProfile?.role === 'admin' && selectedClientId === 'all') ? (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                    Selecione um lançamento para ver os dados.
                </div>
            ) : !dashboardData && selectedLaunch && !isLoadingData? ( // Se terminou de carregar mas não veio nada
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                     Nenhum dado encontrado para este lançamento.
                 </div>
            ) : !selectedLaunch && (userProfile?.role === 'admin' && selectedClientId === 'all') ? (
                 <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                    Selecione um cliente específico para ver a origem dos compradores.
                </div>
            ) : dashboardData && ( // Só renderiza se tiver dados
                <>
                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <KpiCard title="Inscrições" value={kpis.total_inscricoes.toLocaleString('pt-BR')} icon={FaUsers} />
                        <KpiCard title="Check-ins" value={kpis.total_checkins.toLocaleString('pt-BR')} icon={FaUserCheck} />
                        <KpiCard title="Compradores" value={kpis.total_compradores.toLocaleString('pt-BR')} icon={FaShoppingCart} colorClass="text-emerald-500 dark:text-emerald-400" />
                        <KpiCard title="Conversão Final" value={conversaoFinal} icon={FaPercentage} colorClass="text-emerald-500 dark:text-emerald-400" />
                    </div>

                     {/* Tabela e Gráfico */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

                        {/* Tabela de Canais (Ocupa 2 colunas no desktop) */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-3 sm:p-4 md:p-6 rounded-lg shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-gray-100 mb-4 text-base sm:text-lg">Performance por Canal</h3>

                            {/* Cabeçalho Desktop */}
                            <div className="hidden lg:grid grid-cols-5 gap-4 px-4 py-2 mt-4 text-xs font-medium text-slate-500 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">
                                <span>Canal</span>
                                <span className="text-right">Inscrições</span>
                                <span className="text-right">Check-ins</span>
                                <span className="text-right">Compradores</span>
                                <span className="text-right">Conv. Final (%)</span>
                            </div>

                            {/* Corpo da Tabela/Cards */}
                            <div className="space-y-1 md:mt-2">
                                {tabelaCanais.length > 0 ? tabelaCanais.map((canal, index) => {
                                    const key = canal.canal + index;
                                    const isExpanded = expandedRows.has(key);
                                    return (
                                        <div key={key} className="bg-slate-50 dark:bg-gray-700/50 rounded-lg shadow-sm lg:bg-transparent lg:dark:bg-transparent lg:shadow-none lg:rounded-none">
                                            {/* Linha Principal (Clicável no Mobile) */}
                                            <div onClick={() => toggleRow(key)} className={`p-3 lg:p-4 grid grid-cols-2 lg:grid-cols-5 lg:gap-x-4 items-center ${canal.details && canal.details.length > 0 ? 'cursor-pointer' : ''} lg:border-b lg:border-gray-200 lg:dark:border-gray-700 lg:hover:bg-gray-50 lg:dark:hover:bg-gray-700/50`}>
                                                {/* Mobile: Nome em cima, métricas embaixo */}
                                                <div className="lg:hidden col-span-2 mb-2">
                                                     <span className="font-medium text-gray-900 dark:text-white text-sm truncate block" title={canal.canal}>{canal.canal}</span>
                                                </div>
                                                <div className="lg:hidden grid grid-cols-3 gap-2 col-span-2">
                                                     <div className="text-center"><p className="text-xs text-slate-500 dark:text-gray-400">Inscrições</p><p className="font-semibold text-slate-800 dark:text-gray-100 text-sm">{canal.inscricoes.toLocaleString('pt-BR')}</p></div>
                                                     <div className="text-center"><p className="text-xs text-slate-500 dark:text-gray-400">Check-ins</p><p className="font-semibold text-slate-800 dark:text-gray-100 text-sm">{canal.checkins.toLocaleString('pt-BR')}</p></div>
                                                     <div className="text-center"><p className="text-xs text-emerald-500">Compradores</p><p className="font-semibold text-emerald-500 text-sm">{canal.compradores.toLocaleString('pt-BR')}</p></div>
                                                </div>
                                                {/* Botão de expandir (só mobile) */}
                                                {canal.details && canal.details.length > 0 && (
                                                     <div className="lg:hidden col-span-2 text-center mt-2 pt-2 border-t border-slate-200 dark:border-gray-600">
                                                        <button className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center justify-center w-full">
                                                            Ver Detalhes {isExpanded ? <FaChevronDown className="ml-1" size={10}/> : <FaChevronRight className="ml-1" size={10}/>}
                                                         </button>
                                                    </div>
                                                )}

                                                {/* Desktop: Grid */}
                                                <div className="hidden lg:block lg:col-span-1 font-medium text-gray-900 dark:text-white whitespace-nowrap truncate text-sm" title={canal.canal}>{canal.canal}</div>
                                                <div className="hidden lg:block text-right text-sm text-slate-600 dark:text-gray-300">{canal.inscricoes.toLocaleString('pt-BR')}</div>
                                                <div className="hidden lg:block text-right text-sm text-slate-600 dark:text-gray-300">{canal.checkins.toLocaleString('pt-BR')}</div>
                                                <div className="hidden lg:block text-right text-sm font-bold text-emerald-500">{canal.compradores.toLocaleString('pt-BR')}</div>
                                                <div className="hidden lg:block text-right text-sm font-bold text-emerald-500">{canal.taxa_conversao_checkin.toFixed(2)}%</div>
                                            </div>

                                            {/* Detalhes expandidos (Mobile) */}
                                            {isExpanded && canal.details && canal.details.length > 0 && (
                                                <div className="p-3 bg-slate-100 dark:bg-gray-700/20 border-t border-slate-200 dark:border-gray-600 lg:hidden">
                                                    <h4 className="text-xs font-semibold text-slate-700 dark:text-gray-200 mb-2">Detalhes:</h4>
                                                    <ul className="space-y-1">
                                                        {canal.details.map((detail, dIndex) => (
                                                            <li key={dIndex} className="text-xs text-slate-600 dark:text-gray-300 flex justify-between">
                                                                <span className="truncate pr-2" title={detail.utm_value}>{detail.utm_value || '(não definido)'}</span>
                                                                <span className="font-medium flex-shrink-0">{detail.compradores} comp. ({detail.taxa_conversao_checkin.toFixed(1)}%)</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )
                                }) : (
                                    <p className="text-center py-6 text-slate-500 dark:text-gray-400 text-sm">Nenhum dado de canal encontrado.</p>
                                )}
                            </div>
                        </div>

                        {/* Gráfico de Origem */}
                        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-gray-100 mb-4 text-base sm:text-lg">Origem dos Compradores</h3>
                            <PieChart data={graficoOrigem} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
