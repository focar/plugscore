'use client';

import { useContext, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Sun, Moon, Menu as MenuIcon, LayoutDashboard, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation'; // Importante para o redirecionamento

export default function Header({ userProfile }) {
    const { 
        theme, setTheme, headerContent, 
        selectedClientId, setSelectedClientId, 
        allClients, setAllClients, 
        setIsMobileMenuOpen,
        currentMode, setCurrentMode
    } = useContext(AppContext);
    
    const router = useRouter();
    const supabase = createClientComponentClient();
    const userRole = userProfile?.role;

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
    
    // Função que troca o modo e limpa a tela
    const handleModeChange = (e) => {
        const newMode = e.target.value;
        setCurrentMode(newMode);
        router.push('/'); 
    };

    const title = headerContent?.title || '';
    const controls = headerContent?.controls || null;
    
    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10 p-4 sticky top-0">
            <div className="flex flex-wrap items-center justify-between gap-4 min-h-[40px]">
                
                {/* Esquerda */}
                <div className="flex items-center gap-2 flex-grow min-w-0"> 
                    <button 
                        className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 lg:hidden"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <MenuIcon size={24} />
                    </button>
                    <h1 className="text-lg md:text-xl font-semibold text-gray-800 dark:text-gray-100 truncate">
                        {title}
                    </h1>
                </div>

                {/* Direita */}
                <div className="flex items-center flex-wrap justify-end gap-2 sm:gap-4 flex-shrink-0 w-full sm:w-auto">
                    
                    {/* --- 1. SELETOR DE MODO (AGORA VISÍVEL SEMPRE) --- */}
                    <div className="relative flex items-center">
                        <LayoutDashboard size={16} className="text-white absolute left-3 z-10 pointer-events-none" />
                        
                        <select
                            value={currentMode}
                            onChange={handleModeChange}
                            className="appearance-none bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold uppercase tracking-wide rounded-lg py-2 pl-9 pr-8 border-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-sm transition-colors"
                        >
                            <option value="CLASSICO" className="bg-white text-gray-900 py-1">Modo Clássico</option>
                            <option value="PERPETUO" className="bg-white text-gray-900 py-1">Modo Perpétuo</option>
                        </select>
                        
                        <ChevronDown size={14} className="text-white absolute right-3 z-10 pointer-events-none" />
                    </div>

                    {/* 2. Controles da Página */}
                    <div className="flex-shrink-0 min-w-0 w-full sm:w-auto">{controls}</div>
                    
                    {/* 3. Filtro de Cliente */}
                    {(userProfile?.role === 'admin' && allClients.length > 0) && (
                        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
                            <select 
                                value={selectedClientId}
                                onChange={(e) => setSelectedClientId(e.target.value)}
                                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                            >
                                <option value="all">Cliente: Todos</option>
                                {allClients.map(client => ( <option key={client.id} value={client.id}>{client.nome}</option> ))}
                            </select>
                        </div>
                    )}

                    <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 flex-shrink-0">
                        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                </div>
            </div>
        </header>
    );
}