//F:\plugscore\src\app\(main)\Dashboards\resumo-diario\page.jsx
'use client';

import React, { useState, useEffect, useMemo, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaSpinner } from 'react-icons/fa';
import toast, { Toaster } from 'react-hot-toast';
import { AppContext } from '@/context/AppContext';

// --- Componentes ---
const LoadingSpinner = () => <div className="flex justify-center items-center h-64"><FaSpinner className="animate-spin text-blue-600 text-3xl" /></div>;
const KpiCard = ({ title, value, description }) => ( <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg text-center h-full flex flex-col justify-center"> <p className="text-3xl font-bold text-slate-800 dark:text-gray-200 mt-1">{(value || 0).toLocaleString('pt-BR')}</p> <h3 className="text-sm font-medium text-slate-500 dark:text-gray-400 truncate mt-1">{title}</h3> <p className="text-xs text-slate-400 dark:text-gray-500">{description}</p> </div> );
const KpiRateCard = ({ title, value, description }) => ( <div className="p-4 bg-slate-50 dark:bg-gray-800 rounded-lg text-center h-full flex flex-col justify-center"> <p className="text-3xl font-bold text-slate-800 dark:text-gray-200 mt-1">{`${(value || 0).toFixed(1)}%`}</p> <h3 className="text-sm font-medium text-slate-500 dark:text-gray-400 truncate mt-1">{title}</h3> <p className="text-xs text-slate-400 dark:text-gray-500">{description}</p> </div> );


export default function ResumoDiarioPage() {
    const supabase = createClientComponentClient();
    const { selectedClientId, setHeaderContent, userProfile } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState(null);
    const [kpis, setKpis] = useState({ totalInscricoes: 0, totalCheckins: 0, trafegoPago: 0, trafegoOrganico: 0, trafegoNaoTraqueado: 0 });
    const [dailyData, setDailyData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);
    const [error, setError] = useState(null);
    
    useEffect(() => {
        if (!userProfile || !selectedClientId) return;
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            setLaunches([]);
            setSelectedLaunchId(null);
            let clientIdToSend = null;
            if (userProfile.role === 'admin') {
                clientIdToSend = selectedClientId === 'all' ? null : selectedClientId;
            } else {
                clientIdToSend = userProfile.cliente_id;
            }
            if (!clientIdToSend && userProfile.role !== 'admin') {
                setLaunches([]);
                setIsLoadingLaunches(false);
                setIsLoading(false);
                return;
            }
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
            if (error) {
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } else if (data) {
                setLaunches(data);
                if (data.length > 0) {
                    const inProgress = data.find(l => l.status === 'Em andamento');
                    setSelectedLaunchId(inProgress ? inProgress.id : data[0].id);
                } else {
                    setIsLoading(false);
                }
            } else {
                 setIsLoading(false);
            }
            setIsLoadingLaunches(false);
        };
        fetchLaunches();
    }, [userProfile, selectedClientId, supabase]);

    useEffect(() => {
        if (!selectedLaunchId) {
            setKpis({ totalInscricoes: 0, totalCheckins: 0, trafegoPago: 0, trafegoOrganico: 0, trafegoNaoTraqueado: 0 });
            setDailyData([]);
            if(launches.length === 0) setIsLoading(false);
            return;
        };
        const fetchDashboardData = async () => {
            setIsLoading(true);
            setError(null);
            
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;

            const { data, error } = await supabase.rpc('get_resumo_diario_dashboard', {
                p_launch_id: selectedLaunchId,
                p_client_id: clientIdToSend
            });

            if (error) {
                toast.error('Erro ao carregar dados do resumo.');
                setError("Erro ao carregar dados do resumo.");
                setKpis({ totalInscricoes: 0, totalCheckins: 0, trafegoPago: 0, trafegoOrganico: 0, trafegoNaoTraqueado: 0 });
                setDailyData([]);
            } else if (data) {
                setKpis(data.kpis || { totalInscricoes: 0, totalCheckins: 0, trafegoPago: 0, trafegoOrganico: 0, trafegoNaoTraqueado: 0 });
                setDailyData(data.dailyData || []);
            }
            setIsLoading(false);
        };
        fetchDashboardData();
    }, [selectedLaunchId, userProfile, selectedClientId, supabase, launches.length]);

    useEffect(() => {
        const launchSelector = (
            <select 
                value={selectedLaunchId || ''} 
                onChange={(e) => setSelectedLaunchId(e.target.value)} 
                disabled={isLoadingLaunches || launches.length === 0} 
                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-xs p-2"
            >
                {isLoadingLaunches ? (
                    <option>Carregando...</option>
                ) : launches.length > 0 ? (
                    // --- MUDANÇA UI: Exibindo o CÓDIGO do lançamento em vez do NOME ---
                    launches.map((launch) => (<option key={launch.id} value={launch.id}> {launch.codigo} ({launch.status}) </option>))
                ) : (
                    <option>Nenhum lançamento</option>
                )}
            </select>
        );
        setHeaderContent({ title: 'Resumo Diário do Lançamento', controls: launchSelector });
        return () => { setHeaderContent({ title: '', controls: null }); }
    }, [setHeaderContent, selectedLaunchId, launches, isLoadingLaunches]);

    const chartData = useMemo(() => {
        if (!dailyData) return [];
        return dailyData.map(day => ({
            ...day,
            short_date: new Date(day.full_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        })).sort((a, b) => new Date(a.full_date) - new Date(b.full_date));
    }, [dailyData]);

    const taxaCheckin = (kpis.totalInscricoes > 0) ? (kpis.totalCheckins / kpis.totalInscricoes) * 100 : 0;
    const percPago = (kpis.totalInscricoes > 0) ? (kpis.trafegoPago / kpis.totalInscricoes) * 100 : 0;
    const percOrganico = (kpis.totalInscricoes > 0) ? (kpis.trafegoOrganico / kpis.totalInscricoes) * 100 : 0;
    const percNaoTraqueado = (kpis.totalInscricoes > 0) ? (kpis.trafegoNaoTraqueado / kpis.totalInscricoes) * 100 : 0;

    if (error) return <div className="p-4 md:p-8"><div className="p-8 text-center text-red-500 bg-red-50 dark:bg-red-900/20 dark:text-red-300 rounded-lg">{error}</div></div>;

    return (
        <>
            <Toaster position="top-center" />
            <div className="p-4 md:p-6 lg:p-8 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-full">
                {isLoading ? <LoadingSpinner /> : (
                    <main className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                             <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow h-full flex flex-col justify-between">
                                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">Visão Geral</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <KpiCard title="TOTAL INSCRIÇÕES" value={kpis.totalInscricoes} description="Total do Lançamento" />
                                    <KpiCard title="TOTAL CHECK-INS" value={kpis.totalCheckins} description="Total do Lançamento" />
                                    <KpiRateCard title="TAXA DE CHECK-IN" value={taxaCheckin} description="Inscrições x Check-ins" />
                                </div>
                            </div>
                            <div className="lg:col-span-3 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 text-center">Origem do Tráfego</h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <KpiCard title="TRÁFEGO PAGO" value={kpis.trafegoPago} description="Valores Absolutos" />
                                        <KpiCard title="ORGÂNICO" value={kpis.trafegoOrganico} description="Valores Absolutos" />
                                        <KpiCard title="NÃO TRAQUEADO" value={kpis.trafegoNaoTraqueado} description="Valores Absolutos" />
                                    </div>
                                    <div className="pt-2">
                                        <div className="w-full flex rounded-md h-10 bg-gray-200 dark:bg-gray-700 overflow-hidden" title="Distribuição Percentual do Tráfego"><div className="flex items-center justify-center bg-blue-500" style={{ width: `${percPago}%` }}><span className="text-xs font-bold text-white">{percPago > 10 ? `${percPago.toFixed(0)}%` : ''}</span></div><div className="flex items-center justify-center bg-green-500" style={{ width: `${percOrganico}%` }}><span className="text-xs font-bold text-white">{percOrganico > 10 ? `${percOrganico.toFixed(0)}%` : ''}</span></div><div className="flex items-center justify-center bg-gray-400" style={{ width: `${percNaoTraqueado}%` }}><span className="text-xs font-bold text-white">{percNaoTraqueado > 10 ? `${percNaoTraqueado.toFixed(0)}%` : ''}</span></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {dailyData && dailyData.length > 0 ? (
                            <>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                    <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Dados Detalhados por Dia</h2>
                                    <div className="hidden lg:block overflow-x-auto"> <table className="min-w-full text-sm text-gray-800 dark:text-gray-200"> <thead className="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 font-medium text-xs"> <tr> <th className="px-4 py-3 text-left">DATA</th> <th className="px-4 py-3 text-right">LEADS</th> <th className="px-4 py-3 text-right">CHECK-IN</th> <th className="px-4 py-3 text-right">TRF PAGO</th> <th className="px-4 py-3 text-right">ORGÂNICO</th> <th className="px-4 py-3 text-right">NÃO TRAQ.</th> </tr> </thead> <tbody className="divide-y divide-gray-200 dark:divide-gray-600"> {dailyData.map(day => ( <tr key={day.full_date}> <td className="px-4 py-4 whitespace-nowrap">{new Date(day.full_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td> <td className="px-4 py-4 text-right">{(day.inscricoes || 0).toLocaleString('pt-BR')}</td> <td className="px-4 py-4 text-right">{(day.checkins || 0).toLocaleString('pt-BR')}</td> <td className="px-4 py-4 text-right">{(day.trfPago || 0).toLocaleString('pt-BR')}</td> <td className="px-4 py-4 text-right">{(day.trfOrganico || 0).toLocaleString('pt-BR')}</td> <td className="px-4 py-4 text-right">{(day.trfNaoTraqueado || 0).toLocaleString('pt-BR')}</td> </tr> ))} </tbody> </table> </div>
                                    <div className="block lg:hidden space-y-4"> {dailyData.map(day => ( <div key={day.full_date} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700"> <div className="flex justify-between items-center mb-3"> <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{new Date(day.full_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p> <div className="text-right"> <p className="text-sm font-semibold text-gray-800 dark:text-gray-300">{(day.inscricoes || 0).toLocaleString('pt-BR')} Leads</p> <p className="text-xs text-gray-500 dark:text-gray-400">{(day.checkins || 0).toLocaleString('pt-BR')} Check-ins</p> </div> </div> <div className="border-t border-gray-200 dark:border-gray-600 pt-3 grid grid-cols-3 gap-x-2 text-center"> <div> <p className="text-xs text-gray-500 dark:text-gray-400">Pago</p> <p className="font-semibold text-gray-700 dark:text-gray-300">{(day.trfPago || 0).toLocaleString('pt-BR')}</p> </div> <div> <p className="text-xs text-gray-500 dark:text-gray-400">Orgânico</p> <p className="font-semibold text-gray-700 dark:text-gray-300">{(day.trfOrganico || 0).toLocaleString('pt-BR')}</p> </div> <div> <p className="text-xs text-gray-500 dark:text-gray-400">Não Traq.</p> <p className="font-semibold text-gray-700 dark:text-gray-300">{(day.trfNaoTraqueado || 0).toLocaleString('pt-BR')}</p> </div> </div> </div> ))} </div>
                                </div>
                                
                                <div key={selectedLaunchId} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Evolução Diária de Inscritos</h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <BarChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568"/>
                                                <XAxis dataKey="short_date" stroke="#a0aec0"/>
                                                <YAxis allowDecimals={false} stroke="#a0aec0"/>
                                                <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }}/>
                                                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                                                <Bar dataKey="inscricoes" fill="#4f46e5" name="Inscrições" />
                                                <Bar dataKey="checkins" fill="#22c55e" name="Check-ins" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                        <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">Evolução Diária de Tráfego</h2>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <LineChart data={chartData}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568"/>
                                                <XAxis dataKey="short_date" stroke="#a0aec0"/>
                                                <YAxis allowDecimals={false} stroke="#a0aec0"/>
                                                <Tooltip contentStyle={{ backgroundColor: '#1a202c', border: '1px solid #4a5568' }}/>
                                                <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                                                <Line type="monotone" dataKey="trfPago" stroke="#3b82f6" name="Pago" strokeWidth={2} />
                                                <Line type="monotone" dataKey="trfOrganico" stroke="#16a34a" name="Orgânico" strokeWidth={2} />
                                                <Line type="monotone" dataKey="trfNaoTraqueado" stroke="#ef4444" name="Não Traqueado" strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </>
                        ) : null}

                        {!isLoading && (!dailyData || dailyData.length === 0) && (
                            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-12 text-center">
                                <p className="text-gray-500 dark:text-gray-400">Não há dados para exibir para este lançamento.</p>
                            </div>
                        )}
                    </main>
                )}
            </div>
        </>
    );
}
