// src/app/(main)/Operacional/regras-de-pontuacao/page.jsx
'use client';

import React, { useState, useEffect, useContext, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';

const SearchIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>);
const Input = React.forwardRef((props, ref) => (<input {...props} ref={ref} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />));
const Select = React.forwardRef((props, ref) => (<select {...props} ref={ref} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />));

function RegrasDePontuacaoContent() {
    const { setHeaderContent } = useContext(AppContext);
    const searchParams = useSearchParams();
    const router = useRouter();
    const supabase = createClientComponentClient();

    const [lancamento, setLancamento] = useState(null);
    const [perguntas, setPerguntas] = useState([]);
    const [selectedPergunta, setSelectedPergunta] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState({ lancamento: true, regras: false });
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [rulesForm, setRulesForm] = useState({ classe: 'score', regras: [] });

    const lancamentoId = searchParams.get('lancamentoId');

    useEffect(() => {
        if (!lancamentoId) {
            setLoading({ lancamento: false, regras: false });
            return;
        }

        async function fetchLancamentoData() {
            setLoading({ lancamento: true, regras: false });
            setError(null);
            try {
                const { data: lancamentoData, error: lancamentoError } = await supabase.from('lancamentos').select('*, clientes(id, nome)').eq('id', lancamentoId).single();
                if (lancamentoError) throw lancamentoError;
                if (!lancamentoData) throw new Error("Lançamento não encontrado.");
                setLancamento(lancamentoData);

                const { data: perguntasData, error: perguntasError } = await supabase.from('lancamento_perguntas').select('perguntas(*)').eq('lancamento_id', lancamentoId);
                if (perguntasError) throw perguntasError;
                
                const formattedPerguntas = perguntasData.map(item => item.perguntas).filter(Boolean).sort((a, b) => a.texto.localeCompare(b.texto));
                setPerguntas(formattedPerguntas);

            } catch (err) {
                setError("Erro ao carregar dados do lançamento: " + err.message);
            } finally {
                setLoading(prev => ({ ...prev, lancamento: false }));
            }
        }
        
        fetchLancamentoData();
    }, [lancamentoId, supabase]);

    useEffect(() => {
        if (lancamento) {
            setHeaderContent({
                title: 'Regras de Pontuação',
                controls: (
                     <div className="flex items-center gap-4 text-sm">
                         <span className="font-medium text-gray-500 dark:text-gray-400">Cliente:</span>
                         <span className="font-semibold text-gray-800 dark:text-gray-200">{lancamento.clientes.nome}</span>
                         <span className="font-medium text-gray-500 dark:text-gray-400 ml-4">Lançamento:</span>
                         <span className="font-semibold text-gray-800 dark:text-gray-200">{lancamento.nome}</span>
                     </div>
                ),
            });
        } else {
            setHeaderContent({ title: 'A Carregar Regras...' });
        }
        return () => setHeaderContent(null);
    }, [setHeaderContent, lancamento]);
    
    useEffect(() => {
        if (!selectedPergunta || !lancamento) {
            setRulesForm({ classe: 'score', regras: [] });
            return;
        }
        async function buildRulesForm() {
            setLoading(prev => ({ ...prev, regras: true }));
            try {
                const { data: existingRules, error } = await supabase.from('cliente_regras_pontuacao').select('*').eq('cliente_id', lancamento.clientes.id).eq('pergunta_id', selectedPergunta.id);
                if (error) throw error;
                
                const rulesMap = new Map(existingRules.map(r => [r.criterio, r.peso]));
                const classe = existingRules.length > 0 ? existingRules[0].classe : selectedPergunta.classe || 'score';

                let allOptions = selectedPergunta.opcoes || [];
                if ((selectedPergunta.tipo === 'Sim/Não' || selectedPergunta.tipo === 'Verdadeiro/Falso') && allOptions.length === 0) {
                    allOptions = ['VERDADEIRO', 'FALSO'];
                }

                const newRegras = allOptions.map(opcao => ({
                    criterio: opcao,
                    peso: rulesMap.get(opcao) || 0,
                }));
                
                setRulesForm({ classe, regras: newRegras });

            } catch (err) {
                setError("Erro ao construir formulário de regras: " + err.message);
            } finally {
                setLoading(prev => ({ ...prev, regras: false }));
            }
        }
        buildRulesForm();
    }, [selectedPergunta, lancamento, supabase]);

    const handleRuleChange = (criterio, newPeso) => {
        const updatedRegras = rulesForm.regras.map(r => r.criterio === criterio ? { ...r, peso: parseInt(newPeso, 10) || 0 } : r);
        setRulesForm({ ...rulesForm, regras: updatedRegras });
    };

    const handleSaveAllRules = async (e) => {
        e.preventDefault();
        if (isSaving || !lancamento || !selectedPergunta) return;
        setIsSaving(true);
        setError(null);
        try {
            await supabase.from('cliente_regras_pontuacao').delete().match({ cliente_id: lancamento.clientes.id, pergunta_id: selectedPergunta.id });
            
            const newRulesData = rulesForm.regras.map(r => ({
                cliente_id: lancamento.clientes.id,
                pergunta_id: selectedPergunta.id,
                criterio: r.criterio,
                peso: r.peso,
                classe: rulesForm.classe,
            }));

            if (newRulesData.length > 0) {
                 await supabase.from('cliente_regras_pontuacao').insert(newRulesData).throwOnError();
            }
            
            alert('Regras guardadas com sucesso!');
        } catch (err) {
            setError("Não foi possível guardar as regras: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const formatarCriterio = (criterio) => {
        if (criterio === 'VERDADEIRO') return 'Verdadeiro';
        if (criterio === 'FALSO') return 'Falso';
        return criterio;
    };

    if (loading.lancamento) return <div className="p-8 text-center">A carregar dados do lançamento...</div>;
    
    if (!lancamentoId) {
        return (
            <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg">
                <h2 className="text-xl font-semibold">Nenhum lançamento selecionado</h2>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Vá para 'Lançamentos' e selecione 'Definir Pontos'.</p>
                <button onClick={() => router.push('/Operacional/lancamentos')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md">
                    Ir para Lançamentos
                </button>
            </div>
        );
    }
    
    if (error) return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;

    const filteredPerguntas = perguntas.filter(p => p.texto && p.texto.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 flex flex-col gap-4">
                <h2 className="text-lg font-bold">Perguntas do Lançamento</h2>
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10"/>
                </div>
                <div className="border rounded-lg p-2 dark:border-gray-600 h-96 overflow-y-auto">
                    {filteredPerguntas.map(p => (
                        <div key={p.id} onClick={() => setSelectedPergunta(p)} className={`p-3 text-sm rounded-md cursor-pointer ${selectedPergunta?.id === p.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            {p.texto}
                        </div>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-2 sticky top-24">
                 <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 min-h-[20rem]">
                     {!selectedPergunta ? <p className="text-center text-gray-500">Selecione uma pergunta à esquerda.</p> :
                       (
                           <form onSubmit={handleSaveAllRules}>
                               <h3 className="text-lg font-bold mb-4">Regras para: <span className="text-blue-600 font-normal">{selectedPergunta.texto}</span></h3>
                               {loading.regras ? <p>A carregar...</p> : 
                                   (rulesForm.regras.length === 0 && selectedPergunta.tipo !== 'Texto Livre') ? <p className="text-gray-500">Esta pergunta não tem opções de resposta configuradas.</p> :
                                   selectedPergunta.tipo === 'Texto Livre' ? <p className="text-gray-500">Esta pergunta é de texto livre e não requer regras de pontuação.</p> :
                                   (
                                       <>
                                           <div className="mb-6">
                                               <label className="block text-sm font-medium mb-1">Classe da Pergunta</label>
                                               <Select value={rulesForm.classe} onChange={(e) => setRulesForm({...rulesForm, classe: e.target.value})}>
                                                   <option value="score">Score</option>
                                                   <option value="perfil">Perfil</option>
                                               </Select>
                                           </div>
                                           <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                               {rulesForm.regras.map(({ criterio, peso }) => (
                                                   <div key={criterio} className="grid grid-cols-3 items-center gap-4">
                                                       <label className="text-sm font-medium col-span-2">{formatarCriterio(criterio)}</label>
                                                       <Input type="number" value={peso} onChange={(e) => handleRuleChange(criterio, e.target.value)} className="text-right"/>
                                                   </div>
                                               ))}
                                           </div>
                                           <div className="mt-6 border-t pt-4 flex justify-end">
                                               <button type="submit" disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                                                   {isSaving ? 'A guardar...' : 'Guardar Regras'}
                                               </button>
                                           </div>
                                       </>
                                   )
                               }
                           </form>
                         )}
                 </div>
            </div>
        </div>
    );
}


// Componente exportado que usa Suspense
export default function RegrasDePontuacaoPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center">A carregar...</div>}>
            <RegrasDePontuacaoContent />
        </Suspense>
    );
}