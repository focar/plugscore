// Arquivo: /src/app/(main)/Operacional/admin-robo/page.jsx (100% Completo)
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { redirect } from 'next/navigation';
import AdminRoboClient from './AdminRoboClient'; // Importa nosso componente de cliente

export default async function AdminRoboPage() {
    // A página do servidor agora só cuida da autenticação
    const supabase = createServerComponentClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect('/login');
    }

    // Renderiza o componente de cliente, que cuidará de toda a lógica e interface
    return <AdminRoboClient />;
}