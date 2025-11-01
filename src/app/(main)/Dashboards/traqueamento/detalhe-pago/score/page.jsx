// /src/app/(main)/Dashboards/traqueamento/detalhe-pago/score/page.jsx
'use client';

import { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useRouter } from 'next/navigation'; // Removido useSearchParams
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft, FaThermometerFull, FaThermometerThreeQuarters, FaThermometerHalf, FaThermometerQuarter, FaThermometerEmpty, FaBullhorn, FaChartBar, FaCalendarDay } from 'react-icons/fa'; // IMPORT CORRIGIDO
import dynamic from 'next/dynamic';

const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false }); // Cell ainda é necessário se usarmos fillKey? Não, mas vou manter para o fillKey
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });


const SCORE_CONFIG = {
  quente: { title: "Quente", range: "(80+)", icon: FaThermometerFull, color: "text-red-500" },
  quente_morno: { title: "Quente-Morno", range: "(65-79)", icon: FaThermometerThreeQuarters, color: "text-orange-500" },
  morno: { title: "Morno", range: "(50-64)", icon: FaThermometerHalf, color: "text-yellow-500" },
  morno_frio: { title: "Morno-Frio", range: "(35-49)", icon: FaThermometerQuarter, color: "text-sky-500" },
  frio: { title: "Frio", range: "(1-34)", icon: FaThermometerEmpty, color: "text-blue-500" },
};
const CHART_COLORS = ['#ef4444', '#f97316', '#eab308', '#38bdf8', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#14b8a6', '#f43f5e'];

// --- CORREÇÃO 1 (CORES) ---
// Modificamos esta função para injetar a cor nos dados
function summarizeChartData(data, limit = 15) {
    if (!data || data.length === 0) return [];
    
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    
    let topItems = sortedData;
    let otherItems = [];

    if (sortedData.length > limit + 1) {
        topItems = sortedData.slice(0, limit);
        otherItems = sortedData.slice(limit);
    }
    
    // Adiciona a cor (fill) a cada item
    let coloredData = topItems.map((item, index) => ({
        ...item,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }));

    if (otherItems.length > 0) {
        const othersSum = otherItems.reduce((sum, item) => sum + item.value, 0);
        coloredData.push({ 
            name: 'Outros', 
            value: othersSum,
            // 'Outros' terá a última cor da paleta
            fill: CHART_COLORS[CHART_COLORS.length - 1] 
        });
    }
    
    return coloredData;
}

const ScoreBreakdownChart = ({ title, data }) => {
    const { theme } = useContext(AppContext);
    if (!data || data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[450px]">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{title}</h3>
                <p className="text-gray-500 dark:text-slate-400">Nenhum dado para exibir.</p>
            </div>
        );
    }
    return (
        // --- CORREÇÃO 3 (ALERTAS) ---
        // Adicionado "flex flex-col" e "min-h-[450px]"
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col min-h-[450px]">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-2">{title}</h3>
            
            {/* --- CORREÇÃO 3 (ALERTAS) ---
              * Mudado height={400} para height="100%" para ser responsivo
            */}
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    {/* --- CORREÇÃO 1 (CORES) ---
                      * Adicionado fillKey="fill" para ler a cor injetada nos dados
                      * Removido o map de <Cell>
                    */}
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
                        {/* O map de <Cell> foi removido, pois agora usamos fillKey */}
                    </Pie>
                    <Tooltip 
                        contentStyle={
                            theme === 'dark' 
                            ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#d1d5db' } 
                            : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }
                        }
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', color: theme === 'dark' ? '#d1d5db' : '#4b5563' }} />
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

    // Este é o caminho para onde o botão "Voltar" deve ir
    const basePath = "/Dashboards/traqueamento/detalhe-pago"; 

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // EFEITO DE LEITURA DO CONTEXTO DE NAVEGAÇÃO
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
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userProfile]);

    useEffect(() => {
        if (contextLaunchId) {
            fetchData(contextLaunchId);
        }
    }, [contextLaunchId, fetchData]);

    // --- CORREÇÃO 2 (BOTÃO VOLTAR) ---
    const handleVoltar = () => {
        // A página /detalhe-pago (para onde vamos) também lê o 'currentDetailLaunchId'.
        // Não precisamos fazer nada com o sessionStorage, apenas navegar.
        router.push(basePath);
    };
    
    const handleInternalNavigate = (path) => {
        if (!contextLaunchId) return;
        sessionStorage.setItem('currentDetailLaunchId', contextLaunchId);
        sessionStorage.setItem('currentDetailLaunchName', contextLaunchName);
        router.push(path);
    };


    return (
        <div className="p-4 sm:p-6 lg:p-8">

            {/* --- CABEÇALHO --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col">
                    <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">ANÁLISE DE SCORE</p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{contextLaunchName || 'Carregando...'}</h1>
                </div>

                {/* BOTÕES DE NAVEGAÇÃO E VOLTAR */}
                <nav className="flex flex-wrap items-center gap-3">
                    {/* O onClick agora chama o handleVoltar corrigido */}
                    <button onClick={handleVoltar} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100">
                        <FaChevronLeft /> Voltar
                    </button>
                    <button onClick={() => handleInternalNavigate (basePath)} disabled={!contextLaunchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaBullhorn /> Leads Pagos
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mql`)} disabled={!contextLaunchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaChartBar /> MQL
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mov-diario`)} disabled={!contextLaunchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaCalendarDay /> Mov. Diário
                    </button>
                </nav>
            </div>
            {/* --- FIM DO CABEÇALHO --- */}

            {isLoading ? (
                <div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>
            ) : !data || !data.totals ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">Nenhum dado de score para este lançamento.</div>
            ) : (
                <main>
                    <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-10">
                        {Object.keys(SCORE_CONFIG).map(key => {
                            const config = SCORE_CONFIG[key];
                            const total = data?.totals?.[key] ?? 0;
                            return (
                                <div key={key} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex items-center gap-4">
                                    <config.icon className={`${config.color} text-4xl flex-shrink-0`} />
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">{config.title}</h2>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{total}</p>
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
                                // Passa os dados já coloridos para o gráfico
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

