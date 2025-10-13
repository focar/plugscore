// /src/app/api/whatsapp/start/route.js

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { startWhatsApp } from '@/lib/whatsapp'; // A sua função que inicia a Baileys

export async function POST(request) {
  // 1. Cria um cliente Supabase específico para Route Handlers
  const supabase = createRouteHandlerClient({ cookies });

  // 2. Verifica se existe um utilizador autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  // 3. Se não houver utilizador, bloqueia a requisição
  if (authError || !user) {
    console.warn('Tentativa de iniciar WhatsApp por utilizador não autenticado.');
    return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
  }
  
  // 4. Se o utilizador for válido, prossegue com a inicialização
  try {
    console.log(`Iniciando WhatsApp para o utilizador: ${user.id}`);
    
    // Agora a sua função sabe PARA QUEM iniciar a sessão.
    // **IMPORTANTE**: Você provavelmente precisará ajustar a sua função `startWhatsApp`
    // para aceitar o ID do utilizador como um parâmetro. Ex: startWhatsApp(user.id)
    await startWhatsApp(user.id); 
    
    return NextResponse.json({ message: 'Inicialização do WhatsApp solicitada com sucesso.' });
  } catch (error) {
    console.error(`Erro ao iniciar WhatsApp para o utilizador ${user.id}:`, error);
    return NextResponse.json({ error: `Ocorreu um erro: ${error.message}` }, { status: 500 });
  }
}