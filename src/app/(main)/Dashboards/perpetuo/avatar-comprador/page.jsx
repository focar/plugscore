// src/app/(main)/Dashboards/perpetuo/avatar-comprador/page.jsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { 
    PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { MapPin, Users, Heart, Baby, UserCircle, Wallet, Clock } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ff7c7c'];

// Componente para a Análise Descritiva (Resumo)
const SummaryCard = ({ status, resumo }) => {
    const getStatusStyle = (st) => {
        const s = st?.toLowerCase() || '';
        if (s.includes('andamento') || s.includes('ativo')) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300';
        if (s.includes('concluido') || s.includes('encerrado')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300';
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    };

    // Proteção contra resumo nulo
    const safeResumo = resumo || { genero: 'N/D', idade: 'N/D', estado: 'N/D' };
    const hasResumoData = safeResumo.genero !== 'N/D' && safeResumo.idade !== 'N/D';

    return (
        <div className="bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-gray-800/50 p-6 rounded-xl shadow-sm border border-blue-100/50 dark:border-gray-700 mb-6 flex flex-col sm:flex-row items-start gap-5">
            <div className="bg-white dark:bg-gray-700 p-4 rounded-full shadow-sm hidden sm:block">
                <UserCircle size={40} className="text-blue-500 dark:text-blue-400" strokeWidth={1.5} />
            </div>
            <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Perfil Predominante do Comprador</h2>
                    {status && (
                        <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md tracking-wide ${getStatusStyle(status)}`}>
                            {status}
                        </span>
                    )}
                </div>
                
                {hasResumoData ? (
                    <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
                        Com base na análise dos dados identificados, seu principal avatar é 
                        <strong className="text-blue-700 dark:text-blue-300 font-bold"> {safeResumo.genero}</strong>, 
                        está na faixa etária de <strong className="text-blue-700 dark:text-blue-300 font-bold">{safeResumo.idade} anos</strong>
                        {safeResumo.estado !== 'N/D' && (
                            <> e reside principalmente no estado de <strong className="text-blue-700 dark:text-blue-300 font-bold">{safeResumo.estado}</strong></>
                        )}.
                    </p>
                ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic text-sm">
                        Não há dados suficientes identificados para traçar um perfil descritivo predominante no momento.
                    </p>
                )}
            </div>
        </div>
    );
};

// Componente de Card Gráfico Genérico
const ChartCard = ({ title, icon: Icon, children }) => (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col h-80">
        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 dark:border-gray-700">
            {Icon && <Icon size={18} className="text-blue-500" />}
            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">{title}</h3>
        </div>
        <div className="flex-1 w-full min-w-0 relative">
            {children}
        </div>
    </div>
);

export default function AvatarCompradorPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent, selectedLaunch, setSelectedLaunch } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [data, setData] = useState({ 
        status: null,
        resumo: { genero: 'N/D', idade: 'N/D', estado: 'N/D' },
        geo: [], genero: [], idade: [], civil: [], pagamento: [], tempo: []
    });

    // 1. Busca Lançamentos
    useEffect(() => {
        if (!userProfile) return;
        const fetchLaunches = async () => {
            const clientId = userProfile.role === 'admin' && selectedClientId === 'all' ? null : (userProfile.role === 'admin' ? selectedClientId : userProfile.cliente_id);
            
            try {
                const { data: res } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientId });
                if (res) {
                    const statusPermitidos = ['Em andamento', 'Concluido', 'Ativo'];
                    const perpetuos = res.filter(l => 
                        l.modalidade === 'PERPETUO' && 
                        statusPermitidos.some(s => l.status?.toLowerCase() === s.toLowerCase())
                    ).sort((a,b) => a.nome.localeCompare(b.nome));

                    setLaunches(perpetuos);
                    
                    if (selectedLaunch && !perpetuos.find(l => l.id === selectedLaunch)) {
                        setSelectedLaunch('');
                    }
                }
            } catch (err) {
                console.error(err);
                toast.error("Erro ao listar lançamentos");
            }
        };
        fetchLaunches();
    }, [selectedClientId, userProfile]);

    // 2. Header
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
        setHeaderContent({ title: 'Avatar do Comprador', controls: launchSelector });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent, selectedLaunch, launches]);

    // 3. Busca Dados (COM BLINDAGEM DE ERRO)
    useEffect(() => {
        if (!selectedLaunch) {
            setData({ status: null, resumo: {}, geo: [], genero: [], idade: [], civil: [], pagamento: [], tempo: [] });
            return;
        }
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const { data: res, error } = await supabase.rpc('get_perpetuo_avatar', { p_launch_id: selectedLaunch });
                if (error) throw error;
                
                // BLINDAGEM: Se vier nulo do banco, usa array vazio para não quebrar o .map
                const safeRes = res || {};
                setData({
                    status: safeRes.status || null,
                    resumo: safeRes.resumo || { genero: 'N/D', idade: 'N/D', estado: 'N/D' },
                    geo: safeRes.geo || [],
                    genero: safeRes.genero || [],
                    idade: safeRes.idade || [],
                    civil: safeRes.civil || [],
                    pagamento: safeRes.pagamento || [],
                    tempo: safeRes.tempo || []
                });
            } catch (err) {
                console.error(err);
                toast.error("Erro ao carregar avatar");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [selectedLaunch]);

    if (!selectedLaunch) return <div className="flex flex-col items-center justify-center h-96 text-gray-500 text-sm"><Users size={48} className="opacity-20 mb-2"/><p>Selecione um lançamento para ver o perfil.</p></div>;
    if (isLoading) return <div className="flex items-center justify-center h-96 text-blue-500"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-2"></div>Carregando...</div>;

    const hasChartData = (data.geo && data.geo.length > 0);

    if (!hasChartData) return <div className="flex flex-col items-center justify-center h-96 text-gray-500 text-sm"><Users size={48} className="opacity-20 mb-2"/><p>Ainda não há dados de perfil processados para este lançamento.</p></div>;

    return (
        <div className="p-4 space-y-6 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <Toaster position="top-right" />

            <SummaryCard status={data.status} resumo={data.resumo} />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* 1. GÊNERO */}
                <ChartCard title="Gênero" icon={Users}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data.genero} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={70} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                {data.genero.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.nome === 'Não Informado' ? '#94a3b8' : COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{fontSize: '11px'}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 2. ESTADO CIVIL */}
                <ChartCard title="Estado Civil" icon={Heart}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data.civil} dataKey="valor" nameKey="nome" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={2} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                {data.civil.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.nome === 'N/I' ? '#94a3b8' : COLORS[(index + 2) % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{fontSize: '11px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 3. MEIO DE PAGAMENTO (PROTEGIDO) */}
                <ChartCard title="Meio de Pagamento" icon={Wallet}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data.pagamento || []} dataKey="valor" nameKey="nome" cx="50%" cy="50%" outerRadius={70}>
                                {(data.pagamento || []).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[(index + 4) % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{fontSize: '11px'}} />
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 4. TEMPO QUE CONHECE (PROTEGIDO) */}
                <ChartCard title="Tempo que Conhece" icon={Clock}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.tempo || []} layout="vertical" margin={{ left: 0, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="nome" type="category" width={90} tick={{fontSize: 10}} />
                            <Tooltip />
                            <Bar dataKey="valor" name="Pessoas" fill="#8884d8" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 5. FAIXA ETÁRIA */}
                <ChartCard title="Faixa Etária" icon={Baby}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.idade} margin={{top: 10, bottom: 20}}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                            <XAxis dataKey="nome" tick={{fontSize: 10}} interval={0} angle={-25} textAnchor="end" height={60} />
                            <YAxis hide />
                            <Tooltip />
                            <Bar dataKey="valor" name="Pessoas" fill="#82ca9d" radius={[4, 4, 0, 0]}>
                                {data.idade.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.nome === 'N/I' ? '#94a3b8' : '#82ca9d'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

                {/* 6. GEOGRAFIA */}
                <ChartCard title="Top Estados" icon={MapPin}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.geo.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 30, top: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.2} />
                            <XAxis type="number" hide />
                            <YAxis dataKey="nome" type="category" width={30} tick={{fontSize: 11, fontWeight: 500}} />
                            <Tooltip />
                            <Bar dataKey="valor" name="Compradores" fill="#0088FE" radius={[0, 4, 4, 0]} barSize={18} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>

            </div>
        </div>
    );
}