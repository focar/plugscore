//src/app/(main)/layout.jsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HydrateAppContext from '@/context/HydrateAppContext';

export default async function MainLayout({ children }) {
    const supabase = createServerComponentClient({ cookies });

    // ALTERAÇÃO: Trocado getSession() por getUser() para validação segura.
    const { data: { user } } = await supabase.auth.getUser();
    
    // ALTERAÇÃO: A lógica agora verifica 'user' em vez de 'session'.
    if (!user) redirect('/login');

    // Buscando o perfil do usuário com o 'user.id' autenticado.
    const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        // ALTERAÇÃO: Usando 'user.id' em vez de 'session.user.id'.
        .eq('id', user.id)
        .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil:', profileError);
    }

    return (
        <>
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
