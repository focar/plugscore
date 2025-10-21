// Arquivo: /src/app/(main)/Operacional/admin-robo/page.jsx (Versão Simplificada)
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import AdminRoboClient from './AdminRoboClient'; // Importa nosso novo componente

export default async function AdminRoboPage() {
    // A página do servidor agora só cuida da autenticação
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Renderiza o componente de cliente, que cuidará do resto
    return <AdminRoboClient />;
}