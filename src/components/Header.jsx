//src/components/Header.jsx
'use client';

import { useContext, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Sun, Moon, Menu as MenuIcon } from 'lucide-react'; // Usando lucide para consistência

export default function Header({ userProfile }) {
    const { 
        theme, setTheme, headerContent, 
        selectedClientId, setSelectedClientId, 
        allClients, setAllClients, 
        setIsMobileMenuOpen 
    } = useContext(AppContext);
    
    const supabase = createClientComponentClient();
    const userRole = userProfile?.role; // Extraído para estabilidade

    useEffect(() => {
        const fetchClients = async () => {
            if (userRole === 'admin') {
                const { data: clientsData, error } = await supabase.from('clientes').select('id, nome, codigo').order('nome');
                if (error) { console.error('Erro ao buscar clientes:', error); setAllClients([]); } 
                else { setAllClients(clientsData || []); }
            } else { setAllClients([]); }
        };
        fetchClients();
    }, [userRole, setAllClients, supabase]); 


    const toggleTheme = () => { setTheme(theme === 'light' ? 'dark' : 'light'); };
    const title = headerContent?.title || '';
    const controls = headerContent?.controls || null;
    
    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10 p-4 sticky top-0">
            {/* O div principal usa flex-wrap para empilhar Título e Controles em telas pequenas */}
            <div className="flex flex-wrap items-center justify-between gap-4 min-h-[40px]">
                
                {/* Grupo Esquerdo (Título) */}
                <div className="flex items-center gap-2 flex-grow min-w-0"> 
                    <button 
                        className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Abrir menu"
                    >
                        <MenuIcon size={24} />
                    </button>
                    <h1 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {title}
                    </h1>
                </div>

                {/* Grupo Direito (Controles) */}
                {/* MUDANÇA: Adicionado w-full sm:w-auto. Faz o grupo ocupar a linha inteira no mobile, empilhando abaixo do título */}
                <div className="flex items-center flex-wrap justify-end gap-2 sm:gap-4 flex-shrink-0 w-full sm:w-auto">
                    
                    {/* Controles (Dropdown de Lançamento) */}
                    {/* MUDANÇA: w-full sm:w-auto para fazer o dropdown ocupar 100% no mobile */}
                    <div className="flex-shrink-0 min-w-0 w-full sm:w-auto">{controls}</div>
                    
                    {/* Filtro de Cliente */}
                    {(userProfile?.role === 'admin' && allClients.length > 0) && (
                        /* MUDANÇA: Adicionado w-full sm:w-auto ao wrapper */
                        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                            <label htmlFor="client-filter" className="text-sm font-medium text-gray-500 dark:text-gray-400 hidden sm:block">Cliente:</label>
                            <select 
                                id="client-filter"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                /* MUDANÇA: Mudado w-auto para w-full para preencher o wrapper */
                                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                            >
                                <option value="all">Todos os Clientes</option>
                                {allClients.map(client => ( <option key={client.id} value={client.id}>{client.nome}</option> ))}
                            </select>
                        </div>
                    )}

                    {/* Botão de Tema */}
                    <button 
                        onClick={toggleTheme} 
                        /* MUDANÇA: ml-auto para empurrar para a direita */
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 flex-shrink-0 ml-auto"
                        aria-label="Alterar tema"
                    >
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </div>
        </header>
    );
}

