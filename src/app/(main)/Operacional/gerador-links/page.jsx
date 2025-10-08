// src/app/(main)/Operacional/gerador-de-links/page.jsx

'use client';

import React from 'react';
import { useState, useEffect, useContext } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AppContext } from '@/context/AppContext';
import toast, { Toaster } from 'react-hot-toast';
import { FaSave, FaTrash, FaDownload } from 'react-icons/fa';

// --- Componentes ---
const Input = (props) => (
    <input 
        {...props} 
        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" 
    />
);

const Button = ({ children, onClick, disabled = false, variant = 'primary', className = '', ...props }) => {
    const baseClasses = "px-4 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary: "bg-blue-600 text-white hover:bg-blue-700",
        secondary: "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-500",
        danger: "bg-red-600 text-white hover:bg-red-700",
        success: "bg-green-600 text-white hover:bg-green-700"
    };
    return (
        <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md m-4">
                <div className="flex justify-between items-center border-b pb-3 mb-4 dark:border-gray-600">
                    <h3 className="text-xl font-semibold">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-3xl leading-none">&times;</button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};


export default function GeradorDeLinksPage() {
    const supabase = createClientComponentClient();
    const { userProfile, selectedClientId, setHeaderContent, allClients } = useContext(AppContext);

    const initialFormData = {
        baseURL: '', baseAtalho: '',
        insc_suffix: '-org', insc_shortLinkBase: 'jornadanovaera', insc_redirectPrefix: 'kr',
        vend_suffix: '-mfm', vend_shortLinkBase: 'jornadanovaera', vend_redirectPrefix: 'kr',
        bole_suffix: '-boleto-aviso', bole_shortLinkBase: 'mfm_bp', bole_redirectPrefix: 'kr'
    };

    const [formData, setFormData] = useState(initialFormData);
    const [generatedLinks, setGeneratedLinks] = useState([]);
    const [savedConfigs, setSavedConfigs] = useState([]);
    const [selectedConfigId, setSelectedConfigId] = useState('');
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [newConfigName, setNewConfigName] = useState('');
    const [saveAsClientId, setSaveAsClientId] = useState(''); // Novo estado para o dropdown no modal

    const [exportSections, setExportSections] = useState({
        'INSCRIÇÃO': true,
        'VENDAS': true,
        'BOLETO': true
    });

    // Efeito para carregar o script do Excel (SheetJS)
    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        }
    }, []);
    
    // Efeito para configurar o Header
    useEffect(() => {
        setHeaderContent({ title: 'Gerador de Links de Campanha', controls: null });
        return () => setHeaderContent({ title: '', controls: null });
    }, [setHeaderContent]);
    
    // Lógica para determinar qual client_id usar nas queries
    const getClientIdForQuery = () => {
        if (!userProfile) return null;
        if (userProfile.role === 'admin') {
            return selectedClientId === 'all' ? null : selectedClientId;
        }
        return userProfile.cliente_id;
    };

    // Efeito para buscar as configurações salvas, agora dependente do cliente selecionado
    const fetchSavedConfigs = async () => {
        if (!userProfile) return;
        
        const clientId = getClientIdForQuery();
        
        let query = supabase.from('gerador_links').select('*').order('nome_config');

        if (clientId) {
            query = query.eq('cliente_id', clientId);
        } else if (userProfile.role === 'admin' && selectedClientId === 'all') {
            setSavedConfigs([]); // Admin em modo "Todos" não carrega nenhuma config, deve escolher um cliente
            return;
        } else if (userProfile.role !== 'admin' && !userProfile.cliente_id) {
            setSavedConfigs([]);
            return;
        }
        
        const { data, error } = await query;
        
        if (error) {
            toast.error('Erro ao carregar configurações salvas.');
            console.error(error);
        } else {
            setSavedConfigs(data || []);
        }
    };
    
    useEffect(() => {
        fetchSavedConfigs();
        setSelectedConfigId('');
        setFormData(initialFormData);
        setGeneratedLinks([]);
    }, [userProfile, selectedClientId]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleLoadConfig = (e) => {
        const configId = e.target.value;
        setSelectedConfigId(configId);
        if (configId) {
            const configToLoad = savedConfigs.find(c => c.id === configId);
            if (configToLoad) {
                setFormData(configToLoad.dados_config);
                setGeneratedLinks([]);
            }
        } else {
            setFormData(initialFormData);
            setGeneratedLinks([]);
        }
    };

    const handleSave = async () => {
        if (!selectedConfigId) {
            setIsSaveModalOpen(true);
            return;
        }
        const toastId = toast.loading('A atualizar configuração...');
        const { error } = await supabase
            .from('gerador_links')
            .update({ dados_config: formData })
            .eq('id', selectedConfigId);

        if (error) {
            toast.error('Falha ao atualizar.', { id: toastId });
        } else {
            toast.success('Configuração atualizada!', { id: toastId });
            await fetchSavedConfigs();
        }
    };

    const handleSaveAs = async (e) => {
        e.preventDefault();
        if (!newConfigName.trim()) {
            toast.error("O nome não pode estar vazio.");
            return;
        }

        let clientIdToSave = getClientIdForQuery();
        
        // Regra de negócio: Se admin, o cliente deve ser selecionado no modal
        if (userProfile?.role === 'admin' && !userProfile.cliente_id) {
             if (!saveAsClientId) {
                toast.error("Por favor, selecione um cliente para associar esta configuração.");
                return;
             }
             clientIdToSave = saveAsClientId;
        }

        if (!clientIdToSave) {
            toast.error("Não é possível guardar: cliente não identificado.");
            return;
        }

        const toastId = toast.loading('A guardar nova configuração...');
        const { data, error } = await supabase
            .from('gerador_links')
            .insert({ 
                nome_config: newConfigName, 
                dados_config: formData,
                cliente_id: clientIdToSave 
            })
            .select()
            .single();
        
        if (error) {
            toast.error('Falha ao guardar.', { id: toastId });
            console.error(error);
        } else {
            toast.success('Configuração guardada!', { id: toastId });
            await fetchSavedConfigs();
            setSelectedConfigId(data.id);
            setIsSaveModalOpen(false);
            setNewConfigName('');
            setSaveAsClientId('');
        }
    };

    const handleDelete = async () => {
        if (!selectedConfigId) return;
        if (confirm("Tem a certeza que quer apagar esta configuração?")) {
            const toastId = toast.loading('A apagar...');
            const { error } = await supabase
                .from('gerador_links')
                .delete()
                .eq('id', selectedConfigId);
            
            if (error) {
                 toast.error('Falha ao apagar.', { id: toastId });
            } else {
                toast.success('Configuração apagada.', { id: toastId });
                setSelectedConfigId('');
                setFormData(initialFormData);
                await fetchSavedConfigs();
            }
        }
    };

    const generateLinks = () => {
        const sources = [
             { header: "LISTA DE LINKS PÁGINAS DE INSCRIÇÃO" },
             { description: 'Email / Lista Anterior', shortcut: 'ema', utm_source: 'organic', utm_medium: 'email', utm_content: 'base' }, { description: 'Email / Aquecimento', shortcut: 'eml', utm_source: 'organic', utm_medium: 'email', utm_content: 'aquecimento' }, { description: 'Instagram / Bio', shortcut: 'ig', utm_source: 'organic', utm_medium: 'instagram', utm_content: 'bio' }, { description: 'Instagram / Story', shortcut: 'igs', utm_source: 'organic', utm_medium: 'instagram', utm_content: 'story' }, { description: 'Instagram / Story Rls', shortcut: 'igr', utm_source: 'organic', utm_medium: 'instagram', utm_content: 'reels' }, { description: 'Manychat / Feeds', shortcut: 'mcf', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'feed' }, { description: 'Manychat / Estático', shortcut: 'mce', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'conteudo' }, { description: 'Manychat / Lives Aquecimento', shortcut: 'mcla', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'live' }, { description: 'Manychat / Carrossel', shortcut: 'mcc', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'carrossel' }, { description: 'Site / Indicação', shortcut: 'indicacao', utm_source: 'organic', utm_medium: 'site', utm_content: 'indicacao' }, { description: 'Site / Ingresso', shortcut: 'ingresso', utm_source: 'organic', utm_medium: 'site', utm_content: 'ingresso' }, { description: 'Site / Lives Aquecimento', shortcut: 'aulas', utm_source: 'organic', utm_medium: 'site', utm_content: 'aula_aquecimento' }, { description: 'Site / Mini-Aula', shortcut: 'miniaula', utm_source: 'organic', utm_medium: 'site', utm_content: 'miniaula' }, { description: 'Site / Sorteio', shortcut: 'sorteio', utm_source: 'organic', utm_medium: 'site', utm_content: 'sorteio' }, { description: 'Facebook / Bio', shortcut: 'fb', utm_source: 'organic', utm_medium: 'facebook', utm_content: 'bio' }, { description: 'Facebook / Post (Feed)', shortcut: 'fol', utm_source: 'organic', utm_medium: 'facebook', utm_content: 'feed' }, { description: 'Facebook / Lives Aquecimento', shortcut: 'fbla', utm_source: 'organic', utm_medium: 'facebook', utm_content: 'aula_aquecimento' }, { description: 'Whatsapp / Grupos Antigos', shortcut: 'vpa', utm_source: 'organic', utm_medium: 'whatsapp', utm_content: 'base' }, { description: 'Tiktok / Bio', shortcut: 'tk', utm_source: 'organic', utm_medium: 'tiktok', utm_content: 'org' }, { description: 'Youtube / Bio', shortcut: 'yt', utm_source: 'organic', utm_medium: 'youtube', utm_content: 'bio' }, { description: 'Youtube / Lives Aquecimento', shortcut: 'ytla', utm_source: 'organic', utm_medium: 'youtube', utm_content: 'aula_aquecimento' }, { description: 'Youtube / Chat', shortcut: 'ytc', utm_source: 'organic', utm_medium: 'youtube', utm_content: 'chat' }, { description: 'Youtube / Shorts', shortcut: 'yts', utm_source: 'organic', utm_medium: 'youtube', utm_content: 'shorts' },
             { header: "LISTA DE LINKS PÁGINAS DE VENDAS" },
             { description: 'Email | Lista Atual', shortcut: 'ema', utm_source: 'organic', utm_medium: 'email', utm_content: 'atual' }, { description: 'Email | Lista Base', shortcut: 'eml', utm_source: 'organic', utm_medium: 'email', utm_content: 'base' }, { description: 'Email | Recuperação', shortcut: 'emr', utm_source: 'organic', utm_medium: 'email', utm_content: 'recupera' }, { description: 'Instagram | Bio', shortcut: 'ig', utm_source: 'organic', utm_medium: 'instagram', utm_content: 'bio' }, { description: 'Instagram | Story', shortcut: 'igs', utm_source: 'organic', utm_medium: 'instagram', utm_content: 'story' }, { description: 'Instagram | Story 10x', shortcut: 'igsx', utm_source: 'organic', utm_medium: 'instagram', utm_content: 'storyx' }, { description: 'ManyChat | Reels', shortcut: 'mcr', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'reels' }, { description: 'ManyChat | Estático', shortcut: 'mce', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'feed' }, { description: 'ManyChat | Lives Resultado', shortcut: 'mclr', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'aula_resultado' }, { description: 'ManyChat | Carrossel', shortcut: 'mcc', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'carrossel' }, { description: 'Facebook | Bio', shortcut: 'fb', utm_source: 'organic', utm_medium: 'facebook', utm_content: 'bio' }, { description: 'Facebook | Post (Feed)', shortcut: 'fbf', utm_source: 'organic', utm_medium: 'facebook', utm_content: 'feed' }, { description: 'Facebook | Live Resultado', shortcut: 'fblr', utm_source: 'organic', utm_medium: 'facebook', utm_content: 'aula_resultado' }, { description: 'Whatsapp | Grupos Antigos', shortcut: 'wpa', utm_source: 'organic', utm_medium: 'whatsapp', utm_content: 'base' }, { description: 'Whatsapp | Grupos Novos', shortcut: 'wp', utm_source: 'organic', utm_medium: 'whatsapp', utm_content: 'atual' }, { description: 'Whatsapp | Recuperação', shortcut: 'wpr', utm_source: 'organic', utm_medium: 'whatsapp', utm_content: 'recupera' }, { description: 'Whatsapp | API', shortcut: 'wpi', utm_source: 'organic', utm_medium: 'whatsapp', utm_content: 'api' }, { description: 'Tiktok | Bio', shortcut: 'tk', utm_source: 'organic', utm_medium: 'tiktok', utm_content: 'org' }, { description: 'Youtube | Bio', shortcut: 'yt', utm_source: 'organic', utm_medium: 'youtube', utm_content: 'bio' }, { description: 'Youtube | Lives Resultado', shortcut: 'ytlr', utm_source: 'organic', utm_medium: 'youtube', utm_content: 'aula_resultado' }, { description: 'Youtube / Chat', shortcut: 'ytc', utm_source: 'organic', utm_medium: 'youtube', utm_content: 'chat' }, { description: 'Youtube / Shorts', shortcut: 'yts', utm_source: 'organic', utm_medium: 'youtube', utm_content: 'shorts' },
             { header: "LISTA DE LINKS BOLETO PARCELADO" },
             { description: 'Email | Lista Atual', shortcut: 'mfn_bp_em', utm_source: 'organic', utm_medium: 'email', utm_content: 'atual' }, { description: 'Email | Lista Base', shortcut: 'mfn_bp_ema', utm_source: 'organic', utm_medium: 'email', utm_content: 'base' }, { description: 'Instagram | Story', shortcut: 'mfn_bp_igs', utm_source: 'organic', utm_medium: 'instagram', utm_content: 'story' }, { description: 'Manychat | Lives Resultado', shortcut: 'mfn_bp_mclr', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'aula_resultado' }, { description: 'Manychat | Carrossel', shortcut: 'mfn_bp_mcc', utm_source: 'organic', utm_medium: 'manychat', utm_content: 'carrossel' }, { description: 'Facebook | Post (Feed)', shortcut: 'mfn_bp_fbf', utm_source: 'organic', utm_medium: 'facebook', utm_content: 'feed' }, { description: 'Whatsapp | Grupos Antigos', shortcut: 'mfn_bp_wpa', utm_source: 'organic', utm_medium: 'whatsapp', utm_content: 'base' }, { description: 'Whatsapp | Grupos Novos', shortcut: 'mfn_bp_wp', utm_source: 'organic', utm_medium: 'whatsapp', utm_content: 'atual' }, { description: 'Whatsapp | Grupos Vip', shortcut: 'mfn_bp_vip', utm_source: 'organic', utm_medium: 'whatsapp', utm_content: 'vip' }, { description: 'Youtube | Chat', shortcut: 'mfn_bp_ytc', utm_source: 'organic', utm_medium: 'youtube', utm_content: 'chat' }
        ];

        const { baseURL, baseAtalho } = formData;
        if (!baseURL || !baseAtalho) {
            toast.error('Por favor, preencha os Parâmetros Globais da Campanha.');
            return;
        }

        const params = {
            insc: { suffix: formData.insc_suffix, shortBase: formData.insc_shortLinkBase, prefix: formData.insc_redirectPrefix },
            vend: { suffix: formData.vend_suffix, shortBase: formData.vend_shortLinkBase, prefix: formData.vend_redirectPrefix },
            bole: { suffix: formData.bole_suffix, shortBase: formData.bole_shortLinkBase, prefix: formData.bole_redirectPrefix }
        };

        const cleanBase = baseURL.replace(/\/$/, '');
        let currentSection = {};
        let currentSectionName = '';
        const links = [];

        sources.forEach(source => {
            if (source.header) {
                if (source.header.includes('INSCRIÇÃO')) { currentSection = params.insc; currentSectionName = 'INSCRIÇÃO'; }
                else if (source.header.includes('VENDAS')) { currentSection = params.vend; currentSectionName = 'VENDAS'; }
                else if (source.header.includes('BOLETO')) { currentSection = params.bole; currentSectionName = 'BOLETO'; }
                links.push({ ...source, isHeader: true, section: currentSectionName });
            } else {
                const finalShortLink = `${currentSection.shortBase}_${source.shortcut}`;
                const cleanPrefix = currentSection.prefix.replace(/^\/|\/$/g, '');
                const finalRedirectURL = `${cleanBase}/${cleanPrefix ? cleanPrefix + '/' : ''}${finalShortLink}`;
                const atalhoComSufixo = baseAtalho + currentSection.suffix;
                const fullUTMPath = `${cleanBase}/${atalhoComSufixo}`;
                const utmParams = new URLSearchParams({ utm_source: source.utm_source, utm_medium: source.utm_medium, utm_content: source.utm_content }).toString();
                const finalUTM_URL = `${fullUTMPath}?${utmParams}`;
                links.push({ ...source, finalShortLink, finalRedirectURL, finalUTM_URL, section: currentSectionName });
            }
        });
        setGeneratedLinks(links);
    };
    
    const exportToExcel = () => {
        if (typeof window.XLSX === 'undefined') {
            toast.error("A biblioteca de exportação ainda não carregou. Tente novamente em alguns segundos.");
            return;
        }

        const selectedSections = Object.keys(exportSections).filter(key => exportSections[key]);

        if (selectedSections.length === 0) {
            toast.error("Selecione pelo menos uma seção para exportar.");
            return;
        }
        
        const dataToExport = generatedLinks
            .filter(link => !link.isHeader && selectedSections.includes(link.section))
            .map(link => ({
                'Seção': link.section,
                'Descrição': link.description,
                'Link Curto': link.finalShortLink,
                'Redirecionamento': link.finalRedirectURL,
                'URL Completa com UTMs': link.finalUTM_URL
            }));

        if (dataToExport.length === 0) {
            toast.error("Não há links para exportar com a seleção atual.");
            return;
        }
            
        const worksheet = window.XLSX.utils.json_to_sheet(dataToExport);
        const workbook = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(workbook, worksheet, "Links de Campanha");
        window.XLSX.writeFile(workbook, `links_${formData.baseAtalho || 'export'}.xlsx`);
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiado!');
    };


    return (
        <div className="p-4 md:p-6 space-y-6 bg-slate-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Toaster position="top-center" />
            <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Guardar Configuração Como...">
                <form onSubmit={handleSaveAs} className="space-y-4">
                    <div>
                        <label htmlFor="config-name" className="block text-sm font-medium mb-1">Nome da Configuração</label>
                        <Input id="config-name" type="text" value={newConfigName} onChange={e => setNewConfigName(e.target.value)} placeholder="Ex: Lançamento Nova Era" />
                    </div>
                    {userProfile?.role === 'admin' && !userProfile.cliente_id && (
                         <div>
                            <label htmlFor="client-selector" className="block text-sm font-medium mb-1">Associar ao Cliente</label>
                            <select id="client-selector" value={saveAsClientId} onChange={e => setSaveAsClientId(e.target.value)} className="w-full mt-1 block px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                                <option value="">-- Selecione um cliente --</option>
                                {allClients.map(client => <option key={client.id} value={client.id}>{client.nome}</option>)}
                            </select>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4 border-t dark:border-gray-600">
                        <Button type="button" variant="secondary" onClick={() => setIsSaveModalOpen(false)}>Cancelar</Button>
                        <Button type="submit">Guardar</Button>
                    </div>
                </form>
            </Modal>
            
            <fieldset className="p-4 border dark:border-gray-700 rounded-lg">
                <legend className="px-2 font-semibold">Gestão de Configurações</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label htmlFor="config-loader" className="block text-sm font-medium mb-1">Carregar Configuração</label>
                        <select 
                            id="config-loader" 
                            value={selectedConfigId} 
                            onChange={handleLoadConfig} 
                            className="w-full mt-1 block px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm"
                            disabled={userProfile?.role === 'admin' && selectedClientId === 'all'}
                        >
                            <option value="">-- Nova Configuração --</option>
                            {savedConfigs.map(config => <option key={config.id} value={config.id}>{config.nome_config}</option>)}
                        </select>
                         {userProfile?.role === 'admin' && selectedClientId === 'all' && <p className="text-xs text-gray-500 mt-1">Por favor, selecione um cliente no topo para ver as configurações.</p>}
                    </div>
                    <div className="flex gap-2">
                         <Button onClick={handleSave} disabled={!selectedConfigId}><FaSave /> Guardar</Button>
                         <Button onClick={handleDelete} variant="danger" disabled={!selectedConfigId}><FaTrash /> Apagar</Button>
                    </div>
                    <Button 
                        onClick={() => setIsSaveModalOpen(true)} 
                        variant="secondary"
                        disabled={userProfile?.role === 'admin' && selectedClientId === 'all'}
                    >
                        Guardar Como...
                    </Button>
                </div>
            </fieldset>

            <fieldset className="p-4 border dark:border-gray-700 rounded-lg">
                <legend className="px-2 font-semibold">1. Parâmetros Globais da Campanha</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="baseURL">Endereço Principal</label>
                        <Input id="baseURL" type="text" value={formData.baseURL} onChange={handleInputChange} placeholder="https://eduser.com.br" />
                    </div>
                    <div>
                        <label htmlFor="baseAtalho">Complemento Base do Endereço</label>
                        <Input id="baseAtalho" type="text" value={formData.baseAtalho} onChange={handleInputChange} placeholder="novaera16" />
                    </div>
                </div>
            </fieldset>
            
            <fieldset className="p-4 border dark:border-gray-700 rounded-lg">
                <legend className="px-2 font-semibold">2. Configurações por Seção</legend>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                    {['insc', 'vend', 'bole'].map(section => (
                        <React.Fragment key={section}>
                            <h3 className="md:col-span-3 font-medium text-lg mt-4 border-b dark:border-gray-600 pb-1 capitalize">
                                {section === 'insc' ? 'Inscrição' : section === 'vend' ? 'Vendas' : 'Boleto'}
                            </h3>
                            <div>
                                <label htmlFor={`${section}_suffix`}>Sufixo URL</label>
                                <Input id={`${section}_suffix`} type="text" value={formData[`${section}_suffix`]} onChange={handleInputChange} />
                            </div>
                            <div>
                                <label htmlFor={`${section}_shortLinkBase`}>Base Link Curto</label>
                                <Input id={`${section}_shortLinkBase`} type="text" value={formData[`${section}_shortLinkBase`]} onChange={handleInputChange} />
                            </div>
                            <div>
                                <label htmlFor={`${section}_redirectPrefix`}>Prefixo Redirect</label>
                                <Input id={`${section}_redirectPrefix`} type="text" value={formData[`${section}_redirectPrefix`]} onChange={handleInputChange} />
                            </div>
                        </React.Fragment>
                    ))}
                </div>
            </fieldset>
            
            <div className="flex justify-center my-8">
                <Button onClick={generateLinks} className="w-full md:w-1/2 text-xl py-4 font-bold">
                    Gerar Links
                </Button>
            </div>

            {generatedLinks.length > 0 && (
                <div className="space-y-6">
                     <fieldset className="p-4 border dark:border-gray-700 rounded-lg">
                        <legend className="px-2 font-semibold">3. Exportar Links</legend>
                        <div className="flex flex-col items-center gap-4">
                             <p className="font-medium">Selecione as seções para visualizar e exportar:</p>
                            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
                                {Object.keys(exportSections).map(sectionName => (
                                     <label key={sectionName} className="flex items-center space-x-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={exportSections[sectionName]}
                                            onChange={(e) => {
                                                setExportSections(prev => ({...prev, [sectionName]: e.target.checked }));
                                            }}
                                            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-base">{sectionName.charAt(0) + sectionName.slice(1).toLowerCase()}</span>
                                    </label>
                                ))}
                            </div>
                             <Button onClick={exportToExcel} variant="success" className="w-full md:w-1/2 mt-4">
                                <FaDownload /> Exportar para Excel
                            </Button>
                        </div>
                    </fieldset>

                    <div className="overflow-x-auto">
                        <h2 className="text-2xl font-bold text-center mb-4">Links Gerados</h2>
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 dark:bg-gray-700">
                                <tr>
                                    <th className="p-3 text-left">Descrição</th>
                                    <th className="p-3 text-left">Link Curto</th>
                                    <th className="p-3 text-left">Redirecionamento</th>
                                    <th className="p-3 text-left">URL Completa com UTMs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {generatedLinks.filter(link => link.isHeader ? exportSections[link.section] : exportSections[link.section]).map((link, index) => (
                                    link.isHeader ? (
                                        <tr key={index}><td colSpan="4" className="p-2 text-center font-bold bg-blue-600 text-white">{link.header}</td></tr>
                                    ) : (
                                        <tr key={index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="p-3">{link.description}</td>
                                            <td className="p-3 font-mono break-all">{link.finalShortLink} <button className="text-xs ml-2" onClick={() => copyToClipboard(link.finalShortLink)}>📋</button></td>
                                            <td className="p-3 font-mono break-all">{link.finalRedirectURL} <button className="text-xs ml-2" onClick={() => copyToClipboard(link.finalRedirectURL)}>📋</button></td>
                                            <td className="p-3 font-mono break-all">{link.finalUTM_URL} <button className="text-xs ml-2" onClick={() => copyToClipboard(link.finalUTM_URL)}>📋</button></td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

