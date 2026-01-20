// /src/app/(main)/Dashboards/traqueamento/detalhe-pago/score/page.jsx
'use client';

import { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft, FaThermometerFull, FaThermometerThreeQuarters, FaThermometerHalf, FaThermometerEmpty, FaBullhorn, FaChartBar, FaCalendarDay } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import toast, { Toaster } from 'react-hot-toast';

const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

// --- CONFIGURAÇÕES DE SCORE (ATUALIZADO PARA 4 CATEGORIAS) ---
const SCORE_CONFIG = {
  premium: { title: "Premium", range: "(85-100)", icon: FaThermometerFull, color: "text-purple-600" },
  quente: { title: "Quente", range: "(70-84)", icon: FaThermometerThreeQuarters, color: "text-red-500" },
  morno: { title: "Morno", range: "(55-69)", icon: FaThermometerHalf, color: "text-amber-500" },
  frio: { title: "Frio", range: "(0-54)", icon: FaThermometerEmpty, color: "text-blue-500" },
};

const CHART_COLORS = ['#9333ea', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#14b8a6', '#f43f5e'];

function summarizeChartData(data, limit = 15) {
    if (!data || data.length === 0) return [];
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    let topItems = sortedData;
    let otherItems = [];

    if (sortedData.length > limit + 1) {
        topItems = sortedData.slice(0, limit);
        otherItems = sortedData.slice(limit);
    }
    
    let coloredData = topItems.map((item, index) => ({
        ...item,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }));

    if (otherItems.length > 0) {
        const othersSum = otherItems.reduce((sum, item) => sum + item.value, 0);
        coloredData.push({ 
            name: 'Outros', 
            value: othersSum,
            fill: CHART_COLORS[CHART_COLORS.length - 1] 
        });
    }
    return coloredData;
}

const ScoreBreakdownChart = ({ title, data }) => {
    const { theme } = useContext(AppContext);
    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[450px] border dark:border-gray-700">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{title}</h3>
                <p className="text-gray-500 dark:text-slate-400">Nenhum dado para exibir.</p>
            </div>
        );
    }
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col min-h-[450px] border dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-2">{title}</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie 
                        data={data} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value" 
                        nameKey="name"
                        fillKey="fill" 
                    >
                    </Pie>
                    <Tooltip 
                        contentStyle={
                            theme === 'dark' 
                            ? { backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' } 
                            : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px' }
                        }
                        itemStyle={{ color: theme === 'dark' ? '#fff' : '#374151' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(value) => <span className="text-gray-600 dark:text-gray-300 text-xs">{value}</span>} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

function ScorePageContent() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const { userProfile, setHeaderContent } = useContext(AppContext);
    
    const [contextLaunchId, setContextLaunchId] = useState(null);
    const [contextLaunchName, setContextLaunchName] = useState(null);
    const basePath = "/Dashboards/traqueamento/detalhe-pago"; 
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedId = sessionStorage.getItem('currentDetailLaunchId');
            const storedName = sessionStorage.getItem('currentDetailLaunchName');
            if (storedId) {
                setContextLaunchId(storedId);
                setContextLaunchName(storedName);
                setIsLoading(true); 
            } else {
                router.push('/Dashboards/traqueamento');
            }
        }
    }, [router]);

    useEffect(() => {
        const launchNameControl = (
            <span className="text-base font-semibold text-gray-700 dark:text-gray-200 pr-4">
                {contextLaunchName || 'Carregando...'}
            </span>
        );
        setHeaderContent({ 
            title: 'Traqueamento de Trafego', 
            controls: contextLaunchName ? launchNameControl : null 
        }); 
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, contextLaunchName]);
    
    const fetchData = useCallback(async (id) => {
        if (!userProfile || !id) return;
        setIsLoading(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
            const { data: result, error } = await supabase.rpc('get_paid_score_breakdown_by_content', { 
                p_launch_id: id,
                p_client_id: clientIdToSend
            });
            if (error) throw error;
            setData(result);
        } catch (err) {
            console.error(err);
            toast.error("Erro ao carregar dados.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userProfile]);

    useEffect(() => {
        if (contextLaunchId) {
            fetchData(contextLaunchId);
        }
    }, [contextLaunchId, fetchData]);

    const handleVoltar = () => { router.push(basePath); };
    
    const handleInternalNavigate = (path) => {
        if (!contextLaunchId) return;
        sessionStorage.setItem('currentDetailLaunchId', contextLaunchId);
        sessionStorage.setItem('currentDetailLaunchName', contextLaunchName);
        router.push(path);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <Toaster />
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col">
                    <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider font-semibold">ANÁLISE DE SCORE - TRÁFEGO PAGO</p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{contextLaunchName || 'Carregando...'}</h1>
                </div>

                <nav className="flex flex-wrap items-center gap-3">
                    <button onClick={handleVoltar} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <FaChevronLeft /> Voltar
                    </button>
                    <button onClick={() => handleInternalNavigate (basePath)} disabled={!contextLaunchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white shadow-md disabled:opacity-50">
                        <FaBullhorn /> Score
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mql`)} disabled={!contextLaunchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
                        <FaChartBar /> MQL
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mov-diario`)} disabled={!contextLaunchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors">
                        <FaCalendarDay /> Mov. Diário
                    </button>
                </nav>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>
            ) : !data || !data.totals ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">Nenhum dado de score para este lançamento.</div>
            ) : (
                <main>
                    {/* GRID ATUALIZADO PARA 4 COLUNAS */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-10">
                        {Object.keys(SCORE_CONFIG).map(key => {
                            const config = SCORE_CONFIG[key];
                            const total = data?.totals?.[key] ?? 0;
                            return (
                                <div key={key} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex items-center gap-4 border dark:border-gray-700">
                                    <config.icon className={`${config.color} text-4xl flex-shrink-0`} />
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">{config.title}</h2>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{total.toLocaleString('pt-BR')}</p>
                                        <p className="text-sm text-gray-500 dark:text-slate-400">Total de Leads</p>
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {Object.keys(SCORE_CONFIG).map(key => (
                            <ScoreBreakdownChart
                                key={key}
                                title={`${SCORE_CONFIG[key].title} ${SCORE_CONFIG[key].range}`}
                                data={summarizeChartData(data?.breakdowns?.[key])}
                            />
                        ))}
                    </section>
                </main>
            )}
        </div>
    );
}

export default function ScorePage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
            <ScorePageContent />
        </Suspense>
    );
}