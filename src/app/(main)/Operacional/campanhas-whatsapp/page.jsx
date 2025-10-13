'use client';

import { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '@/context/AppContext';
import Papa from 'papaparse';
import toast, { Toaster } from 'react-hot-toast';
import { FaFileUpload, FaSpinner, FaTable, FaRocket, FaWhatsapp } from 'react-icons/fa';
import { MessageSquare, Clock, Wifi, WifiOff, QrCode, X } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';

// Componente para o Modal do QR Code
const QrCodeModal = ({ qrCode, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-lg text-center shadow-2xl relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
                <h3 className="text-xl font-medium text-gray-900 mb-4">Escaneie para Conectar</h3>
                <p className="text-sm text-gray-500 mb-6">Abra o WhatsApp no seu celular e vá em <br/> Aparelhos Conectados &gt; Conectar um aparelho.</p>
                <QRCode value={qrCode} size={256} />
            </div>
        </div>
    );
};


export default function CampanhasWhatsappPage() {
    const { setHeaderContent } = useContext(AppContext);
    const textareaRef = useRef(null);

    // Estados da Campanha
    const [contactList, setContactList] = useState([]);
    const [message, setMessage] = useState('');
    const [delay, setDelay] = useState('normal');
    const [uiStep, setUiStep] = useState(1);
    const [isParsing, setIsParsing] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Estados da Conexão com o WhatsApp
    const [wppStatus, setWppStatus] = useState('DISCONNECTED');
    const [qrCode, setQrCode] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);

    useEffect(() => {
        setHeaderContent({ title: 'Campanhas de WhatsApp', controls: null });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent]);

    // Bloco useEffect CORRIGIDO para gerenciar o status da conexão
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch('/api/whatsapp/status');
                const data = await response.json();
                
                // Atualiza o status geral da interface
                setWppStatus(data.status);

                // Se recebermos um QR Code, atualizamos o estado e mostramos o modal
                if (data.status === 'QR_RECEIVED' && data.qr) {
                    setQrCode(data.qr);
                    setShowQrModal(true);
                } else {
                    // Esconde o modal em qualquer outro caso (ex: quando conectado ou desconectado)
                    setShowQrModal(false);
                }

                // Lógica CORRIGIDA para finalizar o estado de 'conectando'
                // Apenas consideramos a conexão um sucesso quando o status for 'CONNECTED'
                if (data.status === 'CONNECTED') {
                    if (isConnecting) {
                        toast.dismiss(); // Fecha o toast "Iniciando conexão..."
                        toast.success('WhatsApp conectado com sucesso!');
                        setIsConnecting(false); // Finaliza o estado de 'conectando'
                    }
                }
                
            } catch (error) {
                console.error("Erro ao buscar status do WhatsApp:", error);
                // Se a API falhar, consideramos desconectado e paramos de tentar
                setWppStatus('DISCONNECTED');
                if (isConnecting) {
                    toast.dismiss();
                    toast.error('Erro de comunicação com o servidor.');
                    setIsConnecting(false);
                }
            }
        }, 3000); // Continua verificando a cada 3 segundos

        return () => clearInterval(interval);
    }, [isConnecting]); // A dependência continua a mesma

    const handleConnect = async () => {
        setIsConnecting(true);
        setWppStatus('INITIALIZING');
        toast.loading('Iniciando conexão... Aguarde o QR Code.');
        try {
            await fetch('/api/whatsapp/start', { method: 'POST' });
        } catch (error) {
            toast.error('Falha ao solicitar inicialização.');
            setIsConnecting(false);
        }
    };
    
    const normalizePhoneNumber = (phone) => {
        if (!phone || typeof phone !== 'string') return '';
        const cleaned = phone.replace(/\D/g, '');
        if (cleaned.startsWith('55')) { return cleaned; }
        return `55${cleaned}`;
    };

    const handleFileParse = (file) => {
        if (!file) return;
        setIsParsing(true);
        toast.loading('Lendo arquivo CSV...');
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                toast.dismiss();
                if (results.errors.length > 0) {
                    toast.error("Erro ao ler o CSV. Verifique se o separador é ',' ou ';'.");
                    setIsParsing(false);
                    return;
                }
                const requiredHeaders = ['telefone', 'nome'];
                const fileHeaders = results.meta.fields.map(h => h.toLowerCase());
                if (!requiredHeaders.every(h => fileHeaders.includes(h))) {
                    toast.error("Arquivo CSV inválido. As colunas 'telefone' e 'nome' são obrigatórias.");
                    setIsParsing(false);
                    return;
                }
                const parsedData = results.data.map(row => {
                    const nomeKey = Object.keys(row).find(key => key.toLowerCase() === 'nome');
                    const telefoneKey = Object.keys(row).find(key => key.toLowerCase() === 'telefone');
                    const telefoneOriginal = row[telefoneKey];
                    let contactData = {};
                    for (const key in row) {
                        contactData[key.toUpperCase()] = row[key];
                    }
                    return { ...contactData, nome: row[nomeKey], telefone_original: telefoneOriginal, telefone_formatado: normalizePhoneNumber(telefoneOriginal) };
                });
                setContactList(parsedData);
                setUiStep(2);
                toast.success(`${parsedData.length} contatos carregados! Revise os números formatados.`);
                setIsParsing(false);
            },
            error: (error) => {
                toast.dismiss();
                toast.error(`Erro ao ler o arquivo: ${error.message}`);
                setIsParsing(false);
            }
        });
    };

    const insertVariable = (variable) => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + `{${variable}}` + text.substring(end);
        setMessage(newText);
        setTimeout(() => {
            const newCursorPosition = start + `{${variable}}`.length;
            textarea.focus();
            textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        }, 0);
    };

    const handleStartCampaign = () => {
        if (wppStatus !== 'CONNECTED') {
            toast.error("Você precisa estar conectado ao WhatsApp para iniciar os envios.");
            return;
        }
        toast.success('Iniciando disparos... (Funcionalidade a ser implementada)');
    };

    const availableVariables = contactList.length > 0 ? Object.keys(contactList[0]).filter(k => k !== 'telefone_original' && k !== 'telefone_formatado' && k !== 'nome') : [];
    const sortedVariables = ['NOME', 'TELEFONE'].concat(availableVariables.filter(v => v !== 'NOME' && v !== 'TELEFONE'));

    const renderConnectionStatus = () => {
        switch (wppStatus) {
            case 'CONNECTED':
                return <span className="flex items-center text-green-500"><Wifi className="mr-2" />Conectado</span>;
            case 'QR_RECEIVED':
                return <span className="flex items-center text-blue-500"><QrCode className="mr-2" />Escaneie o QR Code no pop-up</span>;
            case 'INITIALIZING':
                return <span className="flex items-center text-yellow-500"><FaSpinner className="animate-spin mr-2" />Iniciando...</span>;
            default:
                return <span className="flex items-center text-red-500"><WifiOff className="mr-2" />Desconectado</span>;
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50 dark:bg-gray-900 min-h-screen">
            <Toaster position="top-center" />
            {showQrModal && <QrCodeModal qrCode={qrCode} onClose={() => setShowQrModal(false)} />}
            
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className='text-center md:text-left'>
                        <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100 mb-1 flex items-center"><FaWhatsapp className="mr-3 text-green-500"/>Conexão com WhatsApp</h2>
                        <div className="text-slate-500 dark:text-gray-400 font-semibold">{renderConnectionStatus()}</div>
                    </div>
                    {wppStatus === 'DISCONNECTED' && (
                        <button onClick={handleConnect} disabled={isConnecting} className="w-full md:w-auto inline-flex items-center justify-center px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50">
                            {isConnecting ? <FaSpinner className="animate-spin mr-2" /> : null}
                            Conectar WhatsApp
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100 mb-4">Etapa 1: Carregar Lista de Contatos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center flex flex-col items-center justify-center">
                            <FaFileUpload className="mx-auto text-3xl text-gray-400 mb-3" />
                            <h3 className="font-semibold text-slate-700 dark:text-gray-200">Enviar Planilha CSV</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">O arquivo deve conter as colunas 'telefone' e 'nome'.</p>
                            <input type="file" id="csvUploader" className="hidden" accept=".csv" onChange={(e) => handleFileParse(e.target.files[0])} />
                            <label htmlFor="csvUploader" className="cursor-pointer font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                {isParsing ? <FaSpinner className="animate-spin inline-block mr-2"/> : "Clique para selecionar"}
                            </label>
                        </div>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center flex flex-col items-center justify-center opacity-50 cursor-not-allowed">
                             <FaTable className="mx-auto text-3xl text-gray-400 mb-3" />
                             <h3 className="font-semibold text-slate-700 dark:text-gray-200">Gerar do PlugScore</h3>
                             <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-3">Filtre leads por score e lançamento.</p>
                             <button disabled className="font-semibold text-blue-600 dark:text-blue-400">Em breve</button>
                        </div>
                    </div>
                </div>

                <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-opacity duration-500 ${uiStep < 2 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-gray-100 mb-4">Etapa 2: Preparar e Revisar a Campanha</h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                           <label htmlFor="message" className="flex items-center text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                                <MessageSquare className="w-4 h-4 mr-2" /> Editor de Mensagem
                            </label>
                            <textarea ref={textareaRef} id="message" rows="8" className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500" placeholder="Digite sua mensagem aqui..." value={message} onChange={(e) => setMessage(e.target.value)} disabled={isSending}></textarea>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Variáveis disponíveis (clique duplo para inserir):</span>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {sortedVariables.map(variable => (
                                        <code
                                            key={variable}
                                            onDoubleClick={() => insertVariable(variable)}
                                            className="cursor-pointer bg-slate-100 dark:bg-gray-600 text-blue-600 dark:text-blue-300 px-2 py-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                                            title={`Clique duplo para inserir {${variable}}`}
                                        >
                                            {`{${variable}}`}
                                        </code>
                                    ))}
                                </div>
                            </div>
                            <label htmlFor="delay" className="flex items-center mt-4 text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">
                                <Clock className="w-4 h-4 mr-2" /> Atraso (Retarder)
                            </label>
                            <select id="delay" value={delay} onChange={(e) => setDelay(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-slate-800 dark:text-gray-100 focus:ring-blue-500 focus:border-blue-500" disabled={isSending}>
                                <option value="rapido">Rápido (6 a 10 segundos)</option>
                                <option value="normal">Normal (11 a 18 segundos)</option>
                                <option value="lento">Lento (19 a 30 segundos)</option>
                            </select>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            <h3 className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-2">Lista de Contatos para Revisão ({contactList.length})</h3>
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                                    <tr>
                                        <th className="px-4 py-2">Nome</th>
                                        <th className="px-4 py-2">Telefone Original</th>
                                        <th className="px-4 py-2">Telefone Formatado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contactList.map((contact, index) => (
                                    <tr key={index} className="border-b dark:border-gray-700">
                                        <td className="px-4 py-2 text-slate-800 dark:text-gray-200">{contact.nome}</td>
                                        <td className="px-4 py-2 text-slate-600 dark:text-gray-400">{contact.telefone_original}</td>
                                        <td className="px-4 py-2 font-mono text-emerald-500">{contact.telefone_formatado}</td>
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                 <div className={`text-center transition-opacity duration-500 ${uiStep < 2 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                    <button onClick={handleStartCampaign} disabled={isSending || wppStatus !== 'CONNECTED'} className="w-full md:w-auto inline-flex items-center justify-center px-10 py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSending ? <FaSpinner className="animate-spin mr-3"/> : <FaRocket className="mr-3" />}
                        {isSending ? 'Enviando Mensagens...' : `Iniciar Envios para ${contactList.length} Contato(s)`}
                    </button>
                </div>
            </div>
        </div>
    );
}