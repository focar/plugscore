// src/context/AppContext.js
'use client';

import React, { createContext, useState, useEffect } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
    // ESTADOS EXISTENTES
    const [theme, setTheme] = useState('dark');
    const [headerContent, setHeaderContent] = useState({ title: '', controls: null });
    const [selectedClientId, setSelectedClientId] = useState('all');
    const [allClients, setAllClients] = useState([]);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // --- NOVO ESTADO PARA O PERFIL DO USUÁRIO ---
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        setTheme(savedTheme);
    }, []);

    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
    }, [theme]);

    const value = {
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
        // --- EXPORTANDO O NOVO ESTADO E A FUNÇÃO ---
        userProfile,
        setUserProfile,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};