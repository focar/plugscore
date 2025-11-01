// /src/app/(main)/Dashboards/traqueamento/detalhe-nao-traqueado/page.jsx
'use client';

import { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft, FaQuestionCircle } from 'react-icons/fa'; // Adicionado FaQuestionCircle
// As importações do Recharts estão corretas, não são dinâmicas neste arquivo
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast, { Toaster } from 'react-hot-toast'; 

// Componente para o Gráfico de Movimento Diário
const DailyMovementChart = ({ data, theme }) => {
    if (data.length === 0) { 
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center h-[40rem]">
                <p className="text-gray-500 dark:text-slate-400">Nenhum dado de movimento diário para exibir.</p>
            </div>
        );
    }
    
    const formattedData = data.map(item => ({
        ...item,
        dateFormatted: new Date(item.movement_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }),
    }));

    // Corrigido para garantir contraste no modo escuro
    const getAxisColor = () => theme === 'dark' ? '#9ca3af' : '#4b5563'; // gray-400 / gray-600
    const getGridColor = () => theme === 'dark' ? '#374151' : '#e5e7eb'; // gray-700 / gray-200


    return (
        // --- CORREÇÃO 2 (ALERTAS) ---
        // Adicionado flex flex-col para garantir que o contêiner tenha altura
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-[40rem] flex flex-col">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={formattedData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke={getGridColor()} />
                    <XAxis dataKey="dateFormatted" stroke={getAxisColor()} />
                    <YAxis stroke={getAxisColor()} />
                    <Tooltip
                        contentStyle={
                            theme === 'dark' 
                            ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#d1d5db' } 
                            : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }
                        }
                        itemStyle={{ color: getAxisColor() }}
                    />
                    <Legend wrapperStyle={{ color: getAxisColor() }} />
                    {/* Cores Corrigidas: Leads (Roxo) e Check-ins (Ciano para contraste) */}
                    <Bar dataKey="leads_count" name="Leads" fill="#a855f7" radius={[4, 4, 0, 0]} /> 
                    <Bar dataKey="checkins_count" name="Check-ins" fill="#06b6d4" radius={[4, 4, 0, 0]} /> {/* Ciano (#06b6d4) para alto contraste */}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

function DetalheNaoTraqueadoContent() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const { userProfile, setHeaderContent, theme } = useContext(AppContext);

    // --- CORREÇÃO 1 ("PISCANDO") ---
    // Mudar de const para state para evitar "pisca"
    const [launchId, setLaunchId] = useState(null);
    const [launchName, setLaunchName] = useState(null);
    const [isClient, setIsClient] = useState(false); // Estado de controle

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const handleVoltar = useCallback(() => {
        if (launchId) sessionStorage.setItem('persistLaunchId', launchId);
        // Esta página é o último nível, o "Voltar" leva para a página principal
        router.push('/Dashboards/traqueamento');
    }, [launchId, router]);

    // --- CORREÇÃO 1 ("PISCANDO") ---
    // Efeito para ler o sessionStorage
    useEffect(() => {
        setIsClient(true);
        const storedId = sessionStorage.getItem('currentDetailLaunchId');
        const storedName = sessionStorage.getItem('currentDetailLaunchName');
        
        if (storedId) {
            setLaunchId(storedId);
            setLaunchName(storedName);
        } else {
            setIsLoading(false); // Para o loading
        }
    }, []);


    // --- CORREÇÃO 1 (HEADER) ---
    // Efeito para sincronizar Header e redirecionar se não houver ID
    useEffect(() => {
        // Redireciona se não houver ID (lógica de "pisca")
        if (isClient && !isLoading && !launchId && userProfile) {
            router.push('/Dashboards/traqueamento');
        }

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
    }, [setHeaderContent, launchName, launchId, isLoading, isClient, userProfile, router]); // Adicionadas dependências

    const fetchData = useCallback(async (id) => {
        if (!userProfile) return;
        setIsLoading(true);
        try {
            const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
            // RPC Corrigida para buscar dados de Não Traqueado
            const { data: result, error } = await supabase.rpc('get_untracked_traffic_daily_movement', { 
                p_launch_id: id,
                p_client_id: clientIdToSend
            });
            if (error) throw error;
            setData(result || []);
        } catch (err) {
            console.error("Erro ao carregar mov. diário não traqueado:", err);
            toast.error("Falha ao carregar dados. Verifique o console.");
        } finally {
            setIsLoading(false);
        }
    }, [supabase, userProfile]);

    useEffect(() => {
        if (launchId && userProfile) { // Adicionado userProfile
            fetchData(launchId);
        }
    }, [launchId, fetchData, userProfile]); // Adicionado userProfile

    // --- CORREÇÃO 1 ("PISCANDO") ---
    // Não renderiza nada até o cliente ser verificado e o ID carregado
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
            
            {/* --- Novo layout com botão Voltar no corpo da página --- */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div className="flex flex-col">
                    <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Movimento Diário - Tráfego Não Traqueado</p>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{launchName || 'Carregando...'}</h1>
                </div>

                {/* BOTÃO VOLTAR REPLICADO */}
                <button onClick={handleVoltar} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100">
                    <FaChevronLeft /> Voltar
                </button>
            </div>
            {/* --- Fim do Novo Layout --- */}

            <div className="flex items-center gap-4 mb-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md w-fit">
                <FaQuestionCircle className="text-purple-500" size={32} />
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Estes dados representam leads cujo UTM de origem não pôde ser identificado.
                </p>
            </div>

            {/* O loading é tratado no início do componente */}
            <main>
                <DailyMovementChart data={data} theme={theme} />
            </main>
        </div>
    );
}

export default function MovDiarioNaoTraqueadoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
            <DetalheNaoTraqueadoContent />
        </Suspense>
    );
}
