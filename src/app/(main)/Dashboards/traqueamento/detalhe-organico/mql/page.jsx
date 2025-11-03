// /src/app/(main)/Dashboards/traqueamento/detalhe-organico/mql/page.jsx
'use client';

import React, { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useRouter } from 'next/navigation';
// import Link from 'next/link'; // REMOVIDO: Usaremos botões com handleInternalNavigate
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft, FaAward, FaStar, FaRegStar, FaStarHalfAlt, FaBullseye, FaChartBar, FaCalendarDay } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import toast, { Toaster } from 'react-hot-toast';

// Lazy load dos componentes do Recharts
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });


// --- Constantes e Configurações ---
const MQL_CONFIG = {
  A: { title: "Categoria A", range: "(Forte)", icon: FaAward, color: "text-amber-400" },
  B: { title: "Categoria B", range: "(Médio)", icon: FaStar, color: "text-lime-400" },
  C: { title: "Categoria C", range: "(Fraco)", icon: FaStarHalfAlt, color: "text-cyan-400" },
  D: { title: "Categoria D", range: "(Baixo)", icon: FaRegStar, color: "text-slate-400" },
};
const CHART_COLORS = ['#f59e0b', '#84cc16', '#22d3ee', '#64748b', '#8884d8', '#da84d8', '#82ca9d', '#ffc658', '#a4de6c', '#d0ed57'];
const MQL_ORDER = ['A', 'B', 'C', 'D'];

// Customizador de texto da legenda para garantir cor no dark mode
const renderColorfulLegendText = (value, entry, theme) => {
    return <span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>{value}</span>; 
};

// --- CORREÇÃO 3 (CORES) ---
// Função injeta a cor nos dados
function summarizeChartData(data, limit = 6) { 
    if (!data || data.length === 0) return []; // Retorna array vazio se não houver dados

    // 1. Filtra itens sem valor
    const validData = data.filter(item => item && item.value > 0);
    
    let finalData;
  
    // 2. Verifica se precisa agrupar em "Outros"
    if (validData.length <= limit) {
        finalData = validData;
    } else {
        const sortedData = [...validData].sort((a, b) => b.value - a.value);
        const topItems = sortedData.slice(0, limit);
        const others = sortedData.slice(limit);
        
        const othersSum = others.reduce((sum, item) => sum + item.value, 0);
        
        finalData = topItems;
        if (othersSum > 0) {
            finalData.push({ name: 'Outros', value: othersSum });
        }
    }
    
    // 3. Injeta a propriedade 'fill' (cor) em cada item
    return finalData.map((item, index) => ({
        ...item,
        fill: CHART_COLORS[index % CHART_COLORS.length]
    }));
}

const MqlBreakdownChart = ({ title, data }) => {
    const { theme } = useContext(AppContext);
    
    const chartDataRaw = (data || [])
        .map(item => ({
            name: item.name || '(Não Definido)',
            value: item.value || 0 
        }))
        .filter(item => item.value > 0);

    // Aplica o summarize (que agora injeta as cores)
    const chartData = summarizeChartData(chartDataRaw);
    const hasData = chartData.length > 0;

    if (!hasData) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[450px]">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 text-center">{title}</h3>
                <p className="text-gray-500 dark:text-slate-400">Nenhum detalhe de tráfego orgânico (utm_source) para esta categoria MQL.</p>
            </div>
        );
    }
    
    return (
        // --- CORREÇÃO 4 (ALERTAS) ---
        // Adicionado min-h-[450px] e flex flex-col
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg min-h-[450px] flex flex-col">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-2">{title}</h3>
            
            {/* --- CORREÇÃO 4 (ALERTAS) ---
              * Mudado height={400} para height="100%"
            */}
            <ResponsiveContainer width="100%" height="100%"> 
                {/* Removido 'style' que quebrava as cores */}
                <PieChart>
                    <Pie 
                        data={chartData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value" 
                        nameKey="name" 
                        // --- CORREÇÃO 3 (CORES) ---
                        // Usando fillKey para ler a cor injetada
                        fillKey="fill"
                    >
                        {/* Cell agora só define a borda */}
                        {chartData.map((entry, index) => (
                            <Cell 
                                key={`cell-${entry.name || index}`} 
                                stroke={theme === 'dark' ? '#1f2937' : '#ffffff'}
                                strokeWidth={3}
                            />
                        ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={
                            theme === 'dark' 
                            ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#d1d5db' } 
                            : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }
                        }
                        itemStyle={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}
                    />
                    <Legend 
                        wrapperStyle={{ paddingTop: '20px' }} 
                        // Passa o 'theme' para o formatter
                        formatter={(value, entry) => renderColorfulLegendText(value, entry, theme)}
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
    
    const [launchId, setLaunchId] = useState(null);
    const [launchName, setLaunchName] = useState(null);
    const basePath = "/Dashboards/traqueamento/detalhe-organico"; 

    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // --- CORREÇÃO 1 (PISCANDO) ---
    // Adicionado 'isClient' para controlar renderização
    const [isClient, setIsClient] = useState(false);

    // Lógica de hidratação (leitura do sessionStorage)
    useEffect(() => {
        // --- CORREÇÃO 1 (PISCANDO) ---
        setIsClient(true); 
        if (typeof window !== 'undefined') {
            const storedId = sessionStorage.getItem('currentDetailLaunchId');
            const storedName = sessionStorage.getItem('currentDetailLaunchName');
            
            if (storedId) {
                setLaunchId(storedId);
                setLaunchName(storedName);
            } else {
                setIsLoading(false); // Para o loading se não houver ID
                router.push('/Dashboards/traqueamento'); // Redireciona se não houver ID
            }
        }
    }, [router]);

    // --- CORREÇÃO 5 (BOTÃO VOLTAR) ---
    const handleVoltar = useCallback(() => {
        // O "Voltar" desta página deve ir para a página PAI (detalhe-organico)
        router.push(basePath);
    }, [router, basePath]);
    
    // --- CORREÇÃO 5 (NAVEGAÇÃO) ---
    // Adicionada função para navegar salvando o contexto
    const handleInternalNavigate = (path) => {
        if (launchId) {
            sessionStorage.setItem('currentDetailLaunchId', launchId);
            sessionStorage.setItem('currentDetailLaunchName', launchName);
        }
        router.push(path);
    };


    // --- CORREÇÃO 2 (HEADER) ---
    useEffect(() => {
        const launchNameControl = (
            <span className="text-base font-semibold text-gray-700 dark:text-gray-200 pr-4">
                {launchName || 'Carregando...'}
            </span>
        );
    
        setHeaderContent({ 
            title: 'Traqueamento de Trafego', // Título fixo à esquerda
            controls: launchName ? launchNameControl : null // Nome do lançamento à direita
        }); 
        
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, launchName]); // Depende apenas do launchName
    
    // *** FETCH DE DADOS (CORRIGIDO PARA ESPERAR JSONB) ***
    const fetchData = useCallback(async (id) => {
        if (!userProfile || !id) return;
        setIsLoading(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
            
            // Chamada RPC
            const { data: result, error } = await supabase.rpc('get_organic_mql_breakdown_by_medium', { 
                p_launch_id: id,
                p_client_id: clientIdToSend
            });
            
            if (error) throw error;
            
            // CORREÇÃO: Espera o objeto JSONB diretamente (ou o primeiro elemento do array)
            let fetchedData = Array.isArray(result) && result.length > 0 ? result[0] : result;
            
            // Final fallback: garantir que é um objeto
            if (typeof fetchedData !== 'object' || fetchedData === null) {
                fetchedData = null; 
            }

            // --- Validação de dados e definição do estado ---
            if (fetchedData && fetchedData.totals && fetchedData.breakdowns) {
                const totals = fetchedData.totals || {};
                const breakdowns = fetchedData.breakdowns || {};
                
                const hasTotals = Object.values(totals).some(val => Number(val) > 0);
                const hasBreakdowns = Object.values(breakdowns).some(arr => 
                    Array.isArray(arr) && arr.length > 0 && arr.some(item => (item.value || 0) > 0)
                );

                if (hasTotals || hasBreakdowns) {
                    setData(fetchedData);
                } else {
                    setData(null);
                }
            } else {
                setData(null);
            }

        } catch (err) {
            console.error(err);
            toast.error("Falha ao carregar dados de MQL. Verifique o console.");
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userProfile]);

    // Disparar fetch APÓS a hidratação
    useEffect(() => {
        if (launchId && userProfile) { // Adicionado userProfile
            fetchData(launchId);
        }
    }, [launchId, fetchData, userProfile]); // Adicionado userProfile


    const hasRelevantData = data && (
        (data.totals && Object.values(data.totals).some(val => val > 0)) ||
        (data.breakdowns && Object.values(data.breakdowns).some(arr => arr && arr.length > 0 && arr.some(item => (item.value || 0) > 0)))
    );

    // --- CORREÇÃO 1 (PISCANDO) ---
    // Controla o "pisca"
    if (!isClient || isLoading || !launchId) {
        return (
            <div className="flex justify-center items-center h-96">
                <FaSpinner className="animate-spin text-blue-500 text-5xl" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Toaster position="top-center" />

            {/* --- CABEÇALHO DA PÁGINA --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                
                {/* ITEM 1: Título da Análise + NOME DO LANÇAMENTO */}
                <div className="flex flex-col flex-shrink-0">
                    <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">ANÁLISE DE MQL - TRÁFEGO ORGÂNICO</p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{launchName || 'Carregando...'}</h1>
                </div>

                {/* ITEM 2: Abas + Voltar */}
                <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                    {/* --- CORREÇÃO 5 (NAVEGAÇÃO) --- */}
                    {/* Trocado <Link> por <button> e onClick */}
                    <nav className="flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto">
                                         {/* Botão Voltar (Corrigido) */}
                    <button onClick={handleVoltar} className="flex-shrink-0 flex items-center justify-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                        <FaChevronLeft size={14} /> Voltar
                    </button>
                       
                        {/* SCORE (Inativo) */}
                        <button onClick={() => handleInternalNavigate(`${basePath}/score`)} className={`flex-1 sm:flex-none flex justify-center items-center gap-3 font-semibold px-4 py-3 rounded-lg shadow-md transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700`}>
                          <FaBullseye size={16} /> SCORE
                        </button>
                        
                        {/* MQL (Ativo) */}
                        <button onClick={() => handleInternalNavigate(`${basePath}/mql`)} className={`flex-1 sm:flex-none flex justify-center items-center gap-3 font-semibold px-4 py-3 rounded-lg shadow-md transition-colors bg-blue-600 text-white cursor-default pointer-events-none`}>
                          <FaChartBar size={16} /> MQL
                        </button>
                        
                        {/* Mov. Diário (Inativo) */}
                        <button onClick={() => handleInternalNavigate(`${basePath}/mov-diario`)} className={`flex-1 sm:flex-none flex justify-center items-center gap-3 font-semibold px-4 py-3 rounded-lg shadow-md transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700`}>
                          <FaCalendarDay size={16} /> Mov. Diário
                        </button>
                    </nav>
                </div>
            </div>
            {/* --- FIM DO CABEÇALHO --- */}


            {/* O loading é tratado no início do componente */}
            {!hasRelevantData ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">Nenhum dado de MQL para este lançamento.</div>
            ) : (
                <main>
                    {/* Cards de Totais */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {MQL_ORDER.map(key => { 
                            const config = MQL_CONFIG[key];
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

                    {/* Gráficos de Quebra por Medium (Pie Charts) */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {MQL_ORDER.map(key => (
                            <Suspense key={key} fallback={<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg min-h-[450px] flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-3xl" /></div>}>
                                <MqlBreakdownChart
                                    title={`${MQL_CONFIG[key].title} ${MQL_CONFIG[key].range}`}
                                    // Passa o breakdown para o summarizeChartData
                                    data={data?.breakdowns?.[key] || []} 
                                />
                            </Suspense>
                        ))}
                    </section>
                </main>
            )}
        </div>
    );
};

export default function MqlOrganicoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
            <MqlPageContent />
        </Suspense>
    );
}
