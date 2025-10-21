// Arquivo: /src/app/(main)/Operacional/admin-robo/actions.jsx (100% Completo)
'use server';

import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';

export async function addGroupAction(formData, clientId) {
    console.log('--- Server Action: addGroupAction iniciada ---');
    console.log('Cliente ID recebido:', clientId);

    if (!clientId || clientId === 'all') {
        const errorMsg = "Selecione um cliente para adicionar o grupo.";
        console.error(errorMsg);
        return { error: errorMsg };
    }
    
    const groupName = formData.get('groupName');
    console.log('Nome do Grupo recebido:', groupName);

    if (!groupName) {
        const errorMsg = "O nome do grupo não pode ser vazio.";
        console.error(errorMsg);
        return { error: errorMsg };
    }

    const supabase = createServerActionClient({ cookies });
    const { data, error } = await supabase
        .from('grupos_monitorados')
        .insert({ nome_do_grupo: groupName, client_id: clientId })
        .select();

    if (error) {
        console.error('--- ERRO DO SUPABASE AO INSERIR ---:', error);
        return { error: `Erro do Supabase: ${error.message}` };
    }

    console.log('--- SUCESSO --- Dados inseridos:', data);
    revalidatePath('/Operacional/admin-robo');
    return { success: true, data: data };
}

export async function deleteGroupAction(formData) {
    'use server';
    console.log('--- Server Action: deleteGroupAction iniciada ---');
    
    const groupId = formData.get('groupId');
    console.log('ID do Grupo para deletar:', groupId);

    if (!groupId) {
        const errorMsg = "ID do grupo não encontrado.";
        console.error(errorMsg);
        return { error: errorMsg };
    }

    const supabase = createServerActionClient({ cookies });
    const { error } = await supabase
        .from('grupos_monitorados')
        .delete()
        .eq('id', groupId);

    if (error) {
        console.error('--- ERRO DO SUPABASE AO DELETAR ---:', error);
        return { error: `Erro do Supabase: ${error.message}` };
    }

    console.log('--- SUCESSO --- Grupo deletado.');
    revalidatePath('/Operacional/admin-robo');
    return { success: true };
}

export async function importGroupMembersAction(groupName, clientId) {
    'use server';
    
    // Lendo a variável de servidor, sem o prefixo 'NEXT_PUBLIC_'
    const roboUrl = process.env.ROBO_MONITOR_URL; 
    
    if (!roboUrl) {
        return { error: 'URL do Robô Monitor não configurada nas variáveis de ambiente.' };
    }

    try {
        const response = await fetch(`${roboUrl}/importar-membros`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupName, clientId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Falha na comunicação com o robô.');
        }

        const data = await response.json();
        return { success: true, message: data.message };
    } catch (error) {
        console.error("Erro ao chamar a API de importação:", error);
        return { error: error.message };
    }
}