// src/middleware.js
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // ALTERAÇÃO: Trocado getSession() por getUser() para validação segura.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ALTERAÇÃO: A lógica agora verifica 'user' em vez de 'session'.
  // Se o utilizador NÃO está logado E não está a tentar aceder à página de login,
  // redireciona-o para a página de login.
  if (!user && req.nextUrl.pathname !== '/login') {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // ALTERAÇÃO: A lógica agora verifica 'user' em vez de 'session'.
  // Se o utilizador JÁ ESTÁ logado E está a tentar aceder à página de login,
  // redireciona-o para a página principal (dashboard).
  if (user && req.nextUrl.pathname === '/login') {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = '/'; // Redireciona para a raiz (página principal)
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
