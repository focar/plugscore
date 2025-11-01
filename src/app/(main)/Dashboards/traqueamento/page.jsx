// /src/app/(main)/Dashboards/traqueamento/page.jsx
'use client';

import { useState, useEffect, useCallback, useMemo, useContext, Fragment } from "react";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaUsers, FaUserCheck, FaBullhorn, FaLeaf, FaQuestionCircle } from "react-icons/fa";
import { ArrowRight, Percent } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

// Componente KpiCard (Mantido)
const KpiCard = ({ title, value, percentage, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{title}</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</p>
                {percentage && <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">{percentage}</p>}
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
                <Icon className="text-blue-500 dark:text-blue-400" size={24} />
            </div>
        </div>
    </div>
);

// Componente TrafficCard (Mantido)
const TrafficCard = ({ title, leads, checkins, icon: Icon, onClick, rateColor, totalLeads }) => {
    const leadPercentage = totalLeads > 0 ? ((leads / totalLeads) * 100).toFixed(1) : '0.0';
    return (
        <button onClick={onClick} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-300 p-6 rounded-lg shadow-md text-left w-full group">
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Icon className={rateColor} size={32} />
                    <div>
                        <p className="text-xl font-bold text-gray-800 dark:text-gray-100 uppercase tracking-wider">{title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{leads.toLocaleString('pt-BR')} Leads • {checkins.toLocaleString('pt-BR')} Check-ins</p>
                    </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0">
                    <p className={`text-2xl font-bold ${rateColor}`}>{leadPercentage}%</p>
                    <p className="text-xs text-gray-400">do Total de Leads</p>
                </div>
            </div>
            <div className="flex items-center justify-end text-sm text-gray-400 mt-4 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                Ver Detalhes <ArrowRight size={16} className="ml-2" />
            </div>
        </button>
    );
};


export default function TraqueamentoPage() {
    const router = useRouter();
    const supabase = createClientComponentClient();
    const { setHeaderContent, userProfile, selectedClientId } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState('');
    const [kpis, setKpis] = useState(null);
    const [isLoading, setIsLoading] = useState(false); 
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [error, setError] = useState(null);

    const clientIdToSend = userProfile?.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile?.cliente_id;


    // --- Handler de Mudança do Dropdown de Lançamento (useCallback) ---
    const handleLaunchChange = useCallback((newLaunchId) => {
        const selected = launches.find(l => l.id === newLaunchId);
        const selectedName = selected ? selected.codigo : '';

        // 1. Atualiza o estado da página principal
        setSelectedLaunchId(newLaunchId);

        // 2. Atualiza o sessionStorage para persistência nos detalhes
        if (newLaunchId) {
            sessionStorage.setItem('currentDetailLaunchId', newLaunchId);
            sessionStorage.setItem('currentDetailLaunchName', selectedName);
        } else {
            sessionStorage.removeItem('currentDetailLaunchId');
            sessionStorage.removeItem('currentDetailLaunchName');
        }
        
        // Força o recarregamento dos KPIs se houver novo ID
        if (newLaunchId) {
            setKpis(null);
            setIsLoading(true); // Garante que o spinner rode antes do fetch
        } else {
            setKpis(null);
            setIsLoading(false); // Para o spinner se o dropdown for limpo
        }
    }, [launches]);


    // --- Efeito 1: Busca e Popula os Lançamentos (Dropdown principal) ---
    useEffect(() => {
        // CORREÇÃO CRÍTICA DO LOOP: Garante que só rode se os parâmetros base mudarem
        if (!userProfile || clientIdToSend === undefined) return;

        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        
        // Limpa SessionStorage de persistência de detalhe ao trocar de cliente/modo
        sessionStorage.removeItem('currentDetailLaunchId');
        sessionStorage.removeItem('currentDetailLaunchName');
        
        if (isAllClients) {
            setLaunches([]); setSelectedLaunchId(''); setIsLoadingLaunches(false);
            setKpis(null); setIsLoading(false); return;
        }

        const fetchLaunches = async () => {
            // 1. Tenta restaurar o ID salvo do botão Voltar ('persistLaunchId')
            // ESTA LÓGICA JÁ ESTAVA CORRETA
            const persistedLaunchId = sessionStorage.getItem('persistLaunchId');
            // Remove o item logo após a leitura para que não seja restaurado em carregamentos futuros
            if (persistedLaunchId) {
                sessionStorage.removeItem('persistLaunchId'); 
            }

            setIsLoadingLaunches(true);
            setKpis(null); 
            setIsLoading(true); 
            setError(null);
            
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });

            if (error) {
                toast.error("Falha ao carregar lançamentos. " + error.message);
                setLaunches([]);
                setError(error.message);
            } else if (data) {
                const sorted = [...data].sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome));
                setLaunches(sorted);
                
                // *** CORREÇÃO UX: Restaura a seleção se o usuário voltou da página de detalhe. ***
                // ESTA LÓGICA JÁ ESTAVA CORRETA
                let idToSelect = ''; 
                if (persistedLaunchId && sorted.some(l => l.id === persistedLaunchId)) {
                    idToSelect = persistedLaunchId;
                }
                
                // AQUI, forçamos o estado
                setSelectedLaunchId(idToSelect);

                // 2. Salva o ID e Nome no SessionStorage APENAS se houver seleção (para detalhe)
                const selectedLaunch = sorted.find(l => l.id === idToSelect);
                if (selectedLaunch) {
                        sessionStorage.setItem('currentDetailLaunchId', idToSelect);
                        sessionStorage.setItem('currentDetailLaunchName', selectedLaunch.codigo);
                }
            }

            setIsLoadingLaunches(false);
            
            // 3. Se não houver ID selecionado, paramos o spinner de KPI
            // Se houver, o Efeito 2 irá rodar e parar o spinner
            if (!selectedLaunchId && !persistedLaunchId) { // Adicionada verificação de persistedLaunchId
                setIsLoading(false); 
            }
        };
        
        fetchLaunches();
    }, [userProfile, selectedClientId, supabase, clientIdToSend]); // Depende apenas de parâmetros base


    // --- Efeito 2: Busca os KPIs quando um Lançamento é Selecionado ---
    useEffect(() => {
        // Roda APENAS quando selectedLaunchId muda (ou os params base)
        if (!selectedLaunchId || clientIdToSend === undefined || clientIdToSend === 'all') {
            setKpis(null); 
            if (isLoading) setIsLoading(false); // Garante que o spinner pare se não houver ID
            return;
        }

        const fetchKpis = async () => {
            setIsLoading(true); // O spinner já deve estar rodando, mas garantimos
            setError(null);
            
            const { data, error } = await supabase.rpc('get_tracking_kpis', { 
                p_launch_id: selectedLaunchId,
                p_client_id: clientIdToSend 
            });

            if (error) {
                toast.error("Falha ao carregar KPIs. " + error.message);
                setKpis(null);
                setError(error.message);
            } else if (data && data.length > 0) {
                setKpis(data[0]);
            } else {
                setKpis(null);
            }
            setIsLoading(false);
        };
        
        fetchKpis();
    }, [selectedLaunchId, clientIdToSend, supabase]); // Depende do ID selecionado


    // --- 💡 Lógica de Captura e Persistência de Estado (Navegação Limpa) ---
    const handleNavigate = (type) => {
        if (!selectedLaunchId) { 
            toast.error("Por favor, selecione um lançamento primeiro."); 
            return; 
        }

        let baseDetailPage = '';
        if (type === 'paid') {
            baseDetailPage = '/Dashboards/traqueamento/detalhe-pago';
        } else if (type === 'organic') {
            baseDetailPage = '/Dashboards/traqueamento/detalhe-organico';
        } else if (type === 'untracked') {
            baseDetailPage = '/Dashboards/traqueamento/detalhe-nao-traqueado';
        }

        // Os valores já estão salvos no sessionStorage via handleLaunchChange.
        // Apenas navegamos para a URL limpa.
        router.push(baseDetailPage);
    };

    // --- Efeito de Header (Dropdown) ---
    useEffect(() => {
        const isClientSelected = !(userProfile?.role === 'admin' && selectedClientId === 'all');
        const isDisabled = isLoadingLaunches || !isClientSelected;

        const launchName = launches.find(l => l.id === selectedLaunchId)?.codigo || '';

        const launchSelector = (
            <select 
                value={selectedLaunchId || ''} 
                onChange={(e) => handleLaunchChange(e.target.value)} 
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2" 
                disabled={isDisabled}
            >
                <option value="">Selecione um lançamento {launchName ? `(${launchName})` : ''}</option> 
                {launches.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>)}
            </select>
        );
        setHeaderContent({ title: 'Traqueamento de Trafego', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunchId, launches, isLoadingLaunches, userProfile, selectedClientId, handleLaunchChange]);

    // --- Renderização ---
    const totalLeads = kpis?.total_leads || 0;
    const checkinRate = totalLeads > 0 ? ((kpis.total_checkins / totalLeads) * 100).toFixed(1) + '%' : '0.0%';
    const totalCheckinsText = kpis?.total_checkins?.toLocaleString('pt-BR') || '0';
    
    const chartData = useMemo(() => {
        if (!kpis) return [];
        return [
            { name: 'Tráfego Pago', value: kpis.paid_leads, fill: '#3b82f6' },
            { name: 'Orgânico', value: kpis.organic_leads, fill: '#22c55e' },
            { name: 'Não Traqueado', value: kpis.untracked_leads, fill: '#a855f7' },
        ].filter(item => item.value > 0);
    }, [kpis]);

    return (
        <div className="p-4 md:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
            <Toaster position="top-center" />

            {/* Tratamento de Erro/Loading */}
            {(isLoadingLaunches || isLoading) ? (
                <div className="flex justify-center items-center h-96"> <FaSpinner className="animate-spin text-blue-600 text-3xl mx-auto" /> </div>
            ) : error ? (
                <div className="p-4 bg-red-100 text-red-700 border border-red-400 rounded-lg">
                    Erro ao carregar dados: {error}
                </div>
            ) : !selectedLaunchId ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                    Selecione um lançamento para visualizar o Dashboard.
                </div>
            ) : !kpis ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-10">
                    Nenhum dado de traqueamento encontrado para este lançamento.
                </div>
            ) : (
                <main className="space-y-8">
                    {/* Seção de KPIs */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KpiCard title="TOTAL DE LEADS" value={totalLeads.toLocaleString('pt-BR')} icon={FaUsers} />
                        <KpiCard title="TOTAL DE CHECK-INS" value={totalCheckinsText} percentage={`${totalCheckinsText} de ${totalLeads.toLocaleString('pt-BR')}`} icon={FaUserCheck} />
                        <KpiCard title="TAXA DE CHECK-IN" value={checkinRate} icon={Percent} />
                    </section>
                    
                    {/* Seção Principal (Cards de Tráfego + Gráfico) */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">Análise por Origem de Tráfego</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                            
                            {/* Cards de Tráfego */}
                            <div className="space-y-4 lg:col-span-1">
                                <TrafficCard 
                                    title="TRÁFEGO PAGO" 
                                    leads={kpis.paid_leads || 0} 
                                    checkins={kpis.paid_checkins || 0} 
                                    icon={FaBullhorn} 
                                    onClick={() => handleNavigate('paid')} 
                                    rateColor="text-blue-500" 
                                    totalLeads={totalLeads} 
                                />
                                <TrafficCard 
                                    title="ORGÂNICO" 
                                    leads={kpis.organic_leads || 0} 
                                    checkins={kpis.organic_checkins || 0} 
                                    icon={FaLeaf} 
                                    onClick={() => handleNavigate('organic')} 
                                    rateColor="text-green-500" 
                                    totalLeads={totalLeads} 
                                />
                                <TrafficCard 
                                    title="NÃO TRAQUEADO" 
                                    leads={kpis.untracked_leads || 0} 
                                    checkins={kpis.untracked_checkins || 0} 
                                    icon={FaQuestionCircle} 
                                    onClick={() => handleNavigate('untracked')} 
                                    rateColor="text-purple-500" 
                                    totalLeads={totalLeads} 
                                />
                            </div>
                            
                            {/* Gráfico de Pizza */}
                            {/*
                              * CORREÇÃO (ALERTA DO CONSOLE): 
                              * Adicionado "flex flex-col" ao contêiner.
                              * Isso força o 'div' a ter uma altura definida antes do gráfico tentar renderizar,
                              * resolvendo o aviso de width/height -1.
                            */}
                            <div className="lg:col-span-2 h-80 flex flex-col">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" labelLine={false} >
                                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        </Pie>
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </section>
                </main>
            )}
        </div>
    );
}

