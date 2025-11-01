// /src/app/(main)/Dashboards/traqueamento/detalhe-organico/mov-diario/page.jsx
'use client';

import { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useRouter } from 'next/navigation'; // Removido useSearchParams
// import Link from 'next/link'; // REMOVIDO: Usaremos botões
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft, FaChartBar, FaBullseye, FaCalendarDay } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import toast, { Toaster } from 'react-hot-toast'; 
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';


// Importações dinâmicas
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

// --- CORREÇÃO: Voltando ao componente de gráfico original (que funcionava) ---
const DailyMovementChart = ({ data, launchName }) => {
  const { theme } = useContext(AppContext);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center h-[500px]">
        <p className="text-gray-500 dark:text-slate-400">Nenhum dado de movimento diário para o lançamento {launchName}.</p>
      </div>
    );
  }
  
  // Formata a data para exibição no eixo X (ex: 20/Out)
  const formatXAxis = (tickItem) => {
    if (!tickItem) return '';
    try {
      // Usando a lógica original (new Date) que é mais robusta para datas do Supabase
      const date = new Date(tickItem);
      // Adicionando verificação de data válida
      if (!isValid(date)) return tickItem;
      return format(date, 'dd/MMM', { locale: ptBR });
    } catch (e) {
      return tickItem;
    }
  };

  // Formata o label do Tooltip
  const formatTooltipLabel = (label) => {
     if (!label) return '';
    try {
      const date = new Date(label);
      if (!isValid(date)) return label;
      return format(date, 'EEEE, dd/MM/yyyy', { locale: ptBR });
    } catch (e) {
      return label;
    }
  };

  // Estilo dos tooltips
  const tooltipStyle = theme === 'dark' 
    ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#d1d5db' }
    : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb', color: '#4b5563' };

  
  return (
    // Revertido para o div original (sem flex-col, sem min-h)
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Movimento Diário de Leads Orgânicos</h2>
        
        {/* Revertido para height={450} - Isso vai gerar os alertas, mas vai RENDERIZAR o gráfico */}
        <ResponsiveContainer width="100%" height={450}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#374151' : '#f3f4f6'} />
                <XAxis 
                    dataKey="movement_date" 
                    tickFormatter={formatXAxis} 
                    stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} 
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 11 }}
                />
                <YAxis 
                    stroke={theme === 'dark' ? '#9ca3af' : '#4b5563'} 
                    tick={{ fill: theme === 'dark' ? '#9ca3af' : '#4b5563', fontSize: 11 }} 
                    allowDecimals={false}
                />
                <Tooltip 
                    contentStyle={tooltipStyle} 
                    labelFormatter={formatTooltipLabel} 
                />
                <Legend wrapperStyle={{ paddingTop: '10px', color: theme === 'dark' ? '#d1d5db' : '#4b5563' }} />
                <Bar dataKey="leads_count" name="Total de Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} /> 
                <Bar dataKey="checkins_count" name="Check-ins" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};
// --- FIM DA CORREÇÃO ---


function MovDiarioPageContent() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { userProfile, setHeaderContent } = useContext(AppContext);

  // --- 💡 LEITURA DO ESTADO INTERNO ---
  const [launchId, setLaunchId] = useState(null);
  const [launchName, setLaunchName] = useState(null);
  const basePath = "/Dashboards/traqueamento/detalhe-organico"; 

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Controle de "pisca" (isClient)
  const [isClient, setIsClient] = useState(false);

  // Botão "Voltar" (Corrigido para voltar ao 'basePath')
  const handleVoltar = useCallback(() => {
    router.push(basePath); 
  }, [router, basePath]);
  
  // Navegação interna (Corrigida)
  const handleInternalNavigate = (path) => {
      if (launchId) {
          sessionStorage.setItem('currentDetailLaunchId', launchId);
          sessionStorage.setItem('currentDetailLaunchName', launchName);
      }
      router.push(path);
  };


  // Efeito para carregar o ID e Nome do SessionStorage na montagem do componente
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
        const storedId = sessionStorage.getItem('currentDetailLaunchId');
        const storedName = sessionStorage.getItem('currentDetailLaunchName');
        
        if (storedId) {
            setLaunchId(storedId);
            setLaunchName(storedName);
        } else {
            setIsLoading(false); // Para o loading
            router.push('/Dashboards/traqueamento'); // Redireciona se não houver ID
        }
    }
  }, [router]);

  // Header (Corrigido)
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
  

  const fetchData = useCallback(async (id) => {
    if(!userProfile || !id) return;
    setIsLoading(true);
    try {
      const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
      const { data: result, error } = await supabase.rpc('get_organic_traffic_daily_movement', {
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
    if (launchId && userProfile) { // Adicionado userProfile
      fetchData(launchId);
    }
  }, [launchId, fetchData, userProfile]); // Adicionado userGProfile

  // Controle de "pisca"
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

       {/* --- CABEÇALHO DA PÁGINA COM ABAS E VOLTAR JUNTOS --- */}
       <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            
            {/* ITEM 1 (ESQUERDA): Título da Análise */}
            <div className="flex flex-col flex-shrink-0">
                <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">MOVIMENTO DIÁRIO - TRÁFEGO ORGÂNICO</p>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{launchName || 'Carregando...'}</h1>
            </div>

            {/* ITEM 2 (DIREITA): Abas + Voltar */}
            <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
                {/* Navegação Corrigida */}
                <nav className="flex flex-wrap items-center gap-2 sm:gap-4 w-full md:w-auto">
                    {/* SCORE (Inativo) */}
                    <button onClick={() => handleInternalNavigate(`${basePath}/score`)} className={`flex-1 sm:flex-none flex justify-center items-center gap-3 font-semibold px-4 py-3 rounded-lg shadow-md transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700`}>
                      <FaBullseye size={16} /> SCORE
                    </button>
                    
                    {/* MQL (Inativo) */}
                    <button onClick={() => handleInternalNavigate(`${basePath}/mql`)} className={`flex-1 sm:flex-none flex justify-center items-center gap-3 font-semibold px-4 py-3 rounded-lg shadow-md transition-colors bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700`}>
                      <FaChartBar size={16} /> MQL
                    </button>
                    
                    {/* Mov. Diário (Ativo) */}
                    <button onClick={() => handleInternalNavigate(`${basePath}/mov-diario`)} className={`flex-1 sm:flex-none flex justify-center items-center gap-3 font-semibold px-4 py-3 rounded-lg shadow-md transition-colors bg-blue-600 text-white cursor-default pointer-events-none`}>
                      <FaCalendarDay size={16} /> Mov. Diário
                    </button>
                </nav>
                
                {/* Botão Voltar (Corrigido) */}
                <button onClick={handleVoltar} className="flex-shrink-0 flex items-center justify-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <FaChevronLeft size={14} /> Voltar
                </button>
            </div>
       </div>
       {/* --- FIM DO CABEÇALHO --- */}

       {/* O loading é tratado no início do componente */}
       <main>
         <DailyMovementChart data={data} launchName={launchName} />
       </main>
    </div>
  );
}

export default function MovDiarioOrganicoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
            <MovDiarioPageContent />
        </Suspense>
    );
}

