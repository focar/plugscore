//src/app/(main)/Operacional/importar-compradores/page.jsx
'use client';

import { useState, useContext, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Papa from 'papaparse';
import toast, { Toaster } from 'react-hot-toast';
import { FaFileUpload, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

export default function ImportarCompradoresPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

    const [launches, setLaunches] = useState([]);
    const [selectedLaunch, setSelectedLaunch] = useState('');
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);

    const [file, setFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    useEffect(() => {
        setHeaderContent({ title: 'Importar Compradores', controls: null });
        
        if (!userProfile) return;
        
        const fetchLaunches = async () => {
            setIsLoadingLaunches(true);
            const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
            
            if (!clientIdToSend) {
                setLaunches([]);
                setIsLoadingLaunches(false);
                return;
            }

            const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });

            if (error) {
                toast.error("Erro ao buscar lançamentos.");
                setLaunches([]);
            } else {
                const filteredLaunches = (data || []).filter(l => l.status === 'Em andamento' || l.status === 'Concluído');
                setLaunches(filteredLaunches);
                if (filteredLaunches.length > 0) {
                  setSelectedLaunch(filteredLaunches[0].id);
                }
            }
            setIsLoadingLaunches(false);
        };

        fetchLaunches();

        return () => setHeaderContent({ title: '', controls: null });
    }, [userProfile, selectedClientId, supabase, setHeaderContent]);


    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setFeedback({ message: '', type: '' });
        } else {
            setFile(null);
            toast.error('Por favor, selecione um arquivo no formato CSV.');
        }
    };

    const handleProcessFile = () => {
        if (!selectedLaunch) { toast.error('Por favor, selecione um lançamento.'); return; }
        if (!file) { toast.error('Nenhum arquivo selecionado.'); return; }

        setIsProcessing(true);
        setFeedback({ message: 'Lendo e processando o arquivo...', type: 'loading' });
        const processingToast = toast.loading('Processando arquivo...');

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            delimiter: ";", // <<< --- ESTA É A CORREÇÃO PRINCIPAL
            complete: async (results) => {
                const jsonData = results.data.map(row => {
                    const emailKey = Object.keys(row).find(key => key.toLowerCase() === 'email');
                    const dateKey = Object.keys(row).find(key => key.toLowerCase() === 'data' || key.toLowerCase() === 'data_compra');
                    
                    return {
                        email: emailKey ? row[emailKey] : null,
                        data_compra: dateKey ? row[dateKey] : null
                    };
                }).filter(item => item.email && item.data_compra);

                if (jsonData.length === 0) {
                    setIsProcessing(false);
                    const errorMessage = "Nenhuma linha válida encontrada. Verifique se o arquivo CSV tem as colunas 'Email' e 'Data' separadas por ponto e vírgula (;).";
                    setFeedback({ message: errorMessage, type: 'error' });
                    toast.error(errorMessage, { id: processingToast });
                    return;
                }

                const { data, error } = await supabase.rpc('processar_importacao_compradores', {
                    compradores_json: jsonData,
                    p_launch_id: selectedLaunch
                });

                if (error) {
                    setFeedback({ message: `Erro no processamento: ${error.message}`, type: 'error' });
                    toast.error(`Erro: ${error.message}`, { id: processingToast });
                } else {
                    setFeedback({ message: data, type: 'success' });
                    toast.success(data, { id: processingToast });
                }
                
                setIsProcessing(false);
            },
            error: (error) => {
                setIsProcessing(false);
                setFeedback({ message: `Erro ao ler o arquivo CSV: ${error.message}`, type: 'error' });
                toast.error(`Erro ao ler o arquivo: ${error.message}`, { id: processingToast });
            }
        });
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <Toaster position="top-center" />
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md space-y-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-gray-100 mb-2">Importar Planilha de Compradores</h1>
                        <p className="text-slate-500 dark:text-gray-400">Primeiro, selecione o lançamento. Depois, faça o upload de um arquivo CSV.</p>
                    </div>

                    <div>
                        <label htmlFor="launch-selector" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                            1. Selecione o Lançamento
                        </label>
                        <select
                            id="launch-selector"
                            value={selectedLaunch}
                            onChange={(e) => setSelectedLaunch(e.target.value)}
                            disabled={isLoadingLaunches || launches.length === 0}
                            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        >
                            {isLoadingLaunches ? (
                                <option>Carregando lançamentos...</option>
                            ) : launches.length > 0 ? (
                                launches.map(l => <option key={l.id} value={l.id}>{l.codigo || l.nome} ({l.status})</option>)
                            ) : (
                                <option>Nenhum lançamento (Em Andamento/Concluído) encontrado para este cliente.</option>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                            2. Selecione o Arquivo CSV
                        </label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                            <FaFileUpload className="mx-auto text-4xl text-gray-400 mb-4" />
                            <input
                                type="file"
                                id="csvUploader"
                                className="hidden"
                                accept=".csv"
                                onChange={handleFileChange}
                                disabled={isProcessing}
                            />
                            <label htmlFor="csvUploader" className={`cursor-pointer font-semibold text-blue-600 dark:text-blue-400 hover:underline ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                {file ? `Arquivo selecionado: ${file.name}` : 'Clique para selecionar um arquivo'}
                            </label>
                        </div>
                    </div>

                    <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-6">
                        <button
                            onClick={handleProcessFile}
                            disabled={!file || !selectedLaunch || isProcessing}
                            className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? <FaSpinner className="animate-spin mr-2" /> : null}
                            {isProcessing ? 'Processando...' : 'Processar e Importar Compradores'}
                        </button>
                    </div>

                    {feedback.message && (
                        <div className="mt-6 p-4 rounded-md text-sm text-center"
                             style={{
                                 backgroundColor: feedback.type === 'success' ? '#dcfce7' : feedback.type === 'error' ? '#fee2e2' : '#e0f2fe',
                                 color: feedback.type === 'success' ? '#166534' : feedback.type === 'error' ? '#991b1b' : '#075985',
                             }}>
                            {feedback.type === 'success' && <FaCheckCircle className="inline mr-2" />}
                            {feedback.type === 'error' && <FaTimesCircle className="inline mr-2" />}
                            {feedback.message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}