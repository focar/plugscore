// Arquivo: /src/app/(main)/Operacional/admin-robo/actions.jsx (100% Completo)
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function addGroupAction(formData, clientId) {
    if (!clientId || clientId === 'all') {
        return { error: "Selecione um cliente para adicionar o grupo." };
    }
    const groupName = formData.get('groupName');
    if (!groupName) return { error: "O nome do grupo não pode ser vazio." };

    const supabase = createServerActionClient({ cookies });
    const { error } = await supabase.from('grupos_monitorados').insert({ nome_do_grupo: groupName, client_id: clientId });
    if (error) {
        return { error: `Erro do Supabase: ${error.message}` };
    }
    revalidatePath('/Operacional/admin-robo');
    return { success: true };
}

export async function deleteGroupAction(formData) {
    const groupId = formData.get('groupId');
    if (!groupId) return { error: "ID do grupo não encontrado." };

    const supabase = createServerActionClient({ cookies });
    const { error } = await supabase.from('grupos_monitorados').delete().eq('id', groupId);
    if (error) {
        return { error: `Erro do Supabase: ${error.message}` };
    }
    revalidatePath('/Operacional/admin-robo');
    return { success: true };
}

export async function importGroupMembersAction(groupName, clientId) {
    const roboUrl = process.env.ROBO_MONITOR_URL;
    if (!roboUrl) {
        return { error: 'URL do Robô Monitor não configurada nas variáveis de ambiente.' };
    }

    try {
        // Dispara a requisição sem esperar pela conclusão
        fetch(`${roboUrl}/importar-membros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupName, clientId }),
        });
        return { success: true, message: "Comando de importação enviado! O robô está processando. Verifique a tabela em alguns minutos." };
    } catch (error) {
        console.error("Erro ao disparar a API de importação:", error);
        return { error: error.message };
    }
}