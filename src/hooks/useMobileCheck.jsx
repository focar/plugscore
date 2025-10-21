// /src/hooks/useMobileCheck.js
'use client';

import { useState, useEffect } from 'react';

export default function useMobileCheck(breakpoint = 768) {
    // Inicializa o estado como 'false' para evitar problemas na renderização inicial do servidor
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        // A função só será executada no lado do cliente
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < breakpoint);
        };

        // Verifica o tamanho da tela quando o componente é montado no cliente
        checkScreenSize();

        // Adiciona um listener para quando a janela for redimensionada
        window.addEventListener('resize', checkScreenSize);

        // Função de limpeza para remover o listener
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [breakpoint]); // Roda novamente se o breakpoint mudar

    return isMobile;
}