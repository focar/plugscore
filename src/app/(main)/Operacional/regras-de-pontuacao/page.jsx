// /src/app/(main)/Operacional/regras-de-pontuacao/page.jsx
'use client';

import React, { useState, useEffect, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';

// --- Ícones ---
const SearchIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>);

// --- Componentes ---
const Input = React.forwardRef((props, ref) => {
    Input.displayName = 'Input';
    return <input {...props} ref={ref} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
});
const Select = React.forwardRef((props, ref) => {
    Select.displayName = 'Select';
    return <select {...props} ref={ref} className="block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
});

export default function RegrasDePontuacaoPage() {
    const { setHeaderContent, userProfile, selectedClientId } = useContext(AppContext);
    const supabase = createClientComponentClient();

    const [launches, setLaunches] = useState([]);
    const [selectedLaunchId, setSelectedLaunchId] = useState('');
    const [perguntas, setPerguntas] = useState([]);
    const [selectedPergunta, setSelectedPergunta] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [loading, setLoading] = useState({ launches: true, perguntas: false, regras: false });
    const [isSaving, setIsSaving] = useState(false);
    const [rulesForm, setRulesForm] = useState({ classe: 'score', regras: [] });

    // Efeito para definir o título estático no Header
    useEffect(() => {
        setHeaderContent({ title: 'Regras de Pontuação', controls: null });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent]);

    // 1. Busca os lançamentos disponíveis com base no cliente selecionado
    useEffect(() => {
        if (!userProfile) return;
        
        const fetchLaunches = async () => {
            setLoading(prev => ({ ...prev, launches: true }));
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            
            const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });

            if (error) {
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } else {
                const sorted = (data || []).sort((a, b) => (a.codigo || a.nome).localeCompare(b.codigo || b.nome));
                setLaunches(sorted);
                if (sorted.length > 0) {
                    setSelectedLaunchId(sorted[0].id);
                } else {
                    setSelectedLaunchId('');
                }
            }
            setLoading(prev => ({ ...prev, launches: false }));
        };

        fetchLaunches();
    }, [userProfile, selectedClientId, supabase]);

    // 2. Busca as perguntas associadas ao lançamento selecionado
    useEffect(() => {
        if (!selectedLaunchId) {
            setPerguntas([]);
            setSelectedPergunta(null);
            return;
        }

        const fetchPerguntas = async () => {
            setLoading(prev => ({ ...prev, perguntas: true }));
            const { data, error } = await supabase.from('lancamento_perguntas').select('perguntas(*)').eq('lancamento_id', selectedLaunchId);
            
            if (error) {
                toast.error("Erro ao buscar perguntas do lançamento.");
                setPerguntas([]);
            } else {
                const formatted = data.map(item => item.perguntas).filter(Boolean).sort((a, b) => a.texto.localeCompare(b.texto));
                setPerguntas(formatted);
                setSelectedPergunta(null); 
            }
            setLoading(prev => ({ ...prev, perguntas: false }));
        };

        fetchPerguntas();
    }, [selectedLaunchId, supabase]);

    // 3. Busca as regras existentes para a pergunta selecionada
    useEffect(() => {
        if (!selectedPergunta || !selectedLaunchId) {
            setRulesForm({ classe: 'score', regras: [] });
            return;
        }
        
        const buildRulesForm = async () => {
            setLoading(prev => ({ ...prev, regras: true }));
            
            const { data: lancamentoData } = await supabase.from('lancamentos').select('cliente_id').eq('id', selectedLaunchId).single();
            if (!lancamentoData?.cliente_id) {
                 toast.error("Cliente do lançamento não encontrado.");
                 setLoading(prev => ({...prev, regras: false}));
                 return;
            }

            const { data: existingRules, error } = await supabase.from('cliente_regras_pontuacao').select('*').eq('cliente_id', lancamentoData.cliente_id).eq('pergunta_id', selectedPergunta.id);
            
            if (error) {
                toast.error("Erro ao buscar regras existentes.");
            } else {
                const rulesMap = new Map(existingRules.map(r => [r.criterio, r.peso]));
                const classe = existingRules.length > 0 ? existingRules[0].classe : selectedPergunta.classe || 'score';

                let allOptions = selectedPergunta.opcoes || [];
                if ((selectedPergunta.tipo === 'Sim/Não' || selectedPergunta.tipo === 'Verdadeiro/Falso') && allOptions.length === 0) {
                    allOptions = ['VERDADEIRO', 'FALSO'];
                }

                const newRegras = allOptions.map(opcao => ({ criterio: opcao, peso: rulesMap.get(opcao) || 0 }));
                setRulesForm({ classe, regras: newRegras });
            }
            setLoading(prev => ({ ...prev, regras: false }));
        };
        buildRulesForm();
    }, [selectedPergunta, selectedLaunchId, supabase]);

    const handleRuleChange = (criterio, newPeso) => {
        const updatedRegras = rulesForm.regras.map(r => r.criterio === criterio ? { ...r, peso: parseInt(newPeso, 10) || 0 } : r);
        setRulesForm({ ...rulesForm, regras: updatedRegras });
    };

    const handleSaveAllRules = async (e) => {
        e.preventDefault();
        if (isSaving || !selectedLaunchId || !selectedPergunta) return;
        setIsSaving(true);
        
        const { data: lancamentoData } = await supabase.from('lancamentos').select('cliente_id').eq('id', selectedLaunchId).single();
        if (!lancamentoData?.cliente_id) {
             toast.error("Não foi possível identificar o cliente para guardar as regras.");
             setIsSaving(false);
             return;
        }

        const toastId = toast.loading("A guardar regras...");
        try {
            await supabase.from('cliente_regras_pontuacao').delete().match({ cliente_id: lancamentoData.cliente_id, pergunta_id: selectedPergunta.id });
            
            const newRulesData = rulesForm.regras.map(r => ({
                cliente_id: lancamentoData.cliente_id,
                pergunta_id: selectedPergunta.id,
                criterio: r.criterio,
                peso: r.peso,
                classe: rulesForm.classe,
            }));

            if (newRulesData.length > 0) {
                await supabase.from('cliente_regras_pontuacao').insert(newRulesData).throwOnError();
            }
            
            toast.success('Regras guardadas com sucesso!', { id: toastId });
        } catch (err) {
            toast.error("Não foi possível guardar as regras: " + err.message, { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };
    
    if (userProfile?.role === 'admin' && (!selectedClientId || selectedClientId === 'all')) {
        return (
            <div className="text-center p-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                 <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Selecione um Cliente</h2>
                 <p className="mt-2 text-gray-600 dark:text-gray-400">Por favor, selecione um cliente no filtro do topo para definir as regras de pontuação.</p>
            </div>
        );
    }
    
    const formatarCriterio = (criterio) => criterio === 'VERDADEIRO' ? 'Verdadeiro' : criterio === 'FALSO' ? 'Falso' : criterio;

    return (
        <div className="space-y-6">
            <Toaster position="top-center" />
            
            <div className="lg:max-w-md">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                    <label htmlFor="launch-selector" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selecione o Lançamento</label>
                    <select id="launch-selector" value={selectedLaunchId} onChange={e => setSelectedLaunchId(e.target.value)} disabled={loading.launches || launches.length === 0} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                        {loading.launches ? <option>A carregar...</option> : 
                         launches.length > 0 ? 
                         launches.map(l => <option key={l.id} value={l.id}>{l.codigo || l.nome}</option>) :
                         <option>Nenhum lançamento para este cliente</option>}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 flex flex-col gap-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Perguntas do Lançamento</h2>
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10"/>
                    </div>
                    <div className="border rounded-lg p-2 dark:border-gray-600 h-96 overflow-y-auto">
                        {loading.perguntas ? <p className="p-3 text-sm text-gray-500 dark:text-gray-400">A carregar...</p> : 
                         perguntas.filter(p => p.texto && p.texto.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                            <div key={p.id} onClick={() => setSelectedPergunta(p)} className={`p-3 text-sm rounded-md cursor-pointer text-gray-800 dark:text-gray-200 ${selectedPergunta?.id === p.id ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                {p.texto}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-2 sticky top-24">
                     <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 min-h-[20rem]">
                         {!selectedPergunta ? <p className="text-center text-gray-500 dark:text-gray-400">Selecione uma pergunta à esquerda.</p> :
                            (
                                <form onSubmit={handleSaveAllRules}>
                                    <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">Regras para: <span className="text-blue-600 dark:text-blue-400 font-normal">{selectedPergunta.texto}</span></h3>
                                    {loading.regras ? <p className="text-gray-600 dark:text-gray-300">A carregar...</p> : 
                                        (rulesForm.regras.length === 0 && selectedPergunta.tipo !== 'Texto Livre') ? <p className="text-gray-500 dark:text-gray-400">Esta pergunta não tem opções de resposta configuradas.</p> :
                                        selectedPergunta.tipo === 'Texto Livre' ? <p className="text-gray-500 dark:text-gray-400">Esta pergunta é de texto livre e não requer regras de pontuação.</p> :
                                        (
                                            <>
                                                <div className="mb-6">
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Classe da Pergunta</label>
                                                    <Select value={rulesForm.classe} onChange={(e) => setRulesForm({...rulesForm, classe: e.target.value})}>
                                                        <option value="score">Score</option>
                                                        <option value="perfil">Perfil</option>
                                                    </Select>
                                                </div>
                                                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                                    {rulesForm.regras.map(({ criterio, peso }) => (
                                                        <div key={criterio} className="grid grid-cols-3 items-center gap-4">
                                                            <label className="text-sm font-medium col-span-2 text-gray-800 dark:text-gray-200">{formatarCriterio(criterio)}</label>
                                                            <Input type="number" value={peso} onChange={(e) => handleRuleChange(criterio, e.target.value)} className="text-right"/>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-6 border-t dark:border-gray-700 pt-4 flex justify-end">
                                                    <button type="submit" disabled={isSaving} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
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
        </div>
    );
}

