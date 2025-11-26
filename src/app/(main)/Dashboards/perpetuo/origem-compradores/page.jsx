// src/app/(main)/Dashboards/perpetuo/origem-compradores/page.jsx
'use client';

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Filter, PieChart as PieIcon, List, Users, TrendingUp, Target, AlertCircle } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// Componente de Badge (Etiqueta colorida)
const TrafficBadge = ({ type }) => {
    let style = "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
    if (type === 'Pago') style = "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800";
    if (type === 'Orgânico') style = "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
    if (type === 'Não Traqueado') style = "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700";
    
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${style}`}>
            {type}
        </span>
    );
};

// Componente de Card de KPI (Números grandes)
const KpiCard = ({ title, value, subtext, icon: Icon, color = "blue" }) => {
    const colors = {
        blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
        green: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20",
        purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
        orange: "text-orange-600 bg-orange-50 dark:bg-orange-900/20",
        gray: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-400",
    };
    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${colors[color] || colors.blue}`}>
                {Icon && <Icon size={24} />}
            </div>
            <div>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
                {subtext && <p className="text-xs text-gray-500 dark:text-gray-500">{subtext}</p>}
            </div>
        </div>
    );
};

export default function OrigemCompradoresPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent, selectedLaunch, setSelectedLaunch } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false);
    
    const [data, setData] = useState({ 
        kpis: { total_geral: 0 }, 
        fontes: [], 
        detalhado: [], 
        evolucao: [] 
    });

    // 1. Busca Lançamentos (Com Filtro de Status)
    useEffect(() => {
        if (!userProfile) return;
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            const clientId = userProfile.role === 'admin' && selectedClientId === 'all' ? null : (userProfile.role === 'admin' ? selectedClientId : userProfile.cliente_id);
            try {
                const { data: launchData, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientId });
                if (error) throw error;
                
                const listaSegura = Array.isArray(launchData) ? launchData : [];
                
                // FILTRO: Apenas Perpétuo E (Em andamento OU Concluido OU Ativo)
                const statusPermitidos = ['Em andamento', 'Concluido', 'Ativo'];
                
                const perpetuos = listaSegura.filter(l => 
                    l.modalidade === 'PERPETUO' && 
                    statusPermitidos.some(s => l.status?.toLowerCase() === s.toLowerCase())
                ).sort((a,b) => a.nome.localeCompare(b.nome));

                setLaunches(perpetuos);
                
                // Se o selecionado não estiver na lista, reseta
                if (selectedLaunch && !perpetuos.find(l => l.id === selectedLaunch)) {
                    setSelectedLaunch('');
                }
            } catch (err) {
                console.error(err);
                setLaunches([]);
            } finally {
                setIsLoadingLaunches(false);
            }
        };
        fetchLaunches();
    }, [selectedClientId, userProfile]);

    // 2. Configura o Header com o Dropdown Simplificado
    useEffect(() => {
        const listaSegura = Array.isArray(launches) ? launches : [];
        
        const launchSelector = (
            <select 
                value={selectedLaunch} 
                onChange={(e) => setSelectedLaunch(e.target.value)}
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-xs rounded focus:ring-blue-500 focus:border-blue-500 block w-64 p-1.5"
                disabled={isLoadingLaunches || listaSegura.length === 0}
            >
                {isLoadingLaunches ? <option>Carregando...</option> : (
                    <>
                        <option value="">Selecione...</option>
                        {listaSegura.length > 0 ? (
                            listaSegura.map(l => (
                                <option key={l.id} value={l.id}>
                                    {l.codigo} ({l.status || 'Ativo'})
                                </option>
                            ))
                        ) : (
                            <option disabled>Nenhum (Perpétuo)</option>
                        )}
                    </>
                )}
            </select>
        );
        setHeaderContent({ title: 'Origem e Desempenho', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches]);

    // 3. Busca Dados do Dashboard
    useEffect(() => {
        if (!selectedLaunch) { 
            setData({ kpis: { total_geral: 0 }, fontes: [], detalhado: [], evolucao: [] }); 
            return; 
        }

        const fetchData = async () => {
            setIsLoadingData(true);
            try {
                const { data: res, error } = await supabase.rpc('get_perpetuo_analytics', { p_launch_id: selectedLaunch });
                if (error) throw error;
                
                const safeRes = res || {};
                setData({
                    kpis: safeRes.kpis || { total_geral: 0 },
                    fontes: safeRes.fontes || [],
                    detalhado: safeRes.detalhado || [],
                    evolucao: safeRes.evolucao || []
                });
            } catch (err) {
                console.error(err);
                toast.error("Erro dados: " + err.message);
            } finally {
                setIsLoadingData(false);
            }
        };
        fetchData();
    }, [selectedLaunch]);

    // 4. Cálculos de KPI
    const kpiDerived = useMemo(() => {
        const total = data?.kpis?.total_geral || 0;
        const detalhado = data?.detalhado || [];
        
        // Soma os contadores baseados no tipo vindo da tabela detalhada para precisão
        const pago = detalhado.filter(f => f.traffic_type === 'Pago').reduce((a, b) => a + (b.qtd || 0), 0);
        const organico = detalhado.filter(f => f.traffic_type === 'Orgânico').reduce((a, b) => a + (b.qtd || 0), 0);
        const nao_traqueado = detalhado.filter(f => f.traffic_type === 'Não Traqueado').reduce((a, b) => a + (b.qtd || 0), 0);

        // Calcula participações (%)
        const sharePago = total > 0 ? ((pago / total) * 100).toFixed(0) : '0';
        const shareOrg = total > 0 ? ((organico / total) * 100).toFixed(0) : '0';
        const shareNaoTraq = total > 0 ? ((nao_traqueado / total) * 100).toFixed(0) : '0';

        return { total, pago, organico, nao_traqueado, sharePago, shareOrg, shareNaoTraq };
    }, [data]);

    // Dados para o Gráfico de Pizza (Top 6 Fontes)
    const pieData = (data?.fontes || []).slice(0, 6).map((f, index) => ({
        name: f.source,
        value: f.qtd,
        fill: COLORS[index % COLORS.length]
    }));

    // Renderização Condicional (Loading / Vazio)
    if (!selectedLaunch) return <div className="flex flex-col items-center justify-center h-96 text-gray-500 text-sm"><PieIcon size={48} className="opacity-20 mb-2"/><p>Selecione um lançamento Perpétuo acima.</p></div>;
    if (isLoadingData) return <div className="flex items-center justify-center h-96 text-blue-500 text-sm font-medium"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>Carregando análise...</div>;

    return (
        <div className="p-4 space-y-6 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <Toaster position="top-right" />

            {/* BLOCO 1: CARDS DE KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard title="Total de Compradores" value={kpiDerived.total.toLocaleString('pt-BR')} icon={Users} color="blue" />
                <KpiCard title="Tráfego Pago" value={kpiDerived.pago.toLocaleString('pt-BR')} subtext={`${kpiDerived.sharePago}% do total`} icon={Target} color="green" />
                <KpiCard title="Tráfego Orgânico" value={kpiDerived.organico.toLocaleString('pt-BR')} subtext={`${kpiDerived.shareOrg}% do total`} icon={TrendingUp} color="orange" />
                <KpiCard title="Não Traqueado (Direto)" value={kpiDerived.nao_traqueado.toLocaleString('pt-BR')} subtext={`${kpiDerived.shareNaoTraq}% do total`} icon={AlertCircle} color="gray" />
            </div>

            {/* BLOCO 2: GRÁFICOS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Gráfico de Pizza */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <PieIcon size={18} className="text-blue-500" />
                        <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">Share de Vendas (Top 6)</h3>
                    </div>
                    <div className="h-64 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={pieData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80} 
                                    innerRadius={50} 
                                    paddingAngle={2}
                                >
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Pie>
                                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gráfico de Barras */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
                        <Filter size={18} className="text-green-500" />
                        <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">Top Fontes (Volume)</h3>
                    </div>
                    <div className="h-64 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart 
                                data={(data?.fontes || []).slice(0, 8)} 
                                layout="vertical" 
                                margin={{ left: 0, right: 30, top: 10, bottom: 10 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.1} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="source" 
                                    type="category" 
                                    width={100} 
                                    tick={{fontSize: 11}} 
                                    interval={0}
                                />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                                <Bar dataKey="qtd" name="Vendas" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* BLOCO 3: TABELA DETALHADA */}
            <section className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                    <List size={18} className="text-purple-500" />
                    <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">Detalhamento de Tráfego</h3>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Fonte</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Tipo</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Campanha</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider">Conteúdo</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider text-right">Compradores</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 tracking-wider text-right">% Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs sm:text-sm">
                            {(data?.detalhado || []).length > 0 ? data.detalhado.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white truncate max-w-[120px]" title={row.source}>{row.source}</td>
                                    <td className="px-4 py-3"><TrafficBadge type={row.traffic_type} /></td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 truncate max-w-[150px]" title={row.campaign}>{row.campaign}</td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 truncate max-w-[150px]" title={row.content}>{row.content}</td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-800 dark:text-white">{row.qtd}</td>
                                    <td className="px-4 py-3 text-right text-gray-500">
                                        {data.kpis.total_geral > 0 ? ((row.qtd / data.kpis.total_geral) * 100).toFixed(1) : 0}%
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="6" className="text-center py-8 text-gray-400">Nenhum dado encontrado.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}