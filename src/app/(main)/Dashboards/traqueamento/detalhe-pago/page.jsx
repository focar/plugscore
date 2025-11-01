// /src/app/(main)/Dashboards/traqueamento/detalhe-pago/page.jsx
'use client';

import { useState, useEffect, useCallback, useMemo, Suspense, useContext } from "react";
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft, FaBullhorn, FaChartBar, FaBullseye, FaCalendarDay } from "react-icons/fa";
import toast, { Toaster } from 'react-hot-toast';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
// O Cell não é mais necessário para esta nova abordagem
// const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

// Definir uma paleta de cores para o gráfico
const COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // green-500
  '#ef4444', // red-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#6366f1', // indigo-500
  '#f97316', // orange-500
  '#06b6d4', // cyan-500
  '#d946ef', // fuchsia-500
  '#34d399', // emerald-500
  '#fde047'  // yellow-400
];

function DetalhePagoContent() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const { userProfile, setHeaderContent } = useContext(AppContext);
    
    const [launchId, setLaunchId] = useState(null);
    const [launchName, setLaunchName] = useState(null);

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedId = sessionStorage.getItem('currentDetailLaunchId');
            const storedName = sessionStorage.getItem('currentDetailLaunchName');
            
            if (storedId) {
                setLaunchId(storedId);
                setLaunchName(storedName);
            } else {
                setIsLoading(false);
                router.push('/Dashboards/traqueamento');
            }
        }
    }, [router]);

    useEffect(() => {
        const launchNameControl = (
            <span className="text-base font-semibold text-gray-700 dark:text-gray-200 pr-4">
                {launchName || 'Carregando...'}
            </span>
        );

        setHeaderContent({ 
            title: 'Traqueamento de Trafego', 
            controls: launchName ? launchNameControl : null 
        }); 
        
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, launchName]);

    // --- 💡 CORREÇÃO (MANTER LANÇAMENTO AO VOLTAR) ---
    // Este efeito garante que o ID do lançamento seja salvo no 'persistLaunchId'
    // sempre que o usuário sair desta página (seja pelo botão "Voltar" do app ou pelo "Voltar" do navegador).
    useEffect(() => {
        // Esta função de limpeza (cleanup) roda QUANDO O COMPONENTE DESMONTA (usuário sai da página)
        return () => {
            // Pega o ID que estava sendo usado nesta página.
            const currentId = sessionStorage.getItem('currentDetailLaunchId');
            
            // Se o ID existir, salva ele em 'persistLaunchId'.
            // A página /traqueamento (a principal) está programada para ler este 'persistLaunchId'
            // e se auto-selecionar.
            if (currentId) {
                sessionStorage.setItem('persistLaunchId', currentId);
            }
        };
    }, []); // Array vazio garante que isso rode apenas na montagem e desmontagem

    const handleVoltar = () => {
        // A lógica do 'persistLaunchId' agora está no useEffect de desmontagem,
        // mas podemos manter esta por segurança para o clique explícito.
        if (launchId) sessionStorage.setItem('persistLaunchId', launchId);
        
        // Limpa o ID *atual* para evitar confusão se o usuário navegar para outro detalhe
        sessionStorage.removeItem('currentDetailLaunchId');
        sessionStorage.removeItem('currentDetailLaunchName');
        router.push('/Dashboards/traqueamento');
    };

    const handleInternalNavigate = (path) => {
        if (!launchId) { 
            toast.error("O contexto do lançamento não está disponível.");
            return;
        }
        
        // Garante que o contexto esteja no sessionStorage antes de navegar
        sessionStorage.setItem('currentDetailLaunchId', launchId);
        sessionStorage.setItem('currentDetailLaunchName', launchName);

        router.push(path);
    };

    const fetchData = useCallback(async (id) => {
        if (!userProfile || !id) return;
        setIsLoading(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
            
            const { data: result, error } = await supabase.rpc('get_paid_traffic_by_content', { 
                p_launch_id: id,
                p_client_id: clientIdToSend
            });
            if (error) throw error;
            setData(result || []);
        } catch (err) {
            toast.error("Falha ao carregar detalhes do tráfego pago.");
            console.error("Erro ao chamar RPC:", err.message);
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userProfile]);

    useEffect(() => {
        if (launchId) {
            fetchData(launchId);
        }
    }, [launchId, fetchData]);

    const totalPaidLeads = useMemo(() => data.reduce((sum, item) => sum + item.total_leads, 0), [data]);
    const sortedData = useMemo(() => [...data].sort((a, b) => b.total_leads - a.total_leads), [data]);
    
    // --- CORREÇÃO DAS BARRAS PRETAS (NOVA TÉCNICA) ---
    const chartData = useMemo(() => 
        sortedData.map((item, index) => ({ 
            name: item.utm_content || '(not set)', 
            Leads: item.total_leads,
            // 1. Injetamos a cor diretamente no objeto de dados
            fill: COLORS[index % COLORS.length] 
        }))
    , [sortedData]);
    // -------------------------------------------------

    const hasData = totalPaidLeads > 0;
    const basePath = `/Dashboards/traqueamento/detalhe-pago`;

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <Toaster position="top-center" />
            
            {/* Título e Navegação Interna (NÃO O HEADER PRINCIPAL) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col">
                    <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">ANÁLISE DE TRÁFEGO PAGO</p>
                    {/* O Título no Header agora é "Traqueamento de Trafego" */}
                    {/* O Nome do Lançamento está no Header à direita */}
                    {/* Este h1 é o título local da página */}
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{launchName || 'Carregando...'}</h1>
                </div>

                <nav className="flex flex-wrap items-center gap-3">
                    <button onClick={handleVoltar} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100">
                        <FaChevronLeft /> Voltar
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/score`)} disabled={!launchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaBullseye /> SCORE
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mql`)} disabled={!launchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaChartBar /> MQL
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mov-diario`)} disabled={!launchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaCalendarDay /> Mov. Diário
                    </button>
                </nav>
            </div>
            
            {isLoading || !launchId ? ( 
                <div className="flex justify-center items-center h-96"> <FaSpinner className="animate-spin text-blue-500 text-5xl" /> </div>
            ) : !hasData ? (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    Nenhum dado de tráfego pago encontrado para este lançamento.
                </div>
            ) : (
                <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    
                    {/* KPI Total de Leads Pagos */}
                    <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center gap-4">
                        <FaBullhorn className="text-blue-500" size={32} />
                        <div>
                            <p className="text-lg text-gray-600 dark:text-gray-300">Total de Leads Pagos</p>
                            <p className="text-4xl font-bold text-gray-800 dark:text-gray-100">{totalPaidLeads.toLocaleString('pt-BR')}</p>
                        </div>
                    </div>

                    {/* Tabela de Detalhe (UTM Content) */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg overflow-y-auto h-[35rem]">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Quebra por Conteúdo (UTM Content)</h2>
                        <table className="w-full text-left text-gray-800 dark:text-gray-200">
                            <thead className="sticky top-0 bg-white dark:bg-gray-800">
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase">UTM Content</th>
                                    <th className="p-3 text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase text-right">Leads</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedData.map(item => ( 
                                    <tr key={item.utm_content || Math.random()} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="p-3 font-medium">{item.utm_content || '(not set)'}</td>
                                        <td className="p-3 text-right font-bold text-blue-500 dark:text-blue-400">{item.total_leads.toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* GRÁFICO DE BARRAS */}
                    {/* 1. CORREÇÃO ALERTA CONSOLE: "flex flex-col" */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-[35rem] flex flex-col">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Leads por Conteúdo</h2>
                        {/* 1. CORREÇÃO ALERTA CONSOLE: height="100%" */}
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <XAxis type="number" stroke="rgb(107 114 128 / 1)" /> 
                                <YAxis type="category" dataKey="name" width={150} stroke="rgb(107 114 128 / 1)" tick={{ fontSize: 12 }} reversed={true} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(243, 244, 246, 0.5)'}} 
                                    contentStyle={{ 
                                        backgroundColor: 'rgb(31, 41, 55)', 
                                        border: '1px solid rgb(55, 65, 81)',
                                        color: 'rgb(209, 213, 219)'
                                    }} 
                                    itemStyle={{ color: 'rgb(209, 213, 219)' }}
                                />
                                {/* * 2. CORREÇÃO BARRAS PRETAS: 
                                  * Usamos 'fillKey' para ler a propriedade 'fill' que injetamos nos dados.
                                */}
                                <Bar dataKey="Leads" radius={[0, 4, 4, 0]} fillKey="fill" />
                            </BarChart>
                       </ResponsiveContainer>
                    </div>
                </main>
            )}
        </div>
    );
}

export default function DetalhePagoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
            <DetalhePagoContent />
        </Suspense>
    );
}

