// src/components/Header.jsx
'use client';

import { useContext, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';


// Ícones
const SunIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path></svg>);
const MoonIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>);
const MenuIcon = (props) => (<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>);


export default function Header({ userProfile }) {
    const { 
        theme, setTheme, headerContent, 
        selectedClientId, setSelectedClientId, 
        allClients, setAllClients, // Pegando a função setAllClients
        setIsMobileMenuOpen 
    } = useContext(AppContext);
    
    const supabase = createClientComponentClient();

    // --- NOVA LÓGICA PARA BUSCAR CLIENTES ---
    useEffect(() => {
        const fetchClients = async () => {
            // A verificação de admin agora usa o userProfile que vem do servidor, que é mais confiável
            if (userProfile?.role === 'admin') {
                const { data: clientsData, error } = await supabase.from('clientes').select('id, nome').order('nome');
                if (error) {
                    console.error('Erro ao buscar clientes:', error);
                    setAllClients([]);
                } else {
                    setAllClients(clientsData || []);
                }
            } else {
                // Garante que a lista esteja vazia para não-admins
                setAllClients([]);
            }
        };
        fetchClients();
    }, [userProfile, setAllClients, supabase]); // Executa quando o userProfile estiver disponível


    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };
    
    const title = headerContent?.title || '';
    const controls = headerContent?.controls || null;
    
    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10 p-4">
            <div className="flex items-center justify-between h-full min-h-[40px] gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(true)}
                        aria-label="Abrir menu"
                    >
                        <MenuIcon />
                    </button>
                    <div className="flex-shrink-0">
                        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200 truncate">
                           {title}
                        </h1>
                    </div>
                </div>

                <div className="flex-grow flex justify-center">
                    {controls}
                </div>
                
                <div className="flex-shrink-0 flex items-center gap-4">
                    {/* A condição para exibir o dropdown permanece a mesma, mas agora ela funcionará de forma confiável */}
                    {(userProfile?.role === 'admin' && allClients.length > 0) && (
                        <div className="flex items-center gap-2">
                            <label htmlFor="client-filter" className="text-sm font-medium text-gray-500 dark:text-gray-400 hidden sm:block">Cliente:</label>
                            <select 
                                id="client-filter"
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                            >
                                <option value="all">Todos os Clientes</option>
                                {allClients.map(client => (
                                    <option key={client.id} value={client.id}>{client.nome}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <button 
                        onClick={toggleTheme} 
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Alterar tema"
                    >
                        {theme === 'dark' ? <SunIcon className="text-yellow-400" /> : <MoonIcon className="text-gray-600" />}
                    </button>
                </div>
            </div>
        </header>
    );
}