// src/app/(main)/page.jsx
'use client';

import { useContext, useEffect } from 'react';
import { AppContext } from '@/context/AppContext';

export default function HomePage() {
  const { setHeaderContent } = useContext(AppContext);

  // Efeito para limpar o título do Header nesta página específica
  useEffect(() => {
    setHeaderContent({ title: '', controls: null });
    // Limpa ao sair do componente
    return () => setHeaderContent({ title: '', controls: null });
  }, [setHeaderContent]);

  return (
    <div className="flex items-center justify-center h-full p-4">
      <div className="text-center">
        
        {/* Título principal com o estilo da imagem */}
        <h1 className="text-8xl md:text-10xl font-extrabold uppercase tracking-wider text-[#4fc0db] uppercase">
          Plug Score
        </h1>
        
        {/* Slogan com o estilo da imagem */}
        <p className="mt-4 text-xl md:text-4xl font-light tracking-widest text-gray-400">
          qualifique, pontue, converta
        </p>
        
      </div>
    </div>
  );
}

