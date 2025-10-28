'use client';

// Imports locais originais para o seu projeto Next.js
import { useState, useContext, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import Papa from 'papaparse';
import toast, { Toaster } from 'react-hot-toast';
import { FaFileUpload, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

export default function ImportarCompradoresPage() {
// Usa o Supabase Client real do Next.js
const supabase = createClientComponentClient();
// @ts-ignore
// Usa o Contexto real do seu app
const { userProfile, selectedClientId, setHeaderContent } = useContext(AppContext);

const [launches, setLaunches] = useState([]);
const [selectedLaunch, setSelectedLaunch] = useState('');
const [isLoadingLaunches, setIsLoadingLaunches] = useState(true);

const [file, setFile] = useState(null);
const [isProcessing, setIsProcessing] = useState(false);
const [feedback, setFeedback] = useState({ message: '', type: '' });

useEffect(() => {
// @ts-ignore
setHeaderContent({ title: 'Importar Compradores', controls: null });
if (!userProfile) return;
const fetchLaunches = async () => {
setIsLoadingLaunches(true);
// @ts-ignore
const clientIdToSend = userProfile.role === 'admin' ? (selectedClientId === 'all' ? null : selectedClientId) : userProfile.cliente_id;
if (!clientIdToSend) {
setLaunches([]);
setIsLoadingLaunches(false);
return;
}

// Chamada RPC real
const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });

if (error) {
toast.error("Erro ao buscar lançamentos.");
setLaunches([]);
} else {
// @ts-ignore
const filteredLaunches = (data || []).filter(l => l.status === 'Em andamento' || l.status === 'Concluído');
setLaunches(filteredLaunches);
if (filteredLaunches.length > 0) {
// @ts-ignore
setSelectedLaunch(filteredLaunches[0].id);
}
}
setIsLoadingLaunches(false);
};

fetchLaunches();

// @ts-ignore
return () => setHeaderContent({ title: '', controls: null });
}, [userProfile, selectedClientId, supabase, setHeaderContent]);


const handleFileChange = (e) => {
// @ts-ignore
const selectedFile = e.target.files[0];
// @ts-ignore
if (selectedFile && (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv'))) {
setFile(selectedFile);
setFeedback({ message: '', type: '' });
} else {
setFile(null);
toast.error('Por favor, selecione um arquivo no formato CSV.');
}
};

/**
* Tenta analisar uma string de data (incluindo formatos comuns do Brasil e EUA)
* e a converte para o formato ISO (que o Supabase entende).
*/
const parseDateToISO = (dateString) => {
if (!dateString) return null;
try {
// --- TENTATIVA 1: Formato Brasileiro (DD/MM/YYYY HH:MM ou HH:MM:SS) ---
const partsBR = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ ]?(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
if (partsBR) {
const day = partsBR[1];
const month = partsBR[2];
const year = partsBR[3];
const hour = partsBR[4] || '00';
const minute = partsBR[5] || '00';
const second = partsBR[6] || '00';
// Formato ISO: YYYY-MM-DDTHH:MM:SS
const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
const d = new Date(isoString);

// Verifica se a data construída (DD/MM) é válida.
if (!isNaN(d.getTime()) && d.getDate() == parseInt(day)) {
return d.toISOString();
}
}

// --- TENTATIVA 2: Formato Americano (MM/DD/YYYY) ou ISO nativo ---
const parsedDate = new Date(dateString);
if (!isNaN(parsedDate.getTime())) {
return parsedDate.toISOString();
}

console.warn(`Formato de data não reconhecido: ${dateString}`);
return null;
} catch (e) {
console.warn(`Erro ao analisar data: ${dateString}`, e);
return null;
}
}

const handleProcessFile = () => {
if (!selectedLaunch) { toast.error('Por favor, selecione um lançamento.'); return; }
if (!file) { toast.error('Nenhum arquivo selecionado.'); return; }

setIsProcessing(true);
setFeedback({ message: 'Lendo e processando o arquivo...', type: 'loading' });
const processingToast = toast.loading('Enviando registros...');

Papa.parse(file, {
header: true,
skipEmptyLines: true,
delimiter: ";", // Delimitador ponto e vírgula
complete: async (results) => {

// @ts-ignore
const registrosParaSalvar = results.data.map(row => {
// Procura flexível por Email
// @ts-ignore
const emailKey = Object.keys(row).find(key =>
key.toLowerCase().includes('email') ||
key.toLowerCase().includes('e-mail')
);
// Procura flexível por Data
// @ts-ignore
const dateKey = Object.keys(row).find(key => key.toLowerCase() === 'data' || key.toLowerCase() === 'data_compra');
// @ts-ignore
const email = emailKey ? row[emailKey] : null;
// @ts-ignore
const data_compra_string = dateKey ? row[dateKey] : null;
const data_compra_iso = parseDateToISO(data_compra_string);

// Agrupa todas as OUTRAS colunas
const respostas_brutas = {};
// @ts-ignore
Object.keys(row).forEach(key => {
if (key !== emailKey && key !== dateKey) {
// @ts-ignore
respostas_brutas[key] = row[key];
}
});

// Validação
if (!email || !data_compra_iso) {
if (!email) console.warn('Linha ignorada: Email não encontrado.', row);
if (!data_compra_iso) console.warn('Linha ignorada: Data inválida ou não encontrada.', data_compra_string, row);
return null;
}
return {
launch_id: selectedLaunch,
email: email.trim().toLowerCase(),
comprador_at: data_compra_iso,
respostas_brutas: respostas_brutas,
status: 'pendente' // Status inicial
};
}).filter(item => item !== null); // Remove linhas inválidas

if (registrosParaSalvar.length === 0) {
setIsProcessing(false);
const errorMessage = "Nenhuma linha válida encontrada. Verifique se o CSV tem colunas de 'Email' e 'Data' (com data válida) e é separado por ponto e vírgula (;).";
setFeedback({ message: errorMessage, type: 'error' });
toast.error(errorMessage, { id: processingToast });
return;
}

// --- PASSO 1: INSERIR O LOTE NA TABELA (Chamada real) ---
// @ts-ignore
const { error: insertError } = await supabase
.from('registros_compradores')
// @ts-ignore
.insert(registrosParaSalvar);

if (insertError) {
setIsProcessing(false);
// @ts-ignore
setFeedback({ message: `Erro ao salvar registros: ${insertError.message}`, type: 'error' });
// @ts-ignore
toast.error(`Erro: ${insertError.message}`, { id: processingToast });
return;
}
toast.success(`${registrosParaSalvar.length} registros enviados. Iniciando processamento do lote...`, { id: processingToast });

// --- PASSO 2: CHAMAR A FUNÇÃO DE LOTE (Chamada real) ---
// @ts-ignore
const { data: rpcData, error: rpcError } = await supabase.rpc('processar_pendentes_compradores');

if (rpcError) {
setIsProcessing(false);
// @ts-ignore
setFeedback({ message: `Lote salvo, mas falhou ao iniciar processamento: ${rpcError.message}`, type: 'error' });
// @ts-ignore
toast.error(`Falha ao iniciar processamento: ${rpcError.message}`, { id: processingToast, duration: 5000 });
} else {
setIsProcessing(false);
// @ts-ignore
const successMessage = `Lote salvo. ${rpcData || 'Processamento concluído.'}`;
setFeedback({ message: successMessage, type: 'success' });
toast.success(successMessage, { id: processingToast, duration: 5000 });
}
},
// @ts-ignore
error: (error) => {
setIsProcessing(false);
// @ts-ignore
setFeedback({ message: `Erro ao ler o arquivo CSV: ${error.message}`, type: 'error' });
// @ts-ignore
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
<p className="text-slate-500 dark:text-gray-400">
Faça o upload de um arquivo CSV (separado por ';') contendo os dados dos compradores.
O sistema irá ler <strong>todas</strong> as colunas.
</p>
<p className="text-sm text-slate-500 dark:text-gray-400 mt-2">
Obrigatório: Colunas 'Email' e 'Data' (ou 'Data_Compra') com formato de data válido (ex: DD/MM/YYYY).
</p>
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
// @ts-ignore
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
accept=".csv,text/csv"
onChange={handleFileChange}
disabled={isProcessing}
/>
<label htmlFor="csvUploader" className={`cursor-pointer font-semibold text-blue-600 dark:text-blue-400 hover:underline ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}>
{/* @ts-ignore */}
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
// @ts-ignore
backgroundColor: feedback.type === 'success' ? '#dcfce7' : feedback.type === 'error' ? '#fee2e2' : '#e0f2fe',
// @ts-ignore
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

