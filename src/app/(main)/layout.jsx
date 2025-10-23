//src/app/(main)/layout.jsx
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import HydrateAppContext from '@/context/HydrateAppContext';

export default async function MainLayout({ children }) {
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    if (profileError && profileError.code !== 'PGRST116') {
        console.error('Erro ao buscar perfil:', profileError);
    }

    return (
        <>
            <HydrateAppContext userProfile={userProfile} />
            
            <div className="flex h-full bg-gray-100 dark:bg-gray-900">
                <Sidebar userProfile={userProfile} />
                
                <div className="flex flex-1 flex-col">
                    <Header userProfile={userProfile} />
                    
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                        {children}
                    </main>
                </div>
            </div>
        </>
    );
}

