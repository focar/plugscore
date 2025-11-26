// src/context/AppContext.js
'use client';

import React, { createContext, useState, useEffect, useMemo } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    const supabase = createClientComponentClient();

    // Visuais
    const [theme, setTheme] = useState('dark');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [headerContent, setHeaderContent] = useState({ title: '', controls: null });

    // Dados
    const [userProfile, setUserProfile] = useState(null);
    const [selectedClientId, setSelectedClientId] = useState('all');
    const [allClients, setAllClients] = useState([]);

    // Navegação e Lançamentos
    const [currentMode, setCurrentMode] = useState('CLASSICO');
    const [selectedLaunch, setSelectedLaunch] = useState(''); 
    const [globalLaunches, setGlobalLaunches] = useState([]); // Array vazio inicial
    const [isLoadingLaunches, setIsLoadingLaunches] = useState(false);

    // 1. Carregar Preferências
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
        const savedMode = localStorage.getItem('app_mode') || 'CLASSICO';
        setCurrentMode(savedMode);
    }, []);

    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('app_mode', currentMode);
    }, [currentMode]);

    // 2. BUSCA AUTOMÁTICA DE LANÇAMENTOS (BLINDADA)
    useEffect(() => {
        if (!userProfile) return;

        const fetchGlobalLaunches = async () => {
            setIsLoadingLaunches(true);
            // Reset seguro: Garante array vazio antes de buscar
            setGlobalLaunches([]); 
            
            if (userProfile.role === 'admin' && selectedClientId === 'all') {
                setSelectedLaunch('');
                setIsLoadingLaunches(false);
                return;
            }

            const clientIdToSend = userProfile.role === 'admin' ? selectedClientId : userProfile.cliente_id;

            try {
                const { data, error } = await supabase.rpc('get_lancamentos_permitidos', { p_client_id: clientIdToSend });
                
                if (error) {
                    console.error("Erro ao buscar lançamentos:", error);
                    setGlobalLaunches([]); // Em caso de erro, array vazio
                } else {
                    // Garante que data é array
                    const listaSegura = Array.isArray(data) ? data : [];
                    const sorted = listaSegura.sort((a, b) => a.nome.localeCompare(b.nome));
                    
                    setGlobalLaunches(sorted);
                    
                    // Valida se o lançamento selecionado ainda existe na nova lista
                    const launchStillValid = sorted.find(l => l.id === selectedLaunch);
                    if (!launchStillValid) {
                        setSelectedLaunch('');
                    } else {
                        // Sincroniza o modo se necessário
                        const modoCorreto = launchStillValid.modalidade || 'CLASSICO';
                        if (currentMode !== modoCorreto) {
                            setCurrentMode(modoCorreto);
                        }
                    }
                }
            } catch (err) {
                console.error("Erro fatal ao buscar lançamentos:", err);
                setGlobalLaunches([]); // Array vazio na falha
            } finally {
                setIsLoadingLaunches(false);
            }
        };

        fetchGlobalLaunches();
        
    }, [selectedClientId, userProfile, supabase]); 

    const value = useMemo(() => ({
        theme, setTheme,
        isMobileMenuOpen, setIsMobileMenuOpen,
        headerContent, setHeaderContent,
        userProfile, setUserProfile,
        selectedClientId, setSelectedClientId,
        allClients, setAllClients,
        
        currentMode, setCurrentMode,
        selectedLaunch, setSelectedLaunch,
        globalLaunches, setGlobalLaunches,
        isLoadingLaunches
    }), [
        theme, isMobileMenuOpen, headerContent, userProfile, 
        selectedClientId, allClients, currentMode, selectedLaunch,
        globalLaunches, isLoadingLaunches
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};