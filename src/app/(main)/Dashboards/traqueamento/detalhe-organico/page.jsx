// /src/app/(main)/Dashboards/traqueamento/detalhe-organico/page.jsx
'use client';

// =================================================================
// /// --- CÓDIGO v32.0 (Corrige BUG de navegação "Voltar" 100%) --- ///
// =================================================================

import { useState, useEffect, useCallback, useMemo, Suspense, useContext } from "react";
import { useRouter } from 'next/navigation';
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
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false }); 

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

function DetalheOrganicoContent() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const { userProfile, setHeaderContent, selectedClientId } = useContext(AppContext);
    
    const [currentLaunchId, setCurrentLaunchId] = useState(null);
    const [currentLaunchName, setCurrentLaunchName] = useState(null);
    const [isClient, setIsClient] = useState(false); // Para controle de "pisca"

    const basePath = "/Dashboards/traqueamento/detalhe-organico"; 

    const [data, setData] = useState([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const clientIdToSend = userProfile?.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile?.cliente_id;

    // --- LÓGICA DE NAVEGAÇÃO / PERSISTÊNCIA ---

    // *** CORREÇÃO: Removido o useEffect[cleanup] ***
    
    // *** CORREÇÃO: Atualizado handleVoltar para setar a "flag" ***
    const handleVoltar = useCallback(() => {
        // *** CORREÇÃO: Seta a "flag" de persistência ***
        // Lê o ID direto do sessionStorage para garantir que está pegando o valor correto
        const currentId = sessionStorage.getItem('currentDetailLaunchId');
        if (currentId) {
            sessionStorage.setItem('persistTraqueamentoLaunchId', currentId);
        }
        
        // A página principal lerá 'currentDetailLaunchId',
        // então NÃO o removemos daqui.
        router.push('/Dashboards/traqueamento');
    }, [router]); // Removido currentLaunchId das dependências

    
    const handleInternalNavigate = (path) => {
        if (currentLaunchId) {
            sessionStorage.setItem('currentDetailLaunchId', currentLaunchId);
            sessionStorage.setItem('currentDetailLaunchName', currentLaunchName);
        }
        router.push(path);
    };

    // Efeito para ler do SessionStorage
    useEffect(() => {
        setIsClient(true);
        const storedId = sessionStorage.getItem('currentDetailLaunchId');
        const storedName = sessionStorage.getItem('currentDetailLaunchName');
        
        if (storedId) {
            setCurrentLaunchId(storedId);
            setCurrentLaunchName(storedName);
        } else {
            setIsLoadingData(false); // Para o loading se não houver ID
        }
    }, []);

    // Efeito de Header e Redirecionamento
    useEffect(() => {
        // Redireciona se não houver ID (lógica de "pisca")
        if (isClient && !isLoadingData && !currentLaunchId && userProfile) {
            toast.error("Contexto do lançamento perdido. Retornando...");
            router.push('/Dashboards/traqueamento');
        }

        const launchNameControl = (
            <span className="text-base font-semibold text-gray-700 dark:text-gray-200 pr-4">
                {currentLaunchName || 'Carregando...'}
            </span>
        );

        setHeaderContent({ 
            title: 'Traqueamento de Trafego', // Título fixo à esquerda
            controls: currentLaunchName ? launchNameControl : null // Nome do lançamento à direita
        }); 
        
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, currentLaunchName, currentLaunchId, isClient, isLoadingData, userProfile, router]);
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
        if (currentLaunchId && userProfile) { // Garante que userProfile exista antes de buscar
            fetchData(currentLaunchId);
        }
    }, [currentLaunchId, fetchData, userProfile]); // Adicionado userProfile

    // Calcula o total de leads (Memoizado para performance)
    const totalOrganicLeads = useMemo(() => data.reduce((sum, item) => sum + item.total_leads, 0), [data]);

    // Prepara os dados para o gráfico (Memoizado para performance)
    const chartData = useMemo(() => 
        data.map((item, index) => ({ 
            name: item.utm_source_name || '(not set)',
            Leads: item.total_leads,
            fill: COLORS[index % COLORS.length] // Injeta a cor
        })), 
    [data]);

    // Não renderiza nada até o cliente ser verificado e o ID carregado
    if (!isClient || !currentLaunchId) {
        return (
            <div className="flex justify-center items-center h-96">
                <FaSpinner className="animate-spin text-blue-500 text-5xl" />
            </div>
        );
    }

    return (
        // Container principal da página
        <div className="p-4 md:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
            <Toaster position="top-center" />

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
                    
                    <button onClick={() => handleInternalNavigate(`${basePath}/score`)} className={`flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                        <FaBullseye /> SCORE
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mql`)} className={`flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                        <FaChartBar /> MQL
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mov-diario`)} className={`flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}>
                        <FaCalendarDay /> Mov. Diário
                    </button>
                </nav>
            </div>
            {/* --- FIM DO CABEÇALHO COM ABAS --- */}
            
            {isLoadingData ? (
                <div className="flex justify-center items-center h-96">
                    <FaSpinner className="animate-spin text-blue-500 text-5xl" />
                </div>
            ) : (
                <main className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                    
                    {/* Coluna da Esquerda (Tabela - Ocupa 2 de 5 colunas em lg) */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg overflow-y-auto h-[35rem]">
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
                                        <td className="p-3 text-right font-bold text-white dark:text-white">{item.total_leads.toLocaleString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Coluna da Direita (Gráfico - Ocupa 3 de 5 colunas em lg) */}
                    <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-[35rem] flex flex-col">
                    <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgb(107 114 128 / 0.5)" />
                                <XAxis type="number" stroke="rgb(107 114 128 / 1)" />
                                <YAxis type="category" dataKey="name" width={150} stroke="rgb(107 114 128 / 1)" tick={{ fontSize: 12 }} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(243, 244, 246, 0.5)'}} 
                                    contentStyle={{ 
                                        backgroundColor: 'rgb(31 41 55 / 1)', // dark:bg-gray-800
                                        border: '1px solid rgb(55 65 81 / 1)', // dark:border-gray-700
                                        borderRadius: '8px',
                                        color: 'rgb(209 213 219 / 1)' // dark:text-gray-300
                                    }} 
                                />
                                <Bar dataKey="Leads" fillKey="fill" radius={[0, 4, 4, 0]} />
                            </BarChart>
                    </ResponsiveContainer>
                    </div>
                </main>
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