//src/app/(main)/Dashboards/origem-compradores/page.jsx
'use client';

import { useState, useEffect, useContext, useMemo, Fragment } from "react";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaUsers, FaUserCheck, FaShoppingCart, FaPercentage, FaChevronDown } from "react-icons/fa";
import { Toaster, toast } from 'react-hot-toast';

// --- Componentes ---
const Spinner = () => ( <div className="flex justify-center items-center h-40"><FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /></div> );

const KpiCard = ({ title, value, icon: Icon, colorClass = 'text-blue-500' }) => (
    <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-sm flex items-center space-x-3 sm:space-x-4">
        <div className={`p-3 rounded-full bg-slate-100 dark:bg-gray-700 ${colorClass}`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-100">{value}</p>
            <h3 className="text-sm font-medium text-slate-500 dark:text-gray-400">{title}</h3>
        </div>
    </div>
);

const PieChart = ({ data }) => {
    // ... (Componente PieChart sem alterações)
    const total = data.reduce((sum, item) => sum + item.total, 0);
    const colors = {
        'Não Traqueado': 'bg-gray-400',
        'Tráfego Pago': 'bg-sky-500',
        'Orgânico/Outros': 'bg-emerald-500',
    };

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-500 dark:text-gray-400">Nenhum comprador encontrado</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col justify-center h-full">
            <div className="w-full h-8 flex rounded-full overflow-hidden mb-4">
                {data.map(item => (
                    <div key={item.origem} className={colors[item.origem] || 'bg-gray-300'} style={{ width: `${(item.total / total) * 100}%` }} />
                ))}
            </div>
            <ul className="space-y-2">
                {data.map(item => (
                    <li key={item.origem} className="flex justify-between items-center text-sm">
                        <div className="flex items-center">
                            <span className={`w-3 h-3 rounded-full mr-2 ${colors[item.origem] || 'bg-gray-300'}`}></span>
                            <span className="text-slate-600 dark:text-gray-300">{item.origem}</span>
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-gray-200">{item.total} ({((item.total / total) * 100).toFixed(1)}%)</span>
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
    const [isLoadingData, setIsLoadingData] = useState(true);

    const [expandedRows, setExpandedRows] = useState(new Set());
    const toggleRow = (key) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(key)) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });
    };

    // Efeitos de busca de dados (sem alteração)
    useEffect(() => {
        if (!userProfile) return;
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });

            if (error) {
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } else {
                const sorted = [...(data || [])].sort((a, b) => {
                    if (a.status.toLowerCase() === 'em andamento' && b.status.toLowerCase() !== 'em andamento') return -1;
                    if (b.status.toLowerCase() === 'em andamento' && a.status.toLowerCase() !== 'em andamento') return 1;
                    return (a.codigo || a.nome).localeCompare(b.codigo || b.nome);
                });
                setLaunches(sorted);
                if (sorted.length > 0) {
                    const inProgress = sorted.find(l => l.status.toLowerCase() === 'em andamento');
                    setSelectedLaunch(inProgress ? inProgress.id : sorted[0].id);
                }
            }
            setIsLoadingLaunches(false);
        };
        fetchLaunches();
    }, [userProfile, selectedClientId, supabase]);

    useEffect(() => {
        const launchSelector = (
            <select
                value={selectedLaunch}
                onChange={e => setSelectedLaunch(e.target.value)}
                disabled={isLoadingLaunches || launches.length === 0}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2"
            >
                {isLoadingLaunches ? <option>Carregando...</option> :
                   launches.length > 0 ?
                   launches.map(l => <option key={l.id} value={l.id}>{(l.codigo || l.nome)} ({l.status})</option>) :
                   <option>Nenhum lançamento</option>}
            </select>
        );

        setHeaderContent({ title: 'Origem e Desempenho dos Compradores', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    useEffect(() => {
        if (!selectedLaunch || !userProfile) {
             if (!isLoadingLaunches) setIsLoadingData(false);
            return;
        }

        const fetchData = async () => {
            setIsLoadingData(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            
            const { data, error } = await supabase.rpc('get_compradores_origem_dashboard', {
                p_launch_id: selectedLaunch,
                p_client_id: clientIdToSend
            });

            if (error) {
                toast.error(`Erro ao carregar dados: ${error.message}`);
                setDashboardData(null);
            } else {
                setDashboardData(data);
            }
            setIsLoadingData(false);
        };

        fetchData();
    }, [selectedLaunch, userProfile, selectedClientId, supabase, isLoadingLaunches]);

    const { kpis, tabelaCanais, graficoOrigem } = useMemo(() => {
        const data = dashboardData || {};
        return {
            kpis: data.kpis || { total_inscricoes: 0, total_checkins: 0, total_compradores: 0 },
            tabelaCanais: data.tabela_canais || [],
            graficoOrigem: data.grafico_origem || [],
        };
    }, [dashboardData]);

    const conversaoFinal = kpis.total_checkins > 0 ? ((kpis.total_compradores / kpis.total_checkins) * 100).toFixed(2) + '%' : '0.00%';

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-gray-900 min-h-screen space-y-6">
            <Toaster position="top-center" />

            {isLoadingData ? <Spinner /> : dashboardData ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KpiCard title="Total de Inscrições" value={kpis.total_inscricoes.toLocaleString('pt-BR')} icon={FaUsers} />
                        <KpiCard title="Total de Check-ins" value={kpis.total_checkins.toLocaleString('pt-BR')} icon={FaUserCheck} />
                        <KpiCard title="Total de Compradores" value={kpis.total_compradores.toLocaleString('pt-BR')} icon={FaShoppingCart} colorClass="text-emerald-500" />
                        <KpiCard title="Conversão (Check-in > Compra)" value={conversaoFinal} icon={FaPercentage} colorClass="text-emerald-500" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-gray-100 mb-4">Performance por Canal</h3>
                            
                            {/* Cabeçalho Desktop */}
                            <div className="hidden lg:grid grid-cols-5 gap-4 px-4 py-2 mt-4 text-xs font-medium text-slate-500 dark:text-gray-300 uppercase border-b border-gray-200 dark:border-gray-700">
                                <span>Canal</span>
                                <span className="text-right">Inscrições</span>
                                <span className="text-right">Check-ins</span>
                                <span className="text-right">Compradores</span>
                                <span className="text-right">Conv. Final (%)</span>
                            </div>

                            <div className="space-y-2 md:mt-2">
                                {tabelaCanais.map((canal, index) => {
                                    const key = canal.canal + index;
                                    const isExpanded = expandedRows.has(key);
                                    return (
                                    <div key={key} className="bg-slate-50 dark:bg-gray-700/50 rounded-lg shadow-sm">
                                        
                                        <div onClick={() => toggleRow(key)} className="cursor-pointer p-4 lg:grid lg:grid-cols-5 lg:gap-x-4 lg:items-center">
                                            
                                            {/* Layout Mobile (Flex column) */}
                                            <div className="lg:hidden flex flex-col">
                                                {/* Linha 1: Nome do Canal */}
                                                <div className="font-medium text-gray-900 dark:text-white whitespace-nowrap truncate" title={canal.canal}>{canal.canal}</div>
                                                
                                                <div className="grid grid-cols-2 mt-2">
                                                    {/* Bloco Inscrições (Esquerda) */}
                                                    <div className="text-left">
                                                        <p className="text-xs text-slate-500 dark:text-gray-400">Inscrições</p>
                                                        <p className="font-semibold text-slate-800 dark:text-gray-100">{canal.inscricoes.toLocaleString('pt-BR')}</p>
                                                    </div>
                                                    {/* *** CORREÇÃO: Removido 'text-right' *** */}
                                                    <div className="text-left">
                                                        <p className="text-xs text-emerald-500">Compradores</p>
                                                        <div>
                                                            <p className="font-semibold text-emerald-500 inline-block">{canal.compradores.toLocaleString('pt-BR')}</p>
                                                            <FaChevronDown className={`ml-2 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'} inline-block align-middle`} size={12} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {/* *** FIM DA CORREÇÃO *** */}

                                            {/* Layout Desktop (Grid items) */}
                                            <div className="hidden lg:block lg:col-span-1 font-medium text-gray-900 dark:text-white whitespace-nowrap truncate" title={canal.canal}>{canal.canal}</div>
                                            <div className="hidden lg:block text-right text-sm text-slate-600 dark:text-gray-300">{canal.inscricoes.toLocaleString('pt-BR')}</div>
                                            <div className="hidden lg:block text-right text-sm text-slate-600 dark:text-gray-300">{canal.checkins.toLocaleString('pt-BR')}</div>
                                            <div className="hidden lg:block text-right text-sm font-bold text-emerald-500">{canal.compradores.toLocaleString('pt-BR')}</div>
                                            <div className="hidden lg:block text-right text-sm font-bold text-emerald-500">{canal.taxa_conversao_checkin.toFixed(2)}%</div>
                                        </div>
                                        
                                        {isExpanded && (
                                            <div className="p-4 bg-slate-100 dark:bg-gray-700/20 border-t border-slate-200 dark:border-gray-600 lg:hidden">
                                                <div className="grid grid-cols-2 gap-3 text-center">
                                                    <div className="bg-white dark:bg-gray-700 p-2 rounded">
                                                        <p className="text-sm text-slate-500 dark:text-gray-400">Check-ins</p>
                                                        <p className="text-lg font-semibold text-slate-800 dark:text-gray-100">{canal.checkins.toLocaleString('pt-BR')}</p>
                                                    </div>
                                                    <div className="bg-white dark:bg-gray-700 p-2 rounded">
                                                        <p className="text-sm text-emerald-500">Conv. Final</p>
                                                        <p className="text-lg font-semibold text-emerald-500">{canal.taxa_conversao_checkin.toFixed(2)}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    )
                                })}
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
                            <h3 className="font-bold text-slate-800 dark:text-gray-100 mb-4">Origem dos Compradores</h3>
                            <PieChart data={graficoOrigem} />
                        </div>
                    </div>
                </>
            ) : (
                 <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                    <p className="text-slate-500 dark:text-gray-400">Selecione um lançamento para ver os dados.</p>
                </div>
            )}
        </div>
    );
}