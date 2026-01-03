
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURAÇÃO DO SUPABASE
// ------------------------------------------------------------------
// 1. Vá ao seu painel Supabase -> Settings -> API
// 2. Copie a "Project URL" e a "anon public key"
// 3. Cole abaixo dentro das aspas.
// ------------------------------------------------------------------

const SUPABASE_URL = 'https://sedjnyryixudxmmkeoam.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_1jpGu98CJuv-QpTjzbH_8Q_h95QYf3y';

// Validação básica
const isValidUrl = (url: string) => {
  return url && url.startsWith('https://') && !url.includes('SUA_URL');
};

export const isSupabaseConfigured = isValidUrl(SUPABASE_URL);

// Se as chaves não estiverem configuradas, o app usará modo de demonstração (Login Visitante)
// mas mostrará avisos no console.
const clientUrl = isSupabaseConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co';
const clientKey = isSupabaseConfigured ? SUPABASE_ANON_KEY : 'placeholder-key';

export const supabase = createClient(clientUrl, clientKey);
