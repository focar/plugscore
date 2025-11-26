'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useMemo, useContext, useState } from 'react';
import { AppContext } from '@/context/AppContext';
import { ChevronDown, ChevronRight } from 'lucide-react';

const LogOutIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>);

export default function Sidebar({ userProfile }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClientComponentClient();
    
    const { isMobileMenuOpen, setIsMobileMenuOpen, currentMode } = useContext(AppContext);

    // Estado das gavetas: DASHBOARDS começa ABERTO (true)
    const [openSections, setOpenSections] = useState({
        DASHBOARDS: true, 
        OPERACIONAL: false,
        FERRAMENTAS: false
    });

    const toggleSection = (section) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // LISTAS DE MENUS
    const classicDashboards = [
        { name: 'Traqueamento de Leads', href: '/Dashboards/traqueamento' },
        { name: 'Analise de UTMs', href: '/Dashboards/analise-utms' },
        { name: 'Evolução de Canal', href: '/Dashboards/evolucao-de-canal' },
        { name: 'Otimizador de Campanha', href: '/Dashboards/otimizador-campanhas/' },
        { name: 'Analise de Criativos', href: '/Dashboards/analise-criativos' },
        { name: 'Lead Scoring', href: '/Dashboards/lead-scoring' },
        { name: 'Perfil de Score', href: '/Dashboards/perfil-de-score' },
        { name: 'Perfil de MQL', href: '/Dashboards/perfil-de-mql' },
        { name: 'Compradores', href: '/Dashboards/origem-compradores' },
        { name: 'Análise por IA', href: '/Dashboards/analise-ia' },
        { name: 'Debriefing Completo', href: '/Dashboards/debriefing-completo' },
    ];

    const perpetuoDashboards = [
        { name: 'Debriefing de Vendas', href: '/Dashboards/perpetuo/debriefing' },
        { name: 'Análise por IA', href: '/Dashboards/perpetuo/analise-ia' },
        { name: 'Origem do Comprador', href: '/Dashboards/perpetuo/origem-compradores' },
        { name: 'Avatar do Comprador', href: '/Dashboards/perpetuo/avatar-comprador' },
        { name: 'Insights do Comprador', href: '/Dashboards/perpetuo/insights-dinamicos' },

        
    ];

    const operacionalItems = [
        { name: 'Lançamentos', href: '/Operacional/lancamentos' },
        { name: 'Regras de Pontuação', href: '/Operacional/regras-de-pontuacao' },
        { name: 'Banco de Perguntas', href: '/Operacional/banco-de-perguntas' },
        { name: 'Clientes', href: '/Operacional/clientes' },
        { name: 'Importar Compradores', href: '/Operacional/importar-compradores' },
        { name: 'Gerador de Links', href: '/Operacional/gerador-links' },
    ];

    const ferramentasItems = [
        { name: 'Acerto respostas', href: '/Ferramentas/ferramentas-de-teste' },
        { name: 'Usuários', href: '/Ferramentas/utilizadores' },
        { name: 'Grupos Whatsapp', href: '/Operacional/admin-robo' },
    ];
    
    // CÁLCULO DOS MENUS VISÍVEIS
    const visibleMenuItems = useMemo(() => {
        const role = userProfile?.role;
        if (!role) return {};

        // Decide qual lista mostrar baseado no MODO selecionado no Header
        let activeDashboards = currentMode === 'PERPETUO' ? perpetuoDashboards : classicDashboards;

        const items = {
            DASHBOARDS: activeDashboards,
        };

        if (role === 'admin' || role === 'membro') items.OPERACIONAL = operacionalItems;
        if (role === 'admin') items.FERRAMENTAS = ferramentasItems;

        return items;
    }, [userProfile, currentMode]);

    const isLinkActive = (href) => pathname === href || (href !== '/' && pathname.startsWith(href));
    const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login'); router.refresh(); };
    const handleLinkClick = () => { setIsMobileMenuOpen(false); };

    return (
        <>
            <div className={`fixed inset-0 bg-black/60 z-30 lg:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`} onClick={() => setIsMobileMenuOpen(false)}></div>
            <div className={`fixed top-0 left-0 w-64 bg-gray-900 text-gray-300 flex flex-col p-4 z-40 transition-transform duration-300 ease-in-out lg:sticky lg:translate-x-0 lg:h-full ${isMobileMenuOpen ? 'translate-x-0 h-screen' : '-translate-x-full'}`}>

                <Link href="/" onClick={handleLinkClick} className="flex items-center gap-3 mb-8 px-2 transition-opacity hover:opacity-80">
                    <Image src="https://qmnhgbdkgnbvfdxhbtst.supabase.co/storage/v1/object/public/img/logo_mini01.png" alt="Logótipo do PlugScore" width={48} height={48} className="h-12 w-12"/>
                    <div>
                        <h1 className="text-[#4fc0db] text-xl font-bold">PlugScore</h1>
                        <div className="text-xs text-gray-400 font-bold">v 3.0</div>
                    </div>
                </Link>

                <nav className="flex-grow overflow-y-auto custom-scrollbar space-y-2">
                    {Object.entries(visibleMenuItems).map(([section, items]) => (
                        <div key={section} className="border-b border-gray-800 last:border-0 pb-2">
                            <button onClick={() => toggleSection(section)} className="w-full flex items-center justify-between text-xs font-bold text-gray-500 hover:text-gray-300 uppercase tracking-wider py-3 px-2 transition-colors">
                                <span>{section}</span>
                                {openSections[section] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>

                            {/* Se a gaveta estiver aberta, mostra a lista */}
                            {openSections[section] && (
                                <ul className="space-y-1 animate-fadeIn px-2">
                                    {items.map((item) => (
                                        <li key={item.name}>
                                            <Link href={item.href} onClick={handleLinkClick} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all text-sm ${isLinkActive(item.href) ? 'bg-blue-600 text-white font-semibold shadow-md' : 'hover:bg-gray-800 hover:text-white text-gray-400'}`}>
                                                {item.name}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </nav>

                <div className="mt-auto pt-4 border-t border-gray-800">
                    {userProfile ? (
                        <div className="flex items-center justify-between">
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-white truncate">{userProfile.full_name || 'Utilizador'}</p>
                                <p className={`text-xs capitalize truncate ${userProfile.role === 'admin' ? 'text-red-400' : 'text-blue-400'}`}>{userProfile.role}</p>
                            </div>
                            <button onClick={handleLogout} className="p-2 rounded-md hover:bg-red-600 hover:text-white text-gray-400 transition-colors" title="Sair"><LogOutIcon /></button>
                        </div>
                    ) : ( <div className="h-[42px] animate-pulse bg-gray-800 rounded"></div> )}
                </div>
            </div>
        </>
    );
}