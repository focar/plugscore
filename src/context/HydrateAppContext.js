//F:\plugscore\src\context\HydrateAppContext.js

'use client';

import { useContext, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';

export default function HydrateAppContext({ userProfile }) {
    const { setUserProfile } = useContext(AppContext);

    // ✅ --- A CORREÇÃO FINAL --- ✅
    // O useEffect agora depende do ID do utilizador, que é uma string estável.
    // Ele só será executado UMA VEZ quando o perfil for carregado pela primeira vez,
    // ou se, por algum motivo, um utilizador completamente diferente fizer login.
    // Isto QUEBRA o loop infinito de forma definitiva.
    useEffect(() => {
        if (userProfile) {
            setUserProfile(userProfile);
        }
    }, [userProfile?.id, setUserProfile]); // A dependência agora é o ID do perfil

    return null; // Este componente não renderiza nada na tela.
}