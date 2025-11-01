// /src/app/(main)/Dashboards/traqueamento/detalhe-pago/mov-diario/page.jsx
'use client';

import { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft, FaBullseye, FaChartBar, FaCalendarDay } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import toast, { Toaster } from 'react-hot-toast'; 

// Importações dinâmicas
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

const DailyMovementChart = ({ data }) => {
    const { theme } = useContext(AppContext); // Usando o tema do Contexto

    if (data.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center h-[40rem]">
                <p className="text-gray-500 dark:text-slate-400">Nenhum dado de movimento diário para exibir.</p>
            </div>
        );
    }

    const formattedData = data.map(item => ({
        ...item,
        // Formato DD/MM
        dateFormatted: new Date(item.movement_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
    }));

    // Função Customizada de Label para Eixos X e Y
    const getAxisStrokeColor = () => theme === 'dark' ? '#d1d5db' : '#4b5563'; // gray-300 ou gray-700
    const getGridStrokeColor = () => theme === 'dark' ? '#374151' : '#e5e7eb'; // gray-700 ou gray-200

    return (
        // --- CORREÇÃO 3 (ALERTAS) ---
        // Adicionando h-[40rem] (640px) e flex flex-col para o contêiner
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-[40rem] flex flex-col">
            {/* --- CORREÇÃO 3 (ALERTAS) ---
              * Mudando height={640} para height="100%"
            */}
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={formattedData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={getGridStrokeColor()} />
                    {/* Ajuste de stroke para visibilidade no dark mode */}
                    <XAxis dataKey="dateFormatted" stroke={getAxisStrokeColor()} tick={{ fill: getAxisStrokeColor() }} />
                    <YAxis stroke={getAxisStrokeColor()} tick={{ fill: getAxisStrokeColor() }} />
                    <Tooltip
                        contentStyle={
                            theme === 'dark'
                            ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#d1d5db' }
                            : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }
                        }
                        labelStyle={{ color: getAxisStrokeColor() }}
                        formatter={(value) => value.toLocaleString('pt-BR')}
                    />
                    <Legend wrapperStyle={{ color: getAxisStrokeColor(), paddingTop: '10px' }} />
                    <Bar dataKey="leads_count" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} /> 
                    <Bar dataKey="checkins_count" name="Check-ins" fill="#22c55e" radius={[4, 4, 0, 0]} /> 
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

function MovDiarioPageContent() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const { userProfile, setHeaderContent } = useContext(AppContext);
    
    // Leitura do Contexto do sessionStorage para URL limpa
    const [launchId, setLaunchId] = useState(null);
    const [launchName, setLaunchName] = useState(null);
    
    // --- CORREÇÃO 1 (PISCANDO) ---
    // Adiciona estado 'isClient' para evitar renderização/redirecionamento no lado do servidor
    const [isClient, setIsClient] = useState(false);
    
    const basePath = "/Dashboards/traqueamento/detalhe-pago";

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Efeito para carregar o ID e Nome do SessionStorage na montagem do componente
    useEffect(() => {
        // --- CORREÇÃO 1 (PISCANDO) ---
        setIsClient(true); // Marca que estamos no cliente

        if (typeof window !== 'undefined') {
            const storedId = sessionStorage.getItem('currentDetailLaunchId');
            const storedName = sessionStorage.getItem('currentDetailLaunchName');
            
            if (storedId) {
                setLaunchId(storedId);
                setLaunchName(storedName);
            } else {
                // Se não houver ID, redireciona para a página principal
                // (só redireciona se não estiver carregando e for cliente)
                setIsLoading(false); // Para o loading se não houver ID
            }
        }
    }, []); // Roda apenas uma vez

    // Efeito para o Header e redirecionamento seguro
    useEffect(() => {
        // --- CORREÇÃO 1 (PISCANDO) ---
        // Só redireciona se:
        // 1. Estiver no cliente (isClient)
        // 2. Não estiver carregando (isLoading)
        // 3. Não tiver launchId
        if (isClient && !isLoading && !launchId && userProfile) {
             router.push('/Dashboards/traqueamento');
        }

        // --- CORREÇÃO 2 (HEADER) ---
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
    // Adiciona 'isClient' e 'userProfile' às dependências
    }, [setHeaderContent, launchName, launchId, isLoading, isClient, router, userProfile]);

    // --- CORREÇÃO 5 (BOTÃO VOLTAR) ---
    const handleVoltar = () => {
        // Navega para o 'basePath' (detalhe-pago) em vez de 'traqueamento'
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
        if(!userProfile) return;
        setIsLoading(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
            const { data: result, error } = await supabase.rpc('get_paid_traffic_daily_movement', {
                p_launch_id: id,
                p_client_id: clientIdToSend
            });
            if (error) throw error;
            setData(result || []);
        } catch (err) {
            console.error("Erro ao carregar movimento diário pago:", err);
            toast.error("Falha ao carregar dados. Verifique o console.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userProfile]);

    useEffect(() => {
        if (launchId) {
            fetchData(launchId);
        }
        // A lógica de redirecionamento foi movida para o useEffect do Header
    }, [launchId, fetchData]);

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <Toaster position="top-center" />

            {/* --- CABEÇALHO DA PÁGINA (Título e Navegação) --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col">
                    <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">MOVIMENTO DIÁRIO</p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{launchName || 'Carregando...'}</h1>
                </div>

                {/* BOTÕES DE NAVEGAÇÃO E VOLTAR */}
                <nav className="flex flex-wrap items-center gap-3">
                    {/* Botão voltar corrigido */}
                    <button onClick={handleVoltar} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100">
                        <FaChevronLeft /> Voltar
                    </button>
                    
                    <button onClick={() => handleInternalNavigate(`${basePath}/score`)} disabled={!launchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaBullseye /> SCORE
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mql`)} disabled={!launchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 disabled:opacity-50">
                        <FaChartBar /> MQL
                    </button>
                    <button onClick={() => handleInternalNavigate(`${basePath}/mov-diario`)} disabled={!launchId} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white shadow-md hover:bg-blue-600 disabled:opacity-50">
                        <FaCalendarDay /> Mov. Diário
                    </button>
                </nav>
            </div>

            {/* --- CONTEÚDO PRINCIPAL (Loading/Dados/Vazio) --- */}
            {/* Adiciona verificação 'isClient' para evitar o "pisca" */}
            {isLoading || !launchId || !isClient ? (
                <div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>
            ) : (
                <main>
                    <DailyMovementChart data={data} />
                </main>
            )}
        </div>
    );
}

export default function MovDiarioPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
            <MovDiarioPageContent />
        </Suspense>
    );
}
