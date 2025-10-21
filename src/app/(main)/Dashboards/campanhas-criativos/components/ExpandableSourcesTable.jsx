'use client';

import React, { useState, useMemo, Fragment } from 'react';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';

export default function ExpandableSourcesTable({ data, totalKpis }) { // Recebe a nova prop 'totalKpis'
    const [expandedRows, setExpandedRows] = useState({});

    const toggleRow = (sourceName) => {
        setExpandedRows(prev => ({
            ...prev,
            [sourceName]: !prev[sourceName]
        }));
    };

    const tableData = useMemo(() => {
        if (!data || data.length === 0) return [];
        const sources = new Map();
        data.forEach(item => {
            if (!sources.has(item.utm_source)) {
                sources.set(item.utm_source, {
                    name: item.utm_source,
                    inscricoes: 0,
                    checkins: 0,
                    creatives: []
                });
            }
            const sourceNode = sources.get(item.utm_source);
            sourceNode.inscricoes += item.inscricoes;
            sourceNode.checkins += item.checkins;
            sourceNode.creatives.push({
                name: item.utm_content,
                inscricoes: item.inscricoes,
                checkins: item.checkins
            });
        });
        return Array.from(sources.values()).sort((a,b) => b.checkins - a.checkins);
    }, [data]);

    if (!totalKpis || tableData.length === 0) {
        return <p className="text-center text-gray-400 py-4">Nenhum detalhe de origem encontrado para esta campanha.</p>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-700/50 text-xs uppercase text-gray-400">
                    <tr>
                        <th scope="col" className="px-6 py-3 w-1/2">Origem / Criativo</th>
                        <th scope="col" className="px-6 py-3 text-right">Inscrições</th>
                        <th scope="col" className="px-6 py-3 text-right">Check-ins</th>
                        {/* TÍTULO DA COLUNA ATUALIZADO */}
                        <th scope="col" className="px-6 py-3 text-right">% do Total</th>
                    </tr>
                </thead>
                <tbody>
                    {tableData.map(source => {
                        // NOVO CÁLCULO PARA A LINHA DA ORIGEM
                        const sourcePercentage = totalKpis.checkins > 0 ? (source.checkins / totalKpis.checkins) * 100 : 0;
                        return (
                            <Fragment key={source.name}>
                                <tr className="border-b border-gray-700 bg-gray-800 hover:bg-gray-700/50 cursor-pointer" onClick={() => toggleRow(source.name)}>
                                    <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            {expandedRows[source.name] ? <FaChevronDown /> : <FaChevronRight />}
                                            {source.name}
                                        </div>
                                    </th>
                                    <td className="px-6 py-4 text-right">{source.inscricoes.toLocaleString('pt-BR')}</td>
                                    <td className="px-6 py-4 text-right">{source.checkins.toLocaleString('pt-BR')}</td>
                                    <td className="px-6 py-4 text-right font-semibold text-yellow-400">
                                        {sourcePercentage.toFixed(1)}%
                                    </td>
                                </tr>
                                {expandedRows[source.name] && source.creatives.sort((a,b) => b.checkins - a.checkins).map(creative => {
                                    // NOVO CÁLCULO PARA A LINHA DO CRIATIVO
                                    const creativePercentage = totalKpis.checkins > 0 ? (creative.checkins / totalKpis.checkins) * 100 : 0;
                                    return (
                                        <tr key={creative.name} className="bg-gray-900/50">
                                            <td className="pl-12 pr-6 py-3 text-gray-400">{creative.name}</td>
                                            <td className="px-6 py-3 text-right text-gray-400">{creative.inscricoes.toLocaleString('pt-BR')}</td>
                                            <td className="px-6 py-3 text-right text-gray-400">{creative.checkins.toLocaleString('pt-BR')}</td>
                                            <td className="px-6 py-3 text-right text-yellow-500">
                                                {creativePercentage.toFixed(1)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </Fragment>
                        )
                    })}
                </tbody>
            </table>
        </div>
    );
}