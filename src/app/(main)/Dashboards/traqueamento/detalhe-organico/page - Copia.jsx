// /src/app/(main)/Dashboards/traqueamento/detalhe-organico/page.jsx
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, useContext } from "react";
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });

function DetalheOrganicoContent() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const { userProfile, setHeaderContent, selectedClientId } = useContext(AppContext);
    
    // --- 💡 ARQUITETURA STATE-DRIVEN: LEITURA APENAS DO SESSION STORAGE ---
    const currentLaunchId = typeof window !== 'undefined' ? sessionStorage.getItem('currentDetailLaunchId') : null;
    const currentLaunchName = typeof window !== 'undefined' ? sessionStorage.getItem('currentDetailLaunchName') : null;
    const basePath = "/Dashboards/traqueamento/detalhe-organico"; 

    const [data, setData] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const clientIdToSend = userProfile?.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile?.cliente_id;

    // --- LÓGICA DE NAVEGAÇÃO / PERSISTÊNCIA ---
    const handleVoltar = useCallback(() => {
        if (currentLaunchId) {
            sessionStorage.setItem('persistLaunchId', currentLaunchId);
        }
        router.push('/Dashboards/traqueamento');
    }, [currentLaunchId, router]);

    useEffect(() => {
        setHeaderContent({ title: 'Dashboard de Traqueamento' });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent]);
    // --- FIM DA LÓGICA DE NAVEGAÇÃO ---


    const fetchData = useCallback(async (id) => {
        if (!userProfile || !id) return;
        setIsLoadingData(true);
        try {
            const { data: result, error } = await supabase.rpc('get_organic_traffic_by_source', { 
                p_launch_id: id,
                p_client_id: clientIdToSend
            });

            if (error) throw error;
            setData(result || []);
        } catch (err) {
            toast.error("Falha ao carregar detalhes do tráfego orgânico.");
            console.error("Erro ao chamar RPC:", err.message);
        } finally {
            setIsLoadingData(false);
        }
    }, [supabase, userProfile, clientIdToSend]);

    // Dispara a busca de dados
    useEffect(() => {
        if (currentLaunchId) {
            fetchData(currentLaunchId);
        } else if (userProfile) {
            router.push('/Dashboards/traqueamento');
        }
    }, [currentLaunchId, fetchData, router, userProfile]);

    // Calcula o total de leads (Memoizado para performance)
    const totalOrganicLeads = useMemo(() => data.reduce((sum, item) => sum + item.total_leads, 0), [data]);

    // Prepara os dados para o gráfico (Memoizado para performance)
    const chartData = useMemo(() => 
        data.map(item => ({ 
            name: item.utm_source_name || '(not set)',
            Leads: item.total_leads 
        })), 
    [data]);

    return (
        // Container principal da página
        <div className="p-4 md:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
            <Toaster position="top-center" />

            {isLoadingData ? (
                <div className="flex justify-center items-center h-96">
                    <FaSpinner className="animate-spin text-blue-500 text-5xl" />
                </div>
            ) : (
                <>
                    {/* --- ESTRUTURA DO CABEÇALHO COM ABAS --- */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
                        
                        {/* ITEM 1 (ESQUERDA): Card Total Leads */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center gap-4 w-full md:w-auto flex-shrink-0">
                            <FaLeaf className="text-green-500" size={32} />
                            <div>
                                <p className="text-lg text-gray-600 dark:text-gray-300">Total de Leads Orgânicos em <span className="font-bold text-gray-800 dark:text-gray-100">{currentLaunchName}</span></p>
                                <p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{totalOrganicLeads.toLocaleString('pt-BR')}</p>
                            </div>
                        </div>

                        {/* ITEM 2 (DIREITA): Botões de Navegação (Voltar + Abas) */}
                        <nav className="flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto justify-end md:justify-end">
                            <button onClick={handleVoltar} className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                <FaChevronLeft size={14} /> Voltar
                            </button>
                            {/* Abas - A página principal de Detalhe deve levar para os subníveis */}
                            <Link href={`${basePath}/score`} passHref className={`flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                                <FaBullseye /> SCORE
                            </Link>
                            <Link href={`${basePath}/mql`} passHref className={`flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                                <FaChartBar /> MQL
                            </Link>
                            <Link href={`${basePath}/mov-diario`} passHref className={`flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                                <FaCalendarDay /> Mov. Diário
                            </Link>
                        </nav>
                    </div>
                    {/* --- FIM DO CABEÇALHO COM ABAS --- */}

                    {/* --- Seção Principal (GRID de 5 Colunas) --- */}
                    <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                        
                        {/* Coluna da Esquerda (Tabela - Ocupa 2 de 5 colunas em lg) */}
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg overflow-y-auto h-[35rem]">
                            {/* ... Tabela de dados (mantida) ... */}
                            <table className="w-full text-left text-gray-800 dark:text-gray-200">
                                <thead className="sticky top-0 bg-white dark:bg-gray-800">
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                        <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">UTM ORIGEM (SOURCE)</th>
                                        <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Leads</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map((item, index) => (
                                        <tr key={item.utm_source_name || index} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3 font-medium">{item.utm_source_name || '(not set)'}</td>
                                            <td className="p-3 text-right font-bold text-green-500 dark:text-green-400">{item.total_leads.toLocaleString('pt-BR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Coluna da Direita (Gráfico - Ocupa 3 de 5 colunas em lg) */}
                        <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-[35rem]">
                           <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(107 114 128 / 1)" />
                                    <XAxis type="number" stroke="rgb(107 114 128 / 1)" />
                                    <YAxis type="category" dataKey="name" width={150} stroke="rgb(107 114 128 / 1)" tick={{ fontSize: 12 }} />
                                    <Tooltip cursor={{fill: 'rgba(243, 244, 246, 0.5)'}} contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                                    <Bar dataKey="Leads" fill="#22c55e" radius={[0, 4, 4, 0]} />
                                </BarChart>
                           </ResponsiveContainer>
                        </div>
                    </main>
                </>
            )}
        </div>
    );
}

// Componente wrapper para usar o Suspense do Next.js
export default function DetalheOrganicoPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen w-full flex justify-center items-center">
                <FaSpinner className="animate-spin text-blue-500 text-5xl" />
            </div>
        }>
            <DetalheOrganicoContent />
        </Suspense>
    );
}