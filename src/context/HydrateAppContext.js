//F:\plugscore\src\context\HydrateAppContext.js
'use client';

import { useContext, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';

// Este componente serve como uma "ponte" para injetar dados do servidor no contexto do cliente.
export default function HydrateAppContext({ userProfile }) {
    const { setUserProfile } = useContext(AppContext);

    useEffect(() => {
        // Quando o componente carrega, ele usa a prop userProfile (vinda do servidor)
        // para alimentar o nosso contexto global.
        if (userProfile) {
            setUserProfile(userProfile);
        }
    }, [userProfile, setUserProfile]);

    return null; // Este componente não renderiza nada na tela.
}