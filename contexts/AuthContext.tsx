
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (role: 'student' | 'teacher', email?: string, password?: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, role: 'student' | 'teacher') => Promise<{ error: any; data?: any }>;
  signInWithGoogle: (role: 'student' | 'teacher') => Promise<{ error: any }>;
  signInWithPhone: (phone: string) => Promise<{ error: any }>;
  signInAsGuest: (role: 'student' | 'teacher') => Promise<void>;
  verifyOtp: (phone: string, token: string, role: 'student' | 'teacher') => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      if (!isSupabaseConfigured) {
        console.warn('Supabase não configurado corretamente em lib/supabaseClient.ts');
        setLoading(false);
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session) {
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro ao verificar sessão:', err);
        setLoading(false);
      }
    };

    initSession();

    if (!isSupabaseConfigured) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchProfile(session.user.id);
      } else {
        setUser(prev => prev?.id === 'guest' ? prev : null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    if (!isSupabaseConfigured) return;

    try {
      let { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      // Auto-criação de perfil se não existir (para Google Auth ou Signup)
      if (!data) {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          const meta = authUser.user_metadata;
          const newProfile = {
            id: authUser.id,
            name: meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Usuário',
            role: (meta.role || localStorage.getItem('vocalizes_temp_role') || 'student') as 'student' | 'teacher',
            avatar_url: meta.avatar_url || meta.picture || '',
          };

          // Tenta inserir ignorando erro de duplicidade
          const { error: insertError } = await supabase
            .from('profiles')
            .upsert([newProfile], { onConflict: 'id', ignoreDuplicates: true });

          // Se der erro 42501, ignoramos pois pode ser que o Trigger do banco já tenha criado
          if (insertError && insertError.code !== '42501') {
            console.error('Erro ao criar perfil:', insertError);
          }

          // Busca novamente
          const { data: refreshedData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

          data = refreshedData || newProfile;
        }
      }

      if (data) {
        setUser({
          id: data.id,
          name: data.name,
          role: data.role,
          avatarUrl: data.avatar_url || 'https://picsum.photos/200'
        });
      }
    } catch (error) {
      console.error('Erro crítico ao carregar perfil:', error);
      await supabase.auth.signOut();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (role: 'student' | 'teacher', email?: string, password?: string) => {
    if (!isSupabaseConfigured) return { error: 'Configure a URL do Supabase' };

    try {
      if (!email || !password) return { error: 'Preencha todos os campos.' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message || 'Erro ao entrar.' };
    }
  };

  const signUp = async (email: string, password: string, name: string, role: 'student' | 'teacher') => {
    if (!isSupabaseConfigured) return { error: 'Configure a URL do Supabase' };

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, full_name: name },
          emailRedirectTo: window.location.origin
        }
      });

      if (authError) throw authError;

      // Se temos sessão imediata (email confirm off), tentamos criar o perfil
      if (authData.user && authData.session) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([{
            id: authData.user.id,
            name: name,
            role: role,
            avatar_url: `https://ui-avatars.com/api/?name=${name}&background=random`
          }], { onConflict: 'id' });

        if (profileError && profileError.code !== '42501') {
          console.error("Erro perfil inicial:", profileError);
        }
      }

      return { error: null, data: authData };
    } catch (error: any) {
      return { error: error.message || 'Erro ao cadastrar.' };
    }
  };

  // ... (Restante das funções: Google, Phone, Guest, Verify, SignOut mantidas iguais)
  const signInWithGoogle = async (role: 'student' | 'teacher') => {
    if (!isSupabaseConfigured) return { error: 'Supabase URL inválida' };
    try {
      localStorage.setItem('vocalizes_temp_role', role);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          // data: { role }, // Removed to fix TS error
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      return { error: error.message };
    }
  };

  const signInWithPhone = async (phone: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' };
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      return { error: null };
    } catch (error: any) { return { error: error.message }; }
  };

  const verifyOtp = async (phone: string, token: string, role: 'student' | 'teacher') => {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' };
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) throw error;
      if (data.user) {
        // Lógica simplificada de perfil mobile
        const { data: p } = await supabase.from('profiles').select('id').eq('id', data.user.id).single();
        if (!p) {
          await supabase.from('profiles').insert([{
            id: data.user.id,
            name: 'Mobile User',
            role: role,
            avatar_url: `https://ui-avatars.com/api/?name=Mob&background=random`
          }]);
        }
      }
      return { error: null };
    } catch (error: any) { return { error: error.message }; }
  };

  const signInAsGuest = async (role: 'student' | 'teacher') => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setUser({
      id: 'guest',
      name: 'Visitante (Teste)',
      role: role,
      avatarUrl: `https://ui-avatars.com/api/?name=${role === 'student' ? 'Aluno' : 'Prof'}&background=random&color=fff&background=6F4CE7`
    });
    setLoading(false);
  };

  const signOut = async () => {
    if (user?.id === 'guest') { setUser(null); return; }
    if (!isSupabaseConfigured) { setUser(null); return; }
    try { await supabase.auth.signOut(); } catch (e) { console.warn(e); } finally { setUser(null); }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signInWithPhone, signInAsGuest, verifyOtp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
