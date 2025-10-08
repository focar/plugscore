//src/app/(main)/layout.jsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HydrateAppContext from '@/context/HydrateAppContext'; // <-- IMPORTAR

export default async function MainLayout({ children }) {
    const supabase = createServerComponentClient({ cookies });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect('/login');

    const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil:', profileError);
    }

    return (
        <>
            {/* --- INJETANDO O PERFIL NO CONTEXTO --- */}
            <HydrateAppContext userProfile={userProfile} />

            <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
                <Sidebar userProfile={userProfile} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header userProfile={userProfile} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}