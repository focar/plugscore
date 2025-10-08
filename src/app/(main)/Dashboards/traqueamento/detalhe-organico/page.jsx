// src/app/(main)/Dashboards/traqueamento/detalhe-organico/page.jsx
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, useContext } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft, FaLeaf, FaChartBar, FaBullseye, FaCalendarDay } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

function DetalheOrganicoContent() {
    const supabase = createClientComponentClient();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { userProfile, setHeaderContent } = useContext(AppContext);
    
    const launchId = searchParams.get('launchId');
    const launchName = searchParams.get('launchName');

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setHeaderContent({
            title: 'Dashboard de Traqueamento',
            controls: (
                <button onClick={() => router.back()} className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <FaChevronLeft size={14} /> Voltar
                </button>
            )
        });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, router]);

    const fetchData = useCallback(async (id) => {
        if (!userProfile) return;
        setIsLoading(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
            const { data: result, error } = await supabase.rpc('get_organic_traffic_by_medium', { 
                p_launch_id: id,
                p_client_id: clientIdToSend
            });
            if (error) throw error;
            setData(result || []);
        } catch (err) {
            toast.error("Falha ao carregar detalhes do tráfego orgânico.");
            console.error("Erro ao chamar RPC:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userProfile]);

    useEffect(() => {
        if (launchId) {
            fetchData(launchId);
        } else if (userProfile) {
            router.push('/Dashboards/traqueamento');
        }
    }, [launchId, fetchData, router, userProfile]);

    const totalOrganicLeads = useMemo(() => data.reduce((sum, item) => sum + item.total_leads, 0), [data]);
    const chartData = useMemo(() => data.map(item => ({ name: item.utm_medium, Leads: item.total_leads })), [data]);

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Toaster position="top-center" />

            {isLoading ? (
                <div className="flex justify-center items-center h-96"> <FaSpinner className="animate-spin text-blue-500 text-5xl" /> </div>
            ) : (
                <>
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center gap-4 w-full lg:w-auto">
                            <FaLeaf className="text-green-500" size={32} />
                            <div>
                                <p className="text-lg text-gray-600 dark:text-gray-300">Total de Leads Orgânicos em <span className="font-bold text-gray-800 dark:text-gray-100">{launchName}</span></p>
                                <p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{totalOrganicLeads.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>

                        <nav className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto">
                            <button onClick={() => router.push(`/Dashboards/traqueamento/detalhe-organico/score?launchId=${launchId}&launchName=${launchName}`)} className="flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <FaBullseye /> SCORE
                            </button>
                            <button onClick={() => router.push(`/Dashboards/traqueamento/detalhe-organico/mql?launchId=${launchId}&launchName=${launchName}`)} className="flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <FaChartBar /> MQL
                            </button>
                            <button onClick={() => router.push(`/Dashboards/traqueamento/detalhe-organico/mov-diario?launchId=${launchId}&launchName=${launchName}`)} className="flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <FaCalendarDay /> Mov. Diário
                            </button>
                        </nav>
                    </div>

                    <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg overflow-y-auto h-[35rem]">
                            <table className="w-full text-left text-gray-800 dark:text-gray-200">
                                <thead className="sticky top-0 bg-white dark:bg-gray-800">
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">UTM Medium</th>
                                        <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Leads</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map(item => (
                                        <tr key={item.utm_medium} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3 font-medium">{item.utm_medium || '(not set)'}</td>
                                            <td className="p-3 text-right font-bold text-green-500 dark:text-green-400">{item.total_leads.toLocaleString('pt-BR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-[35rem]">
                           <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis type="number" stroke="rgb(107 114 128 / 1)" />
                                    <YAxis type="category" dataKey="name" width={150} stroke="rgb(107 114 128 / 1)" tick={{ fontSize: 12 }} />
                                    <Tooltip cursor={{fill: 'rgba(243, 244, 246, 0.5)'}} contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb' }} />
                                    <Bar dataKey="Leads" fill="#22c55e" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </main>
                </>
            )}
        </div>
    );
}

export default function DetalheOrganicoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
            <DetalheOrganicoContent />
        </Suspense>
    );
}