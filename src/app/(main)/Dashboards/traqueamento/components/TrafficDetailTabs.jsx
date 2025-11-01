
// src/app/(main)/Dashboards/traqueamento/components/TrafficDetailTabs.jsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChartBar, FaBullseye, FaCalendarDay } from "react-icons/fa";

/**
 * Renderiza as abas de navegação (Score, MQL, Mov. Diário)
 * @param {string} basePath - O caminho base (ex: /Dashboards/traqueamento/detalhe-pago)
 * @param {string} launchId - O ID do lançamento
 * @param {string} launchName - O nome do lançamento (para os query params)
 */
export default function TrafficDetailTabs({ basePath, launchId, launchName }) {
    const pathname = usePathname();
    const query = `?launchId=${launchId}&launchName=${launchName}`;

    const tabs = [
        { name: 'SCORE', href: `${basePath}/score${query}`, icon: FaBullseye, key: '/score' },
        { name: 'MQL', href: `${basePath}/mql${query}`, icon: FaChartBar, key: '/mql' },
        { name: 'Mov. Diário', href: `${basePath}/mov-diario${query}`, icon: FaCalendarDay, key: '/mov-diario' }
    ];

    const getButtonClass = (key) => {
        const isActive = pathname.endsWith(key);
        return isActive
            ? "flex-1 sm:flex-none flex justify-center items-center gap-3 bg-blue-600 text-white font-semibold px-4 py-3 rounded-lg shadow-md cursor-default" // Ativo
            : "flex-1 sm:flex-none flex justify-center items-center gap-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"; // Inativo
    };

    return (
        <nav className="flex flex-wrap items-center gap-2 sm:gap-4 w-full lg:w-auto">
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
                        <Icon /> {tab.name}
                    </Link>
                );
            })}
        </nav>
    );
}