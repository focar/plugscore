// /src/app/(main)/Dashboards/traqueamento/detalhe-organico/score/page.jsx
'use client';

import React, { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext'; 
import { FaSpinner, FaChevronLeft, FaThermometerFull, FaThermometerThreeQuarters, FaThermometerHalf, FaThermometerEmpty, FaBullseye, FaChartBar, FaCalendarDay } from 'react-icons/fa';
import dynamic from 'next/dynamic';
import toast, { Toaster } from 'react-hot-toast';

// Lazy load dos componentes do Recharts
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

const CHART_COLORS = ['#9333ea', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#22c55e', '#14b8a6'];

function summarizeChartData(data, limit = 6) {
  if (!data || data.length === 0) return [];
  const validData = data.filter(item => item && item.value > 0);
  let finalData;
  if (validData.length <= limit) {
      finalData = validData;
  } else {
      const sortedData = [...validData].sort((a, b) => b.value - a.value);
      const topItems = sortedData.slice(0, limit);
      const others = sortedData.slice(limit);
      const othersSum = others.reduce((sum, item) => sum + item.value, 0);
      finalData = topItems;
      if (othersSum > 0) finalData.push({ name: 'Outros', value: othersSum });
  }
  return finalData.map((item, index) => ({
      ...item,
      fill: CHART_COLORS[index % CHART_COLORS.length]
  }));
}

const ScoreBreakdownChart = ({ title, data }) => {
  const { theme } = useContext(AppContext);
  const chartDataRaw = (data || [])
    .map(item => ({ name: item.name || '(Não Definido)', value: item.value || 0 }))
    .filter(item => item.value > 0); 

  const chartData = summarizeChartData(chartDataRaw, 6);
  const hasData = chartData.length > 0;
  
  if (!hasData) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[450px]">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 text-center">{title}</h3>
        <p className="text-gray-500 dark:text-slate-400">Nenhum detalhe de tráfego orgânico para esta categoria.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg min-h-[450px] flex flex-col">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name" fillKey="fill">
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.name}`} stroke={theme === 'dark' ? '#1f2937' : '#ffffff'} strokeWidth={3} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={theme === 'dark' ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#d1d5db' } : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}
            itemStyle={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={(value) => (<span style={{ color: theme === 'dark' ? '#d1d5db' : '#4b5563' }}>{value}</span>)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

function ScorePageContent() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const { userProfile, setHeaderContent } = useContext(AppContext);

  const [launchId, setLaunchId] = useState(null);
  const [launchName, setLaunchName] = useState(null);
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [isClient, setIsClient] = useState(false);

  const basePath = "/Dashboards/traqueamento/detalhe-organico";

  const handleVoltar = useCallback(() => { router.push(basePath); }, [router, basePath]);

  const handleInternalNavigate = (path) => {
      if (launchId) {
          sessionStorage.setItem('currentDetailLaunchId', launchId);
          sessionStorage.setItem('currentDetailLaunchName', launchName);
      }
      router.push(path);
  };

  useEffect(() => {
    const launchNameControl = (<span className="text-base font-semibold text-gray-700 dark:text-gray-200 pr-4">{launchName || 'Carregando...'}</span>);
    setHeaderContent({ title: 'Traqueamento de Trafego', controls: launchName ? launchNameControl : null }); 
    return () => setHeaderContent({ title: '', controls: null });
  }, [setHeaderContent, launchName]);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedId = sessionStorage.getItem('currentDetailLaunchId');
      const storedName = sessionStorage.getItem('currentDetailLaunchName');
      if (storedId) { setLaunchId(storedId); setLaunchName(storedName); } 
      else { setIsLoading(false); setFetchError(true); }
    }
  }, []);

  const fetchData = useCallback(async (id) => {
    if (!userProfile || !id) return;
    setIsLoading(true); setFetchError(false);
    try {
        const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
        const { data: result, error } = await supabase.rpc('get_organic_score_breakdown_by_medium', { p_launch_id: id, p_client_id: clientIdToSend });
        if (error) throw error;
        let fetchedData = Array.isArray(result) && result.length > 0 ? result[0] : result;
        if (fetchedData && fetchedData.totals && fetchedData.breakdowns) {
            setData(fetchedData);
        } else {
            setData(null);
        }
    } catch (err) {
        console.error("Erro ao carregar dados:", err);
        toast.error("Falha ao carregar dados de Score.");
        setData(null);
    } finally { setIsLoading(false); }
  }, [supabase, userProfile]);

  useEffect(() => {
    if (launchId && userProfile && !fetchError) fetchData(launchId);
  }, [launchId, userProfile, fetchError, fetchData]);
  
  useEffect(() => {
      if (isClient && !isLoading && !launchId && userProfile) { router.push('/Dashboards/traqueamento'); }
  }, [isClient, isLoading, launchId, userProfile, router]);

  const hasData = data && ((data.totals && Object.values(data.totals).some(v => v > 0)));
    
  if (isLoading || !isClient || (fetchError && !data)) {
      return (<div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>);
  }
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Toaster position="top-center" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">ANÁLISE DE SCORE - TRÁFEGO ORGÂNICO</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{launchName || 'Carregando...'}</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleVoltar} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-100">
            <FaChevronLeft /> Voltar
          </button>
          <button onClick={() => handleInternalNavigate(`${basePath}/score`)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white shadow-md">
            <FaBullseye /> SCORE
          </button>
          <button onClick={() => handleInternalNavigate(`${basePath}/mql`)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300">
            <FaChartBar /> MQL
          </button>
          <button onClick={() => handleInternalNavigate(`${basePath}/mov-diario`)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300">
            <FaCalendarDay /> Mov. Diário
          </button>
        </div>
      </div>

      {!hasData ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          Nenhum dado de score encontrado para este lançamento.
        </div>
      ) : (
        <main>
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-10">
            {Object.entries(SCORE_CONFIG).map(([key, config]) => (
              <div key={key} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex items-center gap-4">
                <config.icon className={`${config.color} text-4xl flex-shrink-0`} />
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">{config.title}</h2>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{data?.totals?.[key] ?? 0}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Total de Leads</p>
                </div>
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {Object.entries(SCORE_CONFIG).map(([key, config]) => (
              <Suspense key={key} fallback={<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg min-h-[450px] flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-3xl" /></div>}>
                <ScoreBreakdownChart title={`${config.title} ${config.range}`} data={data?.breakdowns?.[key] || []} />
              </Suspense>
            ))}
          </section>
        </main>
      )}
    </div>
  );
}

export default function ScoreOrganicoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
      <ScorePageContent />
    </Suspense>
  );
}