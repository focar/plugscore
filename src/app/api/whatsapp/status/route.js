// /src/app/api/whatsapp/status/route.js

import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getSessionStatus } from '@/lib/whatsapp';

export async function GET(request) {
  // 1. Cria o cliente Supabase para identificar o utilizador
  const supabase = createRouteHandlerClient({ cookies });

  try {
    // 2. Obtém os dados do utilizador logado de forma segura
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    // 3. Se não houver utilizador logado, retorna erro de não autorizado
    if (authError || !user) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    }

    // 4. Se o utilizador for válido, pede o status específico para ele
    const status = getSessionStatus(user.id);
    
    // 5. Retorna o status correto para o frontend
    return NextResponse.json(status);

  } catch (error) {
    console.error('Erro ao obter status do WhatsApp:', error);
    return NextResponse.json({ error: `Ocorreu um erro: ${error.message}` }, { status: 500 });
  }
}