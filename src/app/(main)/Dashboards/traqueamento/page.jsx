// src/app/(main)/Dashboards/traqueamento/page.jsx
'use client';

import { useState, useEffect, useCallback, useMemo, useContext } from "react";
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

const KpiCard = ({ title, value, percentage, icon: Icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md h-full">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{title}</p>
                <p className="text-4xl font-bold text-gray-800 dark:text-gray-100 mt-1">{value}</p>
                {percentage && <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mt-1">{percentage}</p>}
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
                <Icon className="text-blue-500 dark:text-blue-400" size={24} />
            </div>
        </div>
    </div>
);

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
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);

    useEffect(() => {
        if (!userProfile) return;
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            let clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });

            if (error) {
                toast.error("Falha ao carregar lançamentos.");
                setLaunches([]);
            } else if (data) {
                const sorted = [...data].sort((a, b) => a.nome.localeCompare(b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) {
                    const inProgress = sorted.find(l => l.status === 'Em andamento');
                    setSelectedLaunchId(inProgress ? inProgress.id : sorted[0].id);
                } else {
                    setIsLoading(false);
                }
            }
            setIsLoadingLaunches(false);
        };
        fetchLaunches();
    }, [userProfile, selectedClientId, supabase]);

    useEffect(() => {
        const fetchDataForLaunch = async () => {
            if (!selectedLaunchId || !userProfile) {
                if (!isLoadingLaunches) setIsLoading(false);
                setKpis(null);
                return;
            }

            setIsLoading(true);
            try {
                const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
                const { data, error } = await supabase.rpc('get_tracking_kpis', { 
                    p_launch_id: selectedLaunchId,
                    p_client_id: clientIdToSend
                });
                if (error) throw error;
                setKpis(data[0] || null);
            } catch (err) {
                toast.error("Falha ao carregar os dados de traqueamento.");
                setKpis(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDataForLaunch();
    }, [selectedLaunchId, userProfile, selectedClientId, supabase, isLoadingLaunches]);
    
    useEffect(() => {
        const launchSelector = (
            <select 
                value={selectedLaunchId} 
                onChange={(e) => setSelectedLaunchId(e.target.value)} 
                disabled={isLoadingLaunches || launches.length === 0}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2"
            >
                {isLoadingLaunches ? <option>Carregando...</option> : 
                 launches.length > 0 ? 
                 launches.map(l => <option key={l.id} value={l.id}>{l.nome} ({l.status})</option>) :
                 <option>Nenhum lançamento</option>}
            </select>
        );
        setHeaderContent({ title: 'Dashboard de Traqueamento', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunchId, launches, isLoadingLaunches]);


    const chartData = useMemo(() => {
        if (!kpis) return [];
        return [
            { name: 'Tráfego Pago', value: kpis.paid_leads, fill: '#3b82f6' },
            { name: 'Orgânico', value: kpis.organic_leads, fill: '#22c55e' },
            { name: 'Não Traqueado', value: kpis.untracked_leads, fill: '#a855f7' },
        ].filter(item => item.value > 0);
    }, [kpis]);

    const checkinRate = kpis && kpis.total_leads > 0 ? ((kpis.total_checkins / kpis.total_leads) * 100).toFixed(1) + '%' : '0.0%';
    const totalPercentageText = kpis ? `${(kpis.total_checkins || 0).toLocaleString('pt-BR')} de ${(kpis.total_leads || 0).toLocaleString('pt-BR')}` : '0 de 0';

    const handleNavigate = (type) => {
        if (!selectedLaunchId) { toast.error("Por favor, selecione um lançamento primeiro."); return; }
        const launchName = launches.find(l => l.id === selectedLaunchId)?.nome || '';
        const queryParams = new URLSearchParams({ launchId: selectedLaunchId, launchName }).toString();

        switch (type) {
            case 'paid':
                router.push(`/Dashboards/traqueamento/detalhe-pago?${queryParams}`);
                break;
            case 'organic':
                router.push(`/Dashboards/traqueamento/detalhe-organico?${queryParams}`);
                break;
            case 'untracked':
                // --- NAVEGAÇÃO ATIVADA ---
                router.push(`/Dashboards/traqueamento/detalhe-nao-traqueado?${queryParams}`);
                break;
        }
    };

    return (
        <div className="p-4 md:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
            <Toaster position="top-center" />

            {isLoading ? (
                <div className="flex justify-center items-center h-96"> <FaSpinner className="animate-spin text-blue-500 text-5xl" /> </div>
            ) : !kpis ? (
                 <div className="text-center py-16">
                    <p className="text-gray-500 dark:text-gray-400">Não há dados para exibir para este lançamento.</p>
                </div>
            ) : (
                <main className="space-y-8">
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <KpiCard title="TOTAL DE LEADS" value={(kpis.total_leads || 0).toLocaleString('pt-BR')} icon={FaUsers} />
                        <KpiCard title="TOTAL DE CHECK-INS" value={(kpis.total_checkins || 0).toLocaleString('pt-BR')} percentage={totalPercentageText} icon={FaUserCheck} />
                        <KpiCard title="TAXA DE CHECK-IN" value={checkinRate} icon={Percent} />
                    </section>
                    
                    <section className="space-y-6">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">Análise por Origem de Tráfego</h2>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                            <div className="space-y-4 lg:col-span-1">
                                <TrafficCard title="TRÁFEGO PAGO" leads={kpis.paid_leads || 0} checkins={kpis.paid_checkins || 0} icon={FaBullhorn} onClick={() => handleNavigate('paid')} rateColor="text-blue-500" totalLeads={kpis.total_leads || 0} />
                                <TrafficCard title="ORGÂNICO" leads={kpis.organic_leads || 0} checkins={kpis.organic_checkins || 0} icon={FaLeaf} onClick={() => handleNavigate('organic')} rateColor="text-green-500" totalLeads={kpis.total_leads || 0} />
                                <TrafficCard title="NÃO TRAQUEADO" leads={kpis.untracked_leads || 0} checkins={kpis.untracked_checkins || 0} icon={FaQuestionCircle} onClick={() => handleNavigate('untracked')} rateColor="text-purple-500" totalLeads={kpis.total_leads || 0} />
                            </div>
                            <div className="lg:col-span-2 h-80">
                               <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                                const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
                                                const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                                const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                                return (
                                                    <text x={x} y={y} fill="currentColor" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-sm font-semibold">
                                                        {`${(percent * 100).toFixed(1)}%`}
                                                    </text>
                                                );
                                            }}>
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