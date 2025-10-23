// src/app/login/page.jsx
'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function LoginPage() {
    const supabase = createClientComponentClient();
    const router = useRouter();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // --- ADIÇÃO IMPORTANTE: VERIFICA SE JÁ EXISTE SESSÃO ---
        // Esta função verifica se o usuário já está logado ao carregar a página.
        async function getUser() {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        }
        getUser();

        // Listener para eventos de login/logout
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
            if (event === 'SIGNED_IN') {
                router.push('/');
                router.refresh();
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, [supabase, router]);

    // Se o usuário já estiver logado, redireciona para a página principal
    if (user) {
        router.push('/');
        return null; // Evita renderizar o formulário de login desnecessariamente
    }
    
    // Se ainda estiver carregando, pode mostrar um spinner
    if (loading) {
        return <div>A carregar...</div>; // Ou um componente de loading mais bonito
    }

    return (
        // Fundo cinza claro para toda a página
        <div className="flex justify-center items-center min-h-screen bg-slate-200">
            {/* Caixa de login escura/azulada */}
            <div className="w-full max-w-sm p-8 space-y-6 bg-slate-900 rounded-xl shadow-lg">
                <div className="flex flex-col items-center text-center">
                    <Image
                        src="https://qmnhgbdkgnbvfdxhbtst.supabase.co/storage/v1/object/public/img/logo_02.png"
                        alt="Logo"
                        width={80}
                        height={80}
                        priority
                    />
                    <h1 className="text-[#4fc0db] text-4xl font-bold mt-4">
                        PlugScore
                    </h1>
                </div>

                {/* Componente de Autenticação da Supabase */}
                <Auth
                    supabaseClient={supabase}
                    appearance={{
                        theme: ThemeSupa,
                        variables: {
                            default: {
                                colors: {
                                    brand: '#22c55e',
                                    brandAccent: '#16a34a',
                                    brandButtonText: 'white',
                                    defaultButtonBackground: '#22c55e',
                                    defaultButtonBackgroundHover: '#16a34a',
                                    inputBackground: 'white',
                                    inputBorder: '#d1d5db',
                                    inputTextColor: '#111827',
                                    labelTextColor: 'white',
                                    anchorTextColor: '#38bdf8',
                                    anchorTextHoverColor: '#0ea5e9'
                                },
                            }
                        }
                    }}
                    theme="dark"
                    providers={[]}
                    view="sign_in"
                    localization={{
                        variables: {
                            sign_in: {
                                email_label: 'Seu e-mail',
                                password_label: 'Sua senha',
                                button_label: 'Entrar',
                            },
                            sign_up: {
                                email_label: 'Seu e-mail',
                                password_label: 'Crie uma Senha',
                                button_label: 'Registar',
                                link_text: 'Não tem uma conta? Cadastre-se',
                            },
                            forgotten_password: {
                                email_label: 'Endereço de e-mail',
                                button_label: 'Enviar instruções',
                                link_text: 'Esqueceu sua senha?',
                            },
                        },
                    }}
                />
            </div>
        </div>
    );
}