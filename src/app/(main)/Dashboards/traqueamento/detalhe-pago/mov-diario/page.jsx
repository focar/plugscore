// src/app/(main)/Dashboards/traqueamento/detalhe-pago/mov-diario/page.jsx
'use client';

import { useState, useEffect, useCallback, Suspense, useContext } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import { FaSpinner, FaChevronLeft } from 'react-icons/fa';
import dynamic from 'next/dynamic';

const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });

const DailyMovementChart = ({ data }) => {
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

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg h-[40rem]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={formattedData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis dataKey="dateFormatted" className="fill-gray-600 dark:fill-gray-400" />
          <YAxis className="fill-gray-600 dark:fill-gray-400" />
          <Tooltip
            contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                border: '1px solid #ccc',
                backdropFilter: 'blur(5px)'
            }}
             wrapperClassName="dark"
          />
          <Legend />
          <Bar dataKey="leads_count" name="Leads" fill="#3b82f6" />
          <Bar dataKey="checkins_count" name="Check-ins" fill="#22c55e" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

function MovDiarioPageContent() {
  const supabase = createClientComponentClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userProfile, setHeaderContent } = useContext(AppContext);
  const launchId = searchParams.get('launchId');
  const launchName = searchParams.get('launchName');

  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setHeaderContent({
        title: 'Dashboard de Traqueamento',
        controls: (
            <button onClick={() => router.back()} className="flex-shrink-0 flex items-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <FaChevronLeft size={14} /> Voltar
            </button>
        )
    });
    return () => setHeaderContent({ title: '', controls: null });
  }, [setHeaderContent, router]);

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
      <p className="text-sm text-gray-500 dark:text-slate-400 uppercase tracking-wider">Movimento Diário - Tráfego Pago</p>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">{launchName || 'Movimento Diário'}</h1>

      {isLoading ? (
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