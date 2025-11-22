// src/app/(main)/page.jsx
'use client';

import { useContext, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';
import { Great_Vibes } from 'next/font/google';

// Configuração da fonte cursiva
const cursiveFont = Great_Vibes({ 
  subsets: ['latin'], 
  weight: '400',
  display: 'swap',
});

export default function HomePage() {
  const { setHeaderContent } = useContext(AppContext);

  useEffect(() => {
    setHeaderContent({ title: '', controls: null });
    return () => setHeaderContent({ title: '', controls: null });
  }, [setHeaderContent]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 select-none overflow-hidden">
      <div className="text-center">
        
        {/* Título principal */}
        <h1 className="text-6xl sm:text-8xl md:text-9xl font-extrabold uppercase tracking-widest text-[#4fc0db] drop-shadow-sm mb-2 sm:mb-6">
          PLUG SCORE
        </h1>
        
        {/* Container Flex para alinhar lado a lado */}
        <div className="flex flex-row items-center justify-center gap-4 sm:gap-12">
            
            {/* LADO ESQUERDO: Slogan Alinhado à Esquerda */}
            <div className="flex flex-col items-start text-right text-xl sm:text-3xl md:text-5xl font-light tracking-[0.15em] text-slate-500 dark:text-gray-400 lowercase space-y-0 sm:space-y-1">
              <p>qualifique,</p>
              <p>pontue,</p>
              <p>converta.</p>
            </div>

            {/* LADO DIREITO: Clássico */}
            <div className={`${cursiveFont.className} text-[#4fc0db] text-10xl sm:text-10xl md:text-9xl -rotate-12 pt-2`}>
             {/*Perpétuo*/}
             Clássico
            </div>

        </div>
        
      </div>
    </div>
  );
}