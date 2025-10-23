 // src\app\(main)\Dashboards\campanhas-criativos\components\BarChartAnalysis.jsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FaTimes } from 'react-icons/fa';
import useMobileCheck from '@/hooks/useMobileCheck'; // Caminho corrigido sem extensão

// --- COMPONENTES AUXILIARES ---
const Breadcrumbs = ({ path, onNavigate }) => ( <div className="text-sm text-gray-500 dark:text-gray-400 mb-4"> <span className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400" onClick={() => onNavigate(null, null)}>Todas as Campanhas</span> {path.campaign && ( <> <span className="mx-1">&gt;</span> <span className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400" onClick={() => onNavigate(path.campaign, null)}>{path.campaign}</span> </> )} {path.source && ( <> <span className="mx-1">&gt;</span> <span className="font-semibold text-gray-700 dark:text-gray-200">{path.source}</span> </> )} </div> );
const CustomTooltip = ({ active, payload, label, totalKpis }) => { if (active && payload && payload.length && totalKpis) { const data = payload[0].payload; const percentageOfTotal = totalKpis.checkinsPago > 0 ? (data.checkins / totalKpis.checkinsPago) * 100 : 0; return ( <div className="bg-gray-800 p-2 rounded shadow-lg border border-gray-700 text-sm text-gray-50"> <strong className="text-gray-100">{label}</strong><br /> <span className="text-gray-300">Check-ins: {data.checkins.toLocaleString('pt-BR')}</span><br /> <span className="text-gray-300">Inscrições: {data.inscricoes.toLocaleString('pt-BR')}</span><br /> <hr className="border-gray-600 my-1" /> <span className="text-gray-300">% do Total de Check-ins:</span> <strong className="text-blue-400">{percentageOfTotal.toFixed(1)}%</strong> </div> ); } return null; };
const DetailCard = ({ item, level, path, totalKpis }) => { if (!totalKpis) return null; const percentageOfTotal = totalKpis.checkinsPago > 0 ? (item.checkins / totalKpis.checkinsPago) * 100 : 0; return ( <div className="flex-grow flex flex-col items-center justify-center bg-gray-900/50 rounded-lg p-6"> <p className="text-sm font-semibold text-gray-400 uppercase">{level === 'utm_source' ? 'Única Origem Encontrada' : 'Único Criativo Encontrado'}</p> <h2 className="text-3xl font-bold text-white my-2">{item.name}</h2> <p className="text-xs text-gray-500 mb-6">em: {path.campaign} {path.source && ` > ${path.source}`}</p> <div className="grid grid-cols-3 gap-4 text-center w-full max-w-lg"> <div><p className="text-3xl font-bold text-white">{item.inscricoes.toLocaleString('pt-BR')}</p><p className="text-sm text-gray-400">Inscrições</p></div> <div><p className="text-3xl font-bold text-white">{item.checkins.toLocaleString('pt-BR')}</p><p className="text-sm text-gray-400">Check-ins</p></div> <div><p className="text-3xl font-bold text-yellow-400">{percentageOfTotal.toFixed(1)}%</p><p className="text-sm text-gray-400">% do Total</p></div> </div> </div> ); };


export default function BarChartAnalysis({ data, totalKpis }) {
    const isMobile = useMobileCheck();
    if (!Array.isArray(data)) { return <div className="flex flex-col h-[500px]"><div className="flex-grow flex items-center justify-center text-gray-500">Aguardando dados...</div></div>; }
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [selectedSource, setSelectedSource] = useState(null);
    const [detailItem, setDetailItem] = useState(null);
    const handleNavigate = (campaign, source) => { setSelectedCampaign(campaign); setSelectedSource(source); };
    const getChartDataForLevel = (levelData, levelKey) => { const groupedData = new Map(); levelData.forEach(item => { const key = item[levelKey]; if (!groupedData.has(key)) { groupedData.set(key, { name: key, inscricoes: 0, checkins: 0 }); } const node = groupedData.get(key); node.inscricoes += item.inscricoes; node.checkins += item.checkins; }); return Array.from(groupedData.values()).map(item => ({ ...item, rate: item.inscricoes > 0 ? (item.checkins / item.inscricoes) : 0 })).sort((a,b) => b.checkins - a.checkins); };
    const { chartData, currentLevelKey } = useMemo(() => { if (!selectedCampaign) return { chartData: getChartDataForLevel(data, 'utm_campaign'), currentLevelKey: 'utm_campaign' }; const campaignFilteredData = data.filter(item => item.utm_campaign === selectedCampaign); if (!selectedSource) return { chartData: getChartDataForLevel(campaignFilteredData, 'utm_source'), currentLevelKey: 'utm_source' }; const sourceFilteredData = campaignFilteredData.filter(item => item.utm_source === selectedSource); return { chartData: getChartDataForLevel(sourceFilteredData, 'utm_content'), currentLevelKey: 'utm_content' }; }, [data, selectedCampaign, selectedSource]);
    useEffect(() => { if (selectedCampaign && !selectedSource) { const sourcesInCampaign = getChartDataForLevel(data.filter(i => i.utm_campaign === selectedCampaign), 'utm_source'); if (sourcesInCampaign.length === 1) setSelectedSource(sourcesInCampaign[0].name); } }, [selectedCampaign, data, selectedSource]);
    
    const handleBarClick = (payload) => {
        if (!payload || !payload.name) return;
        const barData = payload;
        if (currentLevelKey === 'utm_campaign') setSelectedCampaign(barData.name);
        else if (currentLevelKey === 'utm_source') setSelectedSource(barData.name);
        else if (currentLevelKey === 'utm_content') setDetailItem(barData);
    };

    return (
        <div className="flex flex-col h-[500px] relative">
            <Breadcrumbs path={{ campaign: selectedCampaign, source: selectedSource }} onNavigate={handleNavigate} />
            {chartData.length === 0 ? ( <div className="flex-grow flex items-center justify-center text-gray-500">Nenhum dado para esta seleção.</div> ) : chartData.length === 1 && currentLevelKey !== 'utm_campaign' ? ( <DetailCard item={chartData[0]} level={currentLevelKey} path={{ campaign: selectedCampaign, source: selectedSource }} totalKpis={totalKpis}/> ) : (
                <div className="flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, bottom: isMobile ? 120 : 120, left: isMobile ? -20 : 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
                            <XAxis dataKey="name" angle={-65} textAnchor="end" height={100} interval={0} stroke="#9CA3AF" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <YAxis stroke="#9CA3AF" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <Tooltip content={(props) => <CustomTooltip {...props} totalKpis={totalKpis} />} cursor={{fill: 'rgba(107, 114, 128, 0.2)'}} />
                            <Bar dataKey="checkins" onClick={handleBarClick}>
                                {chartData.map((entry, index) => {
                                    const { barColor } = (() => {
                                        switch (currentLevelKey) {
                                            case 'utm_source': return { barColor: '#10B981' };
                                            case 'utm_content': return { barColor: '#60A5FA' };
                                            default: return { barColor: '#3B82F6' };
                                        }
                                    })();
                                    return ( <Cell key={`cell-${index}`} fill={barColor} cursor="pointer" /> );
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
            {detailItem && (
                <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl relative p-4">
                        <button onClick={() => setDetailItem(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><FaTimes size={20} /></button>
                        <DetailCard item={detailItem} level="utm_content" path={{ campaign: selectedCampaign, source: selectedSource }} totalKpis={totalKpis} />
                    </div>
                </div>
            )}
        </div>
    );
}