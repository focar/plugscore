'use client';

import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { Users, UserCheck, Percent, Loader2 } from 'lucide-react'; // Adicionado Loader2
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Rectangle } from 'recharts'; // Adicionado Rectangle
import useMobileCheck from '@/hooks/useMobileCheck';
// Assumindo que ExpandableSourcesTable está no mesmo diretório ou em ./components/
import ExpandableSourcesTable from './components/ExpandableSourcesTable';

const TRAFFIC_TYPES = ['Todos', 'Pago', 'Orgânico', 'Não Traqueado'];

// --- Componentes ---
// *** CORREÇÃO: Fonte do valor reduzida para text-xl sm:text-2xl ***
const KpiCard = ({ title, value, icon: Icon }) => (
    // Padding p-2 sm:p-4
    <div className="bg-white dark:bg-gray-800 p-2 sm:p-4 rounded-lg shadow-sm text-center flex flex-col justify-center">
        {/* Ícone com tamanho responsivo */}
        <Icon className="mx-auto text-blue-500 dark:text-blue-400 mb-1 sm:mb-2 h-5 w-5 sm:h-6 sm:w-6" />
        {/* Valor com tamanho responsivo */}
        <p className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        {/* Título com tamanho responsivo */}
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">{title}</h3>
    </div>
);
const Spinner = () => <div className="flex justify-center items-center h-40"><Loader2 className="animate-spin text-blue-500" size={32} /></div>;


export default function CampanhasCriativosPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);
    const isMobile = useMobileCheck();

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [isLoadingData, setIsLoadingData] = useState(false); // Inicia como false
    const [flatData, setFlatData] = useState([]);
    const [masterSelectedCampaign, setMasterSelectedCampaign] = useState(null);
    const [trafficTypeFilter, setTrafficTypeFilter] = useState('Todos');

    // --- CORREÇÃO: Efeito para buscar lançamentos (com trava) ---
    useEffect(() => {
        if (!userProfile) return;
        
        const isAllClients = userProfile.role === 'admin' && selectedClientId === 'all';
        const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

        // Se "Todos os Clientes", limpa tudo e para
        if (isAllClients) {
            setLaunches([]); setSelectedLaunch(''); setIsLoadingLaunches(false);
            setFlatData([]); setIsLoadingData(false); setMasterSelectedCampaign(null);
            return;
        }

        // Busca lançamentos para cliente específico
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true); setFlatData([]); setIsLoadingData(true); setMasterSelectedCampaign(null);
            try {
                const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
                if (error) throw error;
                const sorted = [...(data || [])].sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome));
                setLaunches(sorted);
                setSelectedLaunch(''); // Não auto-seleciona
            } catch (err) {
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } finally {
                setIsLoadingLaunches(false);
                setIsLoadingData(false); // Para spinner principal
            }
        };
        fetchLaunches();
    }, [userProfile, selectedClientId, supabase]);

    // --- CORREÇÃO: Efeito para configurar o Header (com trava) ---
    useEffect(() => {
        const isClientSelected = !(userProfile?.role === 'admin' && selectedClientId === 'all');
        const isDisabled = isLoadingLaunches || !isClientSelected;

        const launchSelector = (
            <select 
                value={selectedLaunch} 
                onChange={e => { setSelectedLaunch(e.target.value); setMasterSelectedCampaign(null); }} 
                disabled={isDisabled} 
                // Estilo ajustado para consistência
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
            >
                {!isClientSelected ? (<option value="" disabled>Selecione um cliente</option>) 
                 : isLoadingLaunches ? (<option value="" disabled>Carregando...</option>) 
                 : launches.length === 0 ? (<option value="" disabled>Nenhum lançamento</option>) 
                 : (<option value="">Selecione um lançamento</option>)}
                {launches.map(l => <option key={l.id} value={l.id}>{l.codigo} ({l.status})</option>)}
            </select> 
        ); 
        setHeaderContent({ title: 'Análise de Campanhas e Criativos', controls: launchSelector }); 
        return () => setHeaderContent({ title: '', controls: null }); 
    }, [setHeaderContent, selectedLaunch, launches, isLoadingLaunches, userProfile, selectedClientId]);

    // --- CORREÇÃO: Busca principal de dados (com trava) ---
    const fetchData = useCallback(async () => { 
        // Só busca se um lançamento for selecionado
        if (!selectedLaunch || !userProfile) {
            setFlatData([]); setIsLoadingData(false); setMasterSelectedCampaign(null);
            return; 
        }
        setIsLoadingData(true); setMasterSelectedCampaign(null); 
        try { 
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id; 
            const { data, error } = await supabase.rpc('get_utm_performance_flat', { p_launch_id: selectedLaunch, p_client_id: clientIdToSend }); 
            if (error) throw error; 
            setFlatData(data || []); 
        } catch (err) { toast.error(`Erro ao carregar dados: ${err.message}`); setFlatData([]); } // Limpa dados em caso de erro
        finally { setIsLoadingData(false); } 
    // Depende apenas do selectedLaunch agora
    }, [selectedLaunch, supabase, userProfile, selectedClientId]);

    // Dispara a busca de dados quando o lançamento muda
    useEffect(() => { fetchData(); }, [fetchData]);

    // Filtra os dados com base no tipo de tráfego selecionado
    const filteredData = useMemo(() => {
        if (trafficTypeFilter === 'Todos') return flatData;
        return flatData.filter(item => item.tipo_trafego === trafficTypeFilter);
    }, [flatData, trafficTypeFilter]);

    // Calcula KPIs gerais e da seleção
    const { generalKpis, selectionKpis } = useMemo(() => {
        const calculateKpis = (dataArray) => {
            if (!dataArray || dataArray.length === 0) return { inscricoes: 0, checkins: 0, taxaCheckin: '0.0%' };
            const inscricoes = dataArray.reduce((sum, item) => sum + item.inscricoes, 0);
            const checkins = dataArray.reduce((sum, item) => sum + item.checkins, 0);
            const taxaCheckin = inscricoes > 0 ? `${((checkins / inscricoes) * 100).toFixed(1)}%` : '0.0%';
            return { inscricoes, checkins, taxaCheckin };
        };
        return { generalKpis: calculateKpis(flatData), selectionKpis: calculateKpis(filteredData) };
    }, [flatData, filteredData]);
    
    // ---- Componente MasterDetailView ----
    const MasterDetailView = () => {
        // Agrupa dados por campanha para o gráfico mestre
        const campaignChartData = useMemo(() => { 
            const groupedData = new Map(); 
            filteredData.forEach(item => { 
                // Usa 'utm_campaign' ou '(não definido)' como chave
                const key = item.utm_campaign || '(não definido)'; 
                if (!groupedData.has(key)) { 
                    groupedData.set(key, { name: key, checkins: 0 }); 
                } 
                groupedData.get(key).checkins += item.checkins; 
            }); 
            // Ordena por checkins (maior primeiro)
            return Array.from(groupedData.values()).sort((a,b) => b.checkins - a.checkins); 
        }, [filteredData]);
        
        // Handler para clique na barra do gráfico
        const handleBarClick = (barPayload) => { 
            // barPayload pode ser null se clicar fora das barras
            const clickedName = barPayload?.name; 
            if (!clickedName) return;
            setMasterSelectedCampaign(prev => prev === clickedName ? null : clickedName); 
        };
        
        // Filtra dados para a tabela de detalhes
        const campaignDetailData = useMemo(() => { 
            if (!masterSelectedCampaign) return []; 
            // Filtra pelo nome da campanha selecionada
            return filteredData.filter(item => (item.utm_campaign || '(não definido)') === masterSelectedCampaign); 
        }, [filteredData, masterSelectedCampaign]);
        
        // Tooltip customizado para o gráfico
        const MasterTooltip = ({ active, payload, label }) => { 
            if (active && payload && payload.length) {
                // Formata o valor com toLocaleString
                const value = payload[0].value?.toLocaleString('pt-BR') ?? '0';
                return (
                    <div className="bg-gray-700 p-2 rounded shadow-lg border border-gray-600 text-xs text-gray-200">
                        <strong className="text-gray-50">{label}</strong><br />
                        <span className="text-gray-300">Check-ins: {value}</span>
                    </div>
                ); 
            }
            return null; 
        };
        
        // Componente customizado para a barra clicável
        const ClickableBar = (props) => { 
            const { x, y, width, height, payload } = props; 
            // Verifica se esta barra está selecionada
            const isSelected = masterSelectedCampaign === payload.name; 
            // Usa azul mais claro se selecionado, senão azul padrão
            const fill = isSelected ? '#60A5FA' : '#3B82F6'; 
            // Retorna um retângulo (barra) com o preenchimento e evento de clique
            // Usa o componente Rectangle do recharts para melhor compatibilidade
            return <Rectangle {...props} fill={fill} onClick={() => handleBarClick(payload)} style={{ cursor: 'pointer' }} />; 
        };

        return (
            // Layout responsivo: space-y-4 sm:space-y-6
            <div className="space-y-4 sm:space-y-6 w-full">
                {/* Gráfico Mestre */}
                 {/* Padding p-3 sm:p-4 */}
                <div className="p-3 sm:p-4 rounded-lg shadow-md bg-white dark:bg-gray-800/50 overflow-hidden">
                    {/* Texto text-base sm:text-lg */}
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Performance por Campanha (Mestre)</h3>
                     {/* Altura h-[250px] sm:h-[300px] */}
                    <div className="h-[250px] sm:h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={campaignChartData} margin={{ top: 5, right: 5, bottom: isMobile ? 80 : 60, left: isMobile ? -25 : -10 }}> {/* Margens ajustadas */}
                                <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                                {/* Labels do eixo X ajustados */}
                                <XAxis dataKey="name" angle={-45} textAnchor="end" height={isMobile ? 70: 50} interval={0} stroke="#9CA3AF" tick={{ fontSize: 9 }} />
                                {/* Labels do eixo Y ajustados */}
                                <YAxis stroke="#9CA3AF" tick={{ fontSize: 9 }} />
                                <Tooltip content={<MasterTooltip />} cursor={{fill: 'rgba(107, 114, 128, 0.2)'}} />
                                <Bar dataKey="checkins" shape={<ClickableBar />} maxBarSize={40} /> {/* Tamanho máximo da barra */}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                {/* Tabela Detalhe (só mostra se uma campanha for selecionada) */}
                {masterSelectedCampaign && (
                     // Padding p-3 sm:p-4
                    <div className="p-3 sm:p-4 rounded-lg shadow-md bg-white dark:bg-gray-800/50">
                        {/* Texto text-base sm:text-lg */}
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Detalhes da Campanha: <span className="text-blue-500 dark:text-blue-400">{masterSelectedCampaign}</span></h3>
                        <div className="overflow-x-auto">
                           {/* Passa os KPIs corretos para a tabela de detalhes */}
                           <ExpandableSourcesTable data={campaignDetailData} totalKpis={selectionKpis} />
                        </div>
                    </div>
                )}
            </div>
        )
    };

    // Condição de loading principal
    const isPageLoading = isLoadingData || isLoadingLaunches;

    return (
        // Padding responsivo
        <div className="space-y-4 px-2 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
            <Toaster position="top-center" />
            {/* KPIs Gerais e de Seleção */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
                 {/* Padding p-2 sm:p-4 */}
                <div className="dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3 text-sm sm:text-base">Totais do Lançamento</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                        <KpiCard title="Inscrições" value={generalKpis.inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Check-ins" value={generalKpis.checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa" value={generalKpis.taxaCheckin} icon={Percent} />
                    </div>
                </div>
                 {/* Padding p-2 sm:p-4 */}
                <div className="dark:bg-gray-800/50 p-2 sm:p-4 rounded-lg">
                    <h3 className="font-bold text-center text-gray-600 dark:text-gray-300 mb-3 text-sm sm:text-base">Totais da Seleção ({trafficTypeFilter})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                        <KpiCard title="Inscrições" value={selectionKpis.inscricoes.toLocaleString('pt-BR')} icon={Users} />
                        <KpiCard title="Check-ins" value={selectionKpis.checkins.toLocaleString('pt-BR')} icon={UserCheck} />
                        <KpiCard title="Taxa" value={selectionKpis.taxaCheckin} icon={Percent} />
                    </div>
                </div>
            </section>
            
            {/* Filtro de Tráfego */}
            {/* Padding p-1 sm:p-1.5 */}
            <div className="w-full bg-white dark:bg-gray-800 p-1 sm:p-1.5 rounded-lg shadow-md flex items-center space-x-1 overflow-x-auto whitespace-nowrap">
                {TRAFFIC_TYPES.map(type => ( 
                    // Padding py-1 px-3 sm:py-2 sm:px-4, texto text-xs sm:text-sm
                    <button key={type} onClick={() => { setTrafficTypeFilter(type); setMasterSelectedCampaign(null); }} className={`flex-shrink-0 px-3 py-1 sm:px-4 sm:py-2 text-xs sm:text-sm font-semibold rounded-md transition-colors ${trafficTypeFilter === type ? 'bg-blue-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}> {type} </button> 
                ))}
            </div>
            
            {/* Conteúdo Principal */}
            {/* Padding p-2 sm:p-4 */}
            <div className="bg-white dark:bg-gray-800 p-2 sm:p-4 rounded-lg shadow-md">
                {isPageLoading ? (
                    <Spinner /> 
                ) : !selectedLaunch ? (
                     <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">Selecione um cliente e um lançamento.</div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm sm:text-base">Nenhum dado encontrado para o filtro selecionado.</div>
                ) : (
                    <div>
                        <MasterDetailView />
                    </div>
                )}
            </div>
        </div>
    );
}
