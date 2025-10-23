'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useMemo, useContext } from 'react';
import { AppContext } from '@/context/AppContext';

const LogOutIcon = (props) => ( <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>);

export default function Sidebar({ userProfile }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClientComponentClient();
    const { isMobileMenuOpen, setIsMobileMenuOpen } = useContext(AppContext);

    const allMenuItems = {
        DASHBOARDS: [
            { name: 'Traqueamento de Leads', href: '/Dashboards/traqueamento' },
            { name: 'Analise de Criativos', href: '/Dashboards/analise-criativos' },
            { name: 'Criativos por Score', href: '/Dashboards/criativos-por-score' },
            { name: 'Análise de Campanha', href: '/Dashboards/analise-campanha' },
            { name: 'Otimizador de Campanha', href: '/Dashboards/otimizador-campanhas/' },
            { name: 'Campanhas e Criativos', href: '/Dashboards/campanhas-criativos' },
            { name: 'Resumo Diario', href: '/Dashboards/resumo-diario' },
            { name: 'Evolução de Canal', href: '/Dashboards/evolucao-de-canal' },
            { name: 'Lead Scoring', href: '/Dashboards/lead-scoring' },
            { name: 'Perfil de Score', href: '/Dashboards/perfil-de-score' },
            { name: 'Perfil de MQL', href: '/Dashboards/perfil-de-mql' },
            { name: 'Compradores', href: '/Dashboards/origem-compradores' },
            { name: 'Análise de IA', href: '/Dashboards/analise-ia' },
        ],
        OPERACIONAL: [
            { name: 'Lançamentos', href: '/Operacional/lancamentos' },
            { name: 'Regras de Pontuação', href: '/Operacional/regras-de-pontuacao' },
            { name: 'Banco de Perguntas', href: '/Operacional/banco-de-perguntas' },
            { name: 'Clientes', href: '/Operacional/clientes' },
            { name: 'Importar Compradores', href: '/Operacional/importar-compradores' },
            { name: 'Gerador de Links', href: '/Operacional/gerador-links' },

        ],
        FERRAMENTAS: [
            { name: 'Acerto respostas', href: '/Ferramentas/ferramentas-de-teste' },
            { name: 'Usuários', href: '/Ferramentas/utilizadores' },
            { name: 'Grupos Whatsapp', href: '/Operacional/admin-robo' },
        ],
    };
    
    const visibleMenuItems = useMemo(() => {
        const role = userProfile?.role;
        if (!role) return {};
        if (role === 'admin') return allMenuItems;
        const items = {};
        items.DASHBOARDS = allMenuItems.DASHBOARDS;
        if (role === 'membro') {
            items.OPERACIONAL = allMenuItems.OPERACIONAL;
        }
        return items;
    }, [userProfile]);

    const isLinkActive = (href) => {
        if (href === '/') return pathname === '/';
        if(pathname !== '/') return pathname.startsWith(href);
        return false;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const handleLinkClick = () => {
        setIsMobileMenuOpen(false); 
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/60 z-30 lg:hidden ${isMobileMenuOpen ? 'block' : 'hidden'}`}
                onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            <div className={`fixed top-0 left-0 w-64 bg-gray-900 text-gray-300 flex flex-col p-4 z-40
                transition-transform duration-300 ease-in-out 
                lg:sticky lg:translate-x-0 lg:h-full
                ${isMobileMenuOpen ? 'translate-x-0 h-screen' : '-translate-x-full'}`}>

  
                
                <Link href="/" onClick={handleLinkClick} className="flex items-center gap-3 mb-8 px-2 transition-opacity hover:opacity-80">
                    <Image src="https://qmnhgbdkgnbvfdxhbtst.supabase.co/storage/v1/object/public/img/logo_mini01.png" alt="Logótipo do PlugScore" width={48} height={48} className="h-12 w-12"/>
                    <div>
                        <h1 className="text-[#4fc0db] text-xl font-bold">PlugScore</h1>
                        <div className="text-xs text-gray-400 flex items-center gap-3">
                            <span>v 1.0</span><span className="font-bold">by Focar</span>
                        </div>
                    </div>
                </Link>

                <nav className="flex-grow overflow-y-auto">
                    {Object.entries(visibleMenuItems).map(([section, items]) => (
                        <div key={section} className="mb-6">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">{section}</h3>
                            <ul>
                                {items.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            onClick={handleLinkClick}
                                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer mb-1 transition-colors text-sm ${
                                                isLinkActive(item.href)
                                                    ? 'bg-blue-600 text-white font-semibold'
                                                    : 'hover:bg-gray-700'
                                            }`}
                                        >
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </nav>

                <div className="mt-auto pt-4 border-t border-gray-700">
                    {userProfile ? (
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-white truncate">{userProfile.full_name || 'Utilizador'}</p>
                                <p className={`text-xs capitalize ${userProfile.role === 'admin' ? 'text-red-400' : 'text-blue-400'}`}>
                                    {userProfile.role}
                                </p>
                            </div>
                            <button onClick={handleLogout} className="p-2 rounded-md hover:bg-red-500 hover:text-white text-gray-400 transition-colors" title="Sair">
                                <LogOutIcon />
                            </button>
                        </div>
                    ) : ( <div className="h-[42px] animate-pulse"></div> )}
                </div>
            </div>
        </>
    );
}

