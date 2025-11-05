// src\app\(main)\Dashboards\campanhas-criativos\components\ExpandableSourcesTable.jsx
'use client';

import React, { useState, useMemo, Fragment } from 'react';
import { FaChevronRight, FaChevronDown } from 'react-icons/fa';

export default function ExpandableSourcesTable({ data, totalKpis }) {
    const [expandedRows, setExpandedRows] = useState({});

    const toggleRow = (sourceName) => {
        setExpandedRows(prev => ({
            ...prev,
            [sourceName]: !prev[sourceName]
        }));
    };

    const tableData = useMemo(() => {
        // Lógica de agrupamento (sem alterações)
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
        <div>
            {/* Cabeçalho Desktop */}
            <div className="hidden lg:grid grid-cols-4 gap-4 px-6 py-3 bg-gray-700/50 text-xs uppercase text-gray-400">
                 <span className="col-span-1">Origem / Criativo</span>
                 <span className="text-right">Inscrições</span>
                 <span className="text-right">Check-ins</span>
                 <span className="text-right">% do Total</span>
            </div>

            {/* Lista de Cards Acordeão */}
            <div className="space-y-1 lg:space-y-0 lg:mt-0">
                {tableData.map(source => {
                    const isExpanded = expandedRows[source.name];
                    const sourcePercentage = totalKpis.checkins > 0 ? (source.checkins / totalKpis.checkins) * 100 : 0;
                    return (
                        <Fragment key={source.name}>
                            {/* Linha Principal (Clicável) */}
                            <div
                                className="bg-gray-800 lg:bg-transparent lg:grid lg:grid-cols-4 lg:gap-4 lg:px-6 lg:py-4 lg:border-b lg:border-gray-700 hover:bg-gray-700/50 cursor-pointer rounded-lg lg:rounded-none p-4"
                                onClick={() => toggleRow(source.name)}
                            >
                                {/* Layout Mobile */}
                                <div className="lg:hidden flex flex-col">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3 font-medium text-white overflow-hidden">
                                            {isExpanded ? <FaChevronDown size={12}/> : <FaChevronRight size={12}/>}
                                            <span className="truncate" title={source.name}>{source.name}</span>
                                        </div>
                                        <span className="font-semibold text-yellow-400 text-sm min-w-[4rem] text-right">
                                            {sourcePercentage.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-4 text-center">
                                         <div>
                                            <p className="text-xs text-gray-400">Inscrições</p>
                                            <p className="font-semibold text-gray-100">{source.inscricoes.toLocaleString('pt-BR')}</p>
                                        </div>
                                         <div>
                                            <p className="text-xs text-gray-400">Check-ins</p>
                                            <p className="font-semibold text-gray-100">{source.checkins.toLocaleString('pt-BR')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Layout Desktop */}
                                <div className="hidden lg:flex items-center gap-3 font-medium text-white whitespace-nowrap">
                                    {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                                    {source.name}
                                </div>
                                {/* *** CORREÇÃO: Adicionada classe text-gray-300 *** */}
                                <div className="hidden lg:block text-right text-gray-300">{source.inscricoes.toLocaleString('pt-BR')}</div>
                                <div className="hidden lg:block text-right text-gray-300">{source.checkins.toLocaleString('pt-BR')}</div>
                                <div className="hidden lg:block text-right font-semibold text-yellow-400">
                                    {sourcePercentage.toFixed(1)}%
                                </div>
                            </div>

                            {/* Linhas Filhas (Criativos) */}
                            {isExpanded && source.creatives.sort((a,b) => b.checkins - a.checkins).map(creative => {
                                const creativePercentage = totalKpis.checkins > 0 ? (creative.checkins / totalKpis.checkins) * 100 : 0;
                                return (
                                    <div key={creative.name} className="bg-gray-900/50 lg:bg-transparent lg:grid lg:grid-cols-4 lg:gap-4 lg:px-6 lg:py-3 border-b border-gray-700/50 p-4 pl-8 lg:pl-12 rounded-b-lg lg:rounded-none">

                                        {/* Layout Mobile */}
                                        <div className="lg:hidden flex flex-col">
                                            <div className="flex justify-between items-center">
                                                <span className="text-gray-400 text-sm truncate" title={creative.name}>{creative.name || '(sem criativo)'}</span>
                                                <span className="text-yellow-500 text-sm min-w-[4rem] text-right">
                                                    {creativePercentage.toFixed(1)}%
                                                </span>
                                            </div>
                                             <div className="mt-2 grid grid-cols-2 gap-4 text-center">
                                                <div>
                                                    <p className="text-xs text-gray-500">Inscrições</p>
                                                    <p className="font-medium text-gray-300">{creative.inscricoes.toLocaleString('pt-BR')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500">Check-ins</p>
                                                    <p className="font-medium text-gray-300">{creative.checkins.toLocaleString('pt-BR')}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Layout Desktop */}
                                        <div className="hidden lg:block text-gray-400">{creative.name || '(sem criativo)'}</div>
                                        {/* *** CORREÇÃO: Adicionada classe text-gray-400 *** */}
                                        <div className="hidden lg:block text-right text-gray-400">{creative.inscricoes.toLocaleString('pt-BR')}</div>
                                        <div className="hidden lg:block text-right text-gray-400">{creative.checkins.toLocaleString('pt-BR')}</div>
                                        <div className="hidden lg:block text-right text-yellow-500">
                                            {creativePercentage.toFixed(1)}%
                                        </div>
                                    </div>
                                );
                            })}
                        </Fragment>
                    )
                })}
            </div>
        </div>
    );
}