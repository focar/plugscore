// src/context/AppContext.js
'use client';

import React, { createContext, useState, useEffect, useMemo } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    // ESTADOS EXISTENTES
    const [theme, setTheme] = useState('dark');
    const [headerContent, setHeaderContent] = useState({ title: '', controls: null });
    const [selectedClientId, setSelectedClientId] = useState('all');
    const [allClients, setAllClients] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
    }, []);

    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    // ✅ --- AQUI ESTÁ A CORREÇÃO CRÍTICA --- ✅
    // O `useMemo` garante que o objeto 'value' só é recriado se um dos seus
    // valores realmente mudar. Isto impede re-renderizações desnecessárias
    // em todos os componentes que consomem este contexto, quebrando o loop.
    const value = useMemo(() => ({
        theme,
        setTheme,
        headerContent,
        setHeaderContent,
        selectedClientId,
        setSelectedClientId,
        allClients,
        setAllClients,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        userProfile,
        setUserProfile,
    }), [
        theme, 
        headerContent, 
        selectedClientId, 
        allClients, 
        isMobileMenuOpen, 
        userProfile
    ]);

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};