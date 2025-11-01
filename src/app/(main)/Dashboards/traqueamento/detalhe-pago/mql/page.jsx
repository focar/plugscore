// /src/app/(main)/Dashboards/traqueamento/detalhe-pago/mql/page.jsx
'use client';

import { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
// Ícones necessários
import { FaSpinner, FaChevronLeft, FaAward, FaStar, FaRegStar, FaStarHalfAlt, FaBullseye, FaChartBar, FaCalendarDay } from 'react-icons/fa'; 
import dynamic from 'next/dynamic';
import toast, { Toaster } from 'react-hot-toast'; 

const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

const MQL_CONFIG = {
    A: { title: "A", range: "Categoria A (20+)", icon: FaAward, color: "text-amber-400" }, // Título simplificado para o card
    B: { title: "B", range: "Categoria B (14-19)", icon: FaStar, color: "text-lime-400" },
    C: { title: "C", range: "Categoria C (6-13)", icon: FaStarHalfAlt, color: "text-cyan-400" },
    D: { title: "D", range: "Categoria D (1-5)", icon: FaRegStar, color: "text-slate-400" },
};
// Cores ajustadas para maior visibilidade e contraste
const CHART_COLORS = ['#fbbf24', '#a3e635', '#22d3ee', '#94a3b8', '#818cf8', '#e879f9', '#f43f5e', '#10b981', '#14b8a6', '#fcd34d'];

// --- CORREÇÃO 2 (CORES) ---
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
        name: item.name || '(not set)', // Garante que o nome não seja nulo
        value: item.value,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }));

    if (otherItems.length > 0) {
        const othersSum = otherItems.reduce((sum, item) => sum + item.value, 0);
        coloredData.push({ 
            name: 'Outros', 
            value: othersSum,
            // 'Outros' terá uma cor distinta
            fill: CHART_COLORS[CHART_COLORS.length - 1] 
        });
    }
    
    return coloredData;
}

// Componente MqlBreakdownChart
const MqlBreakdownChart = ({ title, data }) => {
    const { theme } = useContext(AppContext);
    
    // Função para definir a cor do texto do gráfico (eixos, legendas, etc.)
    const getTextColor = () => theme === 'dark' ? '#d1d5db' : '#4b5563'; 

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
            {/* Título do gráfico (usando range para ser descritivo) */}
            <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-2">{title}</h3> 
            
            {/* --- CORREÇÃO 3 (ALERTAS) ---
              * Mudado height={400} para height="100%" para ser responsivo
            */}
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    {/* --- CORREÇÃO 2 (CORES) ---
                      * Adicionado fillKey="fill" para ler a cor injetada nos dados
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
                      {/* O <Cell> foi removido pois estamos usando fillKey */}
                    </Pie>
                    <Tooltip 
                        contentStyle={
                            theme === 'dark' 
                            ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#d1d5db' } 
                            : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }
                        }
                        itemStyle={{ color: getTextColor() }} // Garante cor do texto dentro do tooltip
                    />
                    {/* Cor da legenda e rótulos do gráfico ajustados para dark mode */}
                    <Legend 
                        wrapperStyle={{ 
                            paddingTop: '20px', 
                            color: getTextColor(),
                            fontSize: '14px' 
                        }} 
                        // O formatter foi removido para simplificar, a legenda usará a cor padrão do texto.
                        // O fillKey no <Pie> já é suficiente.
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

function MqlPageContent() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const { userProfile, setHeaderContent } = useContext(AppContext);
    
    // Estados para controle de renderização e dados
    const [launchId, setLaunchId] = useState(null);
    const [launchName, setLaunchName] = useState(null);
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isClient, setIsClient] = useState(false); 
    
    // 1. Efeito para garantir que a leitura do sessionStorage aconteça apenas no lado do cliente (Flicker Control)
    useEffect(() => {
        setIsClient(true);
        if (typeof window !== 'undefined') {
            const storedId = sessionStorage.getItem('currentDetailLaunchId');
            const storedName = sessionStorage.getItem('currentDetailLaunchName');
            
            if (storedId) {
                setLaunchId(storedId);
                setLaunchName(storedName);
            } else {
                setIsLoading(false); 
            }
        }
    }, []); 

    // 2. Efeito para sincronizar Header e redirecionar se não houver ID
    useEffect(() => {
        if (!launchId && !isLoading && isClient && userProfile) {
            router.push('/Dashboards/traqueamento');
        }
        
        // --- CORREÇÃO 1 (HEADER) ---
        // Cria o controle para o nome do lançamento
        const launchNameControl = (
            <span className="text-base font-semibold text-gray-700 dark:text-gray-200 pr-4">
                {launchName || 'Carregando...'}
            </span>
        );

        // Define o header com o padrão correto
        setHeaderContent({ 
            title: 'Traqueamento de Trafego', // Título fixo à esquerda
            controls: launchName ? launchNameControl : null // Nome do lançamento à direita
        }); 
        
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, launchName, launchId, isLoading, isClient, router, userProfile]); // Adicionadas dependências

    
    // Caminho base para navegação interna (para onde o "Voltar" deve ir)
    const basePath = "/Dashboards/traqueamento/detalhe-pago"; 

    // --- CORREÇÃO 4 (BOTÃO VOLTAR) ---
    const handleVoltar = () => {
        // A página /detalhe-pago (basePath) já sabe ler o 'currentDetailLaunchId'.
        // Apenas navegamos de volta para ela.
        router.push(basePath);
    };

    const handleInternalNavigate = (path) => {
        if (launchId) {
            sessionStorage.setItem('currentDetailLaunchId', launchId);
            sessionStorage.setItem('currentDetailLaunchName', launchName);
        }
        router.push(path);
    };

    const fetchData = useCallback(async (id) => {
        if (!userProfile) return;
        setIsLoading(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
            const { data: result, error } = await supabase.rpc('get_paid_mql_breakdown_by_content', { 
                p_launch_id: id,
                p_client_id: clientIdToSend
            });
            if (error) throw error;
            setData(result);
        } catch (err) {
            toast.error("Falha ao carregar detalhes de MQL.");
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userProfile]);

    useEffect(() => {
        if (launchId) {
            fetchData(launchId);
        }
    }, [launchId, fetchData]);
    
    // Oculta o conteúdo principal se não houver ID ou se estiver carregando
    const showContent = !isLoading && launchId && data && data.totals;

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Toaster position="top-center" />
            
            {/* --- CABEÇALHO DA PÁGINA (Título e Navegação) --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col">
                    <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">ANÁLISE DE MQL</p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{launchName || 'Carregando...'}</h1>
                </div>

                {/* BOTÕES DE NAVEGAÇÃO E VOLTAR */}
                <nav className="flex flex-wrap items-center gap-3">
                    {/* Botão voltar corrigido */}
                    <button onClick={handleVoltar} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100">
                        <FaChevronLeft /> Voltar
                    </button>
                    
                    {/* Botões de Navegação Interna */}
                    <button onClick={() => handleInternalNavigate(`${basePath}/score`)} disabled={!launchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaBullseye /> SCORE
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mql`)} disabled={!launchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white shadow-md hover:bg-blue-600 disabled:opacity-50">
                        <FaChartBar /> MQL
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mov-diario`)} disabled={!launchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaCalendarDay /> Mov. Diário
                    </button>
                </nav>
            </div>

            {/* --- CONTEÚDO PRINCIPAL (Loading/Dados/Vazio) --- */}
            {isLoading || !launchId || !isClient ? (
                <div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>
            ) : !data || !data.totals ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">Nenhum dado de MQL para este lançamento.</div>
            ) : (
                <main>
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {Object.keys(MQL_CONFIG).map(key => {
                            const config = MQL_CONFIG[key];
                            const total = data?.totals?.[key] ?? 0;
                            return (
                                <div key={key} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex items-center gap-4">
                                    <config.icon className={`${config.color} text-4xl flex-shrink-0`} />
                                    <div>
                                        {/* Aumento do tamanho da letra para a categoria (A, B, C, D) */}
                                        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-slate-200">{config.title}</h2> 
                                        <p className="text-sm font-semibold text-gray-500 dark:text-slate-400">{config.range}</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{total}</p>
                                        <p className="text-xs text-gray-500 dark:text-slate-400">Total de Leads</p>
                                    </div>
                                </div>
                            );
                        })}
                    </section>

                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {Object.keys(MQL_CONFIG).map(key => (
                            <MqlBreakdownChart
                                key={key}
                                title={`${MQL_CONFIG[key].range}`} // Usando o range como título, que é mais descritivo
                                data={summarizeChartData(data?.breakdowns?.[key] || [])}
                            />
                        ))}
                    </section>
                </main>
            )}
        </div>
    );
}

export default function MqlPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
            <MqlPageContent />
        </Suspense>
    );
}
