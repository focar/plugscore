//  plugscore/src/utils/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// ATENÇÃO: Substitua os valores abaixo pelas suas credenciais do Supabase.
// Pode encontrá-las no seu painel do Supabase em:
// Settings > API > Project URL e Project API Keys (use a chave 'anon public').

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
