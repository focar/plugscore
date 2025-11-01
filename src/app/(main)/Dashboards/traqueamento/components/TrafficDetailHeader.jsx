// src/app/(main)/Dashboards/traqueamento/components/TrafficDetailHeader.jsx
'use client';

import { FaChevronLeft } from "react-icons/fa";
import { useRouter, usePathname } from 'next/navigation'; // Adicionado usePathname
import Link from 'next/link'; // Adicionado Link
import { FaChartBar, FaBullseye, FaCalendarDay } from "react-icons/fa"; // Adicionado ícones

// --- NOVO COMPONENTE: TrafficDetailTabs para não repetir o código ---
function TrafficDetailTabs({ basePath, launchId, launchName }) {
    const pathname = usePathname();
    const query = `?launchId=${launchId}&launchName=${launchName}`;

    const tabs = [
        { name: 'SCORE', href: `${basePath}/score${query}`, icon: FaBullseye, key: '/score' },
        { name: 'MQL', href: `${basePath}/mql${query}`, icon: FaChartBar, key: '/mql' },
        { name: 'Mov. Diário', href: `${basePath}/mov-diario${query}`, icon: FaCalendarDay, key: '/mov-diario' }
    ];

    const getButtonClass = (key) => {
        // Verifica se o pathname termina com a chave da tab
        const isActive = pathname.endsWith(key); 
        const baseClasses = "flex-1 sm:flex-none flex justify-center items-center gap-2 sm:gap-3 font-semibold px-4 py-3 rounded-lg shadow-md transition-colors";
        
        return isActive
            ? `${baseClasses} bg-blue-600 text-white cursor-default`
            : `${baseClasses} bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700`;
    };

    return (
        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = pathname.endsWith(tab.key);
                return (
                    <Link 
                        key={tab.key} 
                        href={tab.href}
                        passHref
                        className={`${getButtonClass(tab.key)} ${isActive ? 'pointer-events-none' : ''}`}
                        aria-disabled={isActive}
                        tabIndex={isActive ? -1 : undefined}
                    >
                        <Icon size={16} /> {tab.name}
                    </Link>
                );
            })}
        </div>
    );
}
// --- FIM DO NOVO COMPONENTE TrafficDetailTabs ---


/**
 * Componente unificado para o cabeçalho das páginas de detalhe (Score, MQL, Mov. Diário).
 */
export default function TrafficDetailHeader({ launchId, launchName, typeTitle, typePath }) {
    const router = useRouter();
    const basePath = "/Dashboards/traqueamento/detalhe-pago"; 

    const handleVoltar = () => {
        sessionStorage.setItem('persistLaunchId', launchId);
        router.push('/Dashboards/traqueamento'); // Volta para a pág. principal
    };

    return (
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
            
            {/* ITEM 1 (ESQUERDA): Título/Contexto Alinhado */}
            <div className="flex flex-col flex-shrink-0">
                <p className="text-lg text-gray-600 dark:text-gray-300 uppercase">{typeTitle} - Tráfego Pago</p>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">{launchName}</h1>
            </div>

            {/* ITEM 2 (DIREITA): Abas + Voltar */}
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-start md:justify-end">
                <TrafficDetailTabs 
                    basePath={basePath} 
                    launchId={launchId} 
                    launchName={launchName} 
                />
                <button onClick={handleVoltar} className="flex-shrink-0 flex items-center justify-center gap-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                    <FaChevronLeft size={14} /> Voltar
                </button>
            </div>
        </div>
    );
}