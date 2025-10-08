// src/app/(main)/Dashboards/traqueamento/detalhe-organico/mql/page.jsx
'use client';

// Imports e configs são os mesmos da versão de "MQL" do tráfego pago...
import { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft, FaAward, FaStar, FaRegStar, FaStarHalfAlt } from 'react-icons/fa';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MQL_CONFIG = {
  A: { title: "Categoria A", range: "(20+)", icon: FaAward, color: "text-amber-400" },
  B: { title: "Categoria B", range: "(14-19)", icon: FaStar, color: "text-lime-400" },
  C: { title: "Categoria C", range: "(6-13)", icon: FaStarHalfAlt, color: "text-cyan-400" },
  D: { title: "Categoria D", range: "(1-5)", icon: FaRegStar, color: "text-slate-400" },
};
const CHART_COLORS = ['#f59e0b', '#84cc16', '#22d3ee', '#64748b', '#8884d8', '#da84d8', '#82ca9d', '#ffc658', '#a4de6c', '#d0ed57'];

function summarizeChartData(data, limit = 15) {
    if (!data || data.length <= limit + 1) return data || [];
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const topItems = sortedData.slice(0, limit);
    const otherItems = sortedData.slice(limit);
    if (otherItems.length > 0) {
        const othersSum = otherItems.reduce((sum, item) => sum + item.value, 0);
        topItems.push({ name: 'Outros', value: othersSum });
    }
    return topItems;
}

const MqlBreakdownChart = ({ title, data }) => {
  const { theme } = useContext(AppContext);
  if (!data || data.length === 0) { return (<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center min-h-[450px]"><h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">{title}</h3><p className="text-gray-500 dark:text-slate-400">Nenhum dado para exibir.</p></div>); }
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg">
      <h3 className="text-xl font-bold text-gray-800 dark:text-white text-center mb-2">{title}</h3>
      <ResponsiveContainer width="100%" height={400}> 
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" nameKey="name">{data.map((entry, index) => (<Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />))}</Pie>
          <Tooltip contentStyle={theme === 'dark' ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#d1d5db' } : { backgroundColor: '#ffffff', border: '1px solid #e5e7eb' }}/>
          <Legend wrapperStyle={{ paddingTop: '20px', color: theme === 'dark' ? '#d1d5db' : '#4b5563' }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

function MqlPageContent() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, setHeaderContent } = useContext(AppContext);
  const launchId = searchParams.get('launchId');
  const launchName = searchParams.get('launchName');
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    setHeaderContent({
        title: 'Dashboard de Traqueamento',
        controls: (<button onClick={() => router.back()} className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"><FaChevronLeft size={14} /> Voltar</button>)
    });
    return () => setHeaderContent({ title: '', controls: null });
  }, [setHeaderContent, router]);

  const fetchData = useCallback(async (id) => {
    if (!userProfile) return;
    setIsLoading(true);
    try {
      const clientIdToSend = userProfile.role === 'admin' ? null : userProfile.cliente_id;
      // --- ALTERAÇÃO: Chama a função SQL de MQL ORGÂNICO ---
      const { data: result, error } = await supabase.rpc('get_organic_mql_breakdown_by_medium', { 
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
    if (launchId) {
      fetchData(launchId);
    } else if (userProfile) {
      router.push('/Dashboards/traqueamento');
    }
  }, [launchId, fetchData, router, userProfile]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Análise de MQL - Tráfego Orgânico</p>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{launchName || 'MQL'}</h1>

      {isLoading ? ( <div className="flex justify-center items-center h-96"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>
      ) : !data || !data.totals ? ( <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">Nenhum dado de MQL para este lançamento.</div>
      ) : (
        <main>
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {Object.keys(MQL_CONFIG).map(key => {
              const config = MQL_CONFIG[key];
              const total = data?.totals?.[key] ?? 0;
              return (
                <div key={key} className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-lg flex items-center gap-4">
                  <config.icon className={`${config.color} text-4xl flex-shrink-0`} />
                  <div><h2 className="text-lg font-bold text-gray-800 dark:text-slate-200">{config.title}</h2><p className="text-3xl font-bold text-gray-900 dark:text-white">{total}</p><p className="text-sm text-gray-500 dark:text-slate-400">Total de Leads</p></div>
                </div>);
            })}
          </section>
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             {Object.keys(MQL_CONFIG).map(key => (<MqlBreakdownChart key={key} title={`${MQL_CONFIG[key].title} ${MQL_CONFIG[key].range}`} data={summarizeChartData(data?.breakdowns?.[key])} />))}
          </section>
        </main>
      )}
    </div>
  );
}

export default function MqlOrganicoPage() {
    return (
        <Suspense fallback={<div className="min-h-screen w-full flex justify-center items-center"><FaSpinner className="animate-spin text-blue-500 text-5xl" /></div>}>
            <MqlPageContent />
        </Suspense>
    );
}