// src/app/(main)/Dashboards/perpetuo/insights-dinamicos/page.jsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Lightbulb } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7c7c'];

// Componente de Card Gráfico
const ChartCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-80">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
            {Icon && <Icon size={18} className="text-blue-500" />}
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200 line-clamp-1" title={title}>{title}</h3>
        </div>
        <div className="flex-1 w-full min-w-0 relative">
            {children}
        </div>
    </div>
);

export default function InsightsDinamicosPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent, selectedLaunch, setSelectedLaunch } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [dynamicData, setDynamicData] = useState([]);

    // 1. Busca Lançamentos
    useEffect(() => {
        if (!userProfile) return;
        const fetchLaunches = async () => {
            const clientId = userProfile.role === 'admin' && selectedClientId === 'all' ? null : (userProfile.role === 'admin' ? selectedClientId : userProfile.cliente_id);
            try {
                const { data: res } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientId });
                if (res) {
                    const statusPermitidos = ['Em andamento', 'Concluido', 'Ativo'];
                    const perpetuos = res.filter(l => l.modalidade === 'PERPETUO' && statusPermitidos.some(s => l.status?.toLowerCase() === s.toLowerCase())).sort((a,b) => a.nome.localeCompare(b.nome));
                    setLaunches(perpetuos);
                    if (selectedLaunch && !perpetuos.find(l => l.id === selectedLaunch)) setSelectedLaunch('');
                }
            } catch (err) { console.error(err); }
        };
        fetchLaunches();
    }, [selectedClientId, userProfile]);

    // 2. Configura Header
    useEffect(() => {
        const launchSelector = (
            <select 
                value={selectedLaunch} 
                onChange={(e) => setSelectedLaunch(e.target.value)}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs rounded focus:ring-blue-500 focus:border-blue-500 block w-64 p-1.5"
                disabled={launches.length === 0}
            >
                <option value="">Selecione...</option>
                {launches.map(l => (
                    <option key={l.id} value={l.id}>
                        {l.codigo} ({l.status || 'Ativo'})
                    </option>
                ))}
            </select>
        );
        setHeaderContent({ title: 'Insights Dinâmicos', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches]);

    // 3. Busca Dados Dinâmicos
    useEffect(() => {
        if (!selectedLaunch) {
            setDynamicData([]);
            return;
        }
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: resDynamic } = await supabase.rpc('get_dynamic_avatar_questions', { p_launch_id: selectedLaunch });
                setDynamicData(resDynamic || []);
            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar insights");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedLaunch]);

    if (!selectedLaunch) return <div className="flex flex-col items-center justify-center h-96 text-gray-500 text-sm"><Lightbulb size={48} className="opacity-20 mb-2"/><p>Selecione um lançamento para ver os insights.</p></div>;
    if (isLoading) return <div className="flex items-center justify-center h-96 text-blue-500"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>Carregando...</div>;

    if (dynamicData.length === 0) return <div className="flex flex-col items-center justify-center h-96 text-gray-500 text-sm"><Lightbulb size={48} className="opacity-20 mb-2"/><p>Nenhum dado adicional encontrado neste lançamento.</p></div>;

    return (
        <div className="p-4 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <Toaster position="top-right" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dynamicData.map((chart, idx) => (
                    <ChartCard key={idx} title={chart.title} icon={Lightbulb}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chart.data} layout="vertical" margin={{ left: 0, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="value" name="Respostas" fill={COLORS[idx % COLORS.length]} radius={[0, 4, 4, 0]} barSize={18} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartCard>
                ))}
            </div>
        </div>
    );
}