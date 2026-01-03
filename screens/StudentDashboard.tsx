
import React from 'react';
import { Vocalize, Screen } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { LORENA_AVATAR_URL } from '../constants';

interface Props {
  onNavigate: (screen: Screen) => void;
  onPlayVocalize: (vocalize: Vocalize) => void;
}

export const StudentDashboard: React.FC<Props> = ({ onNavigate }) => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#101622] pb-24">
      {/* Header */}
      <header className="pt-8 pb-4 px-6 flex justify-between items-center bg-[#101622]/95 backdrop-blur-sm sticky top-0 z-20 border-b border-white/5">
        <div className="flex items-center gap-3">
          <img 
            src={user?.avatarUrl || 'https://picsum.photos/200'} 
            alt="Profile" 
            className="w-10 h-10 rounded-full border-2 border-[#6F4CE7]"
          />
          <div>
            <p className="text-xs text-gray-400 font-medium">Bem-vindo(a),</p>
            <h2 className="text-lg font-bold text-white">{user?.name || 'Voz'}</h2>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white relative hover:bg-white/10 transition-colors">
          <span className="material-symbols-rounded">notifications</span>
          <span className="absolute top-2.5 right-3 w-2 h-2 bg-[#FF00BC] rounded-full border border-[#101622]"></span>
        </button>
      </header>

      <div className="px-6 py-6 space-y-8">
        
        {/* Introduction Text */}
        <div className="space-y-4 text-center pt-2">
           <p className="text-gray-300 text-sm leading-relaxed">
              <strong className="text-white">Olá, VOZ!</strong> É um prazer ter você conosco nesta jornada de autodescoberta e domínio vocal. 
           </p>
           <p className="text-gray-300 text-sm leading-relaxed">
              Na nossa Academia, unimos a sensibilidade das aulas presenciais com a tecnologia deste app para acelerar sua evolução.
           </p>
        </div>

        {/* Section: LORENA IA (Destaque Principal) */}
        <div 
            onClick={() => onNavigate(Screen.CHAT)}
            className="relative overflow-hidden bg-gradient-to-br from-[#1A202C] to-[#25213b] p-5 rounded-2xl border border-[#6F4CE7]/30 group cursor-pointer shadow-lg shadow-purple-900/10"
        >
            <div className="absolute top-0 right-0 w-40 h-40 bg-[#6F4CE7] blur-[80px] opacity-10 group-hover:opacity-25 transition-opacity"></div>
            
            <div className="flex items-start gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-brand-gradient p-[2px] shrink-0 shadow-lg shadow-purple-900/40">
                    <div className="w-full h-full bg-[#1A202C] rounded-full flex items-center justify-center overflow-hidden">
                        <img 
                           src={LORENA_AVATAR_URL}
                           alt="Lorena Bot"
                           className="w-full h-full object-cover"
                        />
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Lorena IA</h3>
                    <p className="text-xs text-[#6F4CE7] font-bold uppercase tracking-wide mb-2">Sua Mentora Virtual 24h</p>
                    <p className="text-sm text-gray-300 mb-4">
                        Este chatbot inteligente conhece todo o nosso método! Ela está aqui para tirar dúvidas, sugerir músicas e te guiar quando o professor não estiver por perto.
                    </p>
                    
                    <div className="bg-black/20 rounded-xl p-3 border border-white/5 mb-3">
                        <p className="text-[10px] text-gray-500 uppercase mb-2 font-bold flex items-center gap-1">
                            <span className="material-symbols-rounded text-xs">tips_and_updates</span>
                            Exemplos do que pedir:
                        </p>
                        <ul className="space-y-2">
                             <li className="flex gap-2 items-start text-xs text-gray-300">
                                <span className="material-symbols-rounded text-[#FF00BC] text-sm shrink-0">chat_bubble</span>
                                "Me sugira 3 músicas pop para voz grave (Barítono)."
                             </li>
                             <li className="flex gap-2 items-start text-xs text-gray-300">
                                <span className="material-symbols-rounded text-[#FF00BC] text-sm shrink-0">chat_bubble</span>
                                "Minha garganta está arranhando, o que eu faço?"
                             </li>
                             <li className="flex gap-2 items-start text-xs text-gray-300">
                                <span className="material-symbols-rounded text-[#FF00BC] text-sm shrink-0">chat_bubble</span>
                                "Me dê a letra de 'Hallelujah' e explique o significado."
                             </li>
                        </ul>
                    </div>
                    <div className="text-xs text-[#6F4CE7] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        Toque para conversar agora <span className="material-symbols-rounded text-sm">arrow_forward</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Section: FERRAMENTAS DE ESTÚDIO (PERFIL) */}
        <div 
            onClick={() => onNavigate(Screen.PROFILE)}
            className="bg-[#1A202C] p-5 rounded-2xl border border-[#0081FF]/20 cursor-pointer hover:bg-[#1A202C]/80 transition-colors relative overflow-hidden"
        >
            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-20 h-full bg-[#0081FF]/5 skew-x-12"></div>

            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2 relative z-10">
                <span className="material-symbols-rounded text-[#0081FF]">construction</span>
                Ferramentas de Estúdio (Perfil)
            </h3>
            <p className="text-sm text-gray-300 mb-4 relative z-10">
                O botão <strong>PERFIL</strong> guarda segredos! Lá você encontra ferramentas tecnológicas essenciais para o seu treino diário:
            </p>
            
            <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="bg-[#151A23] p-3 rounded-xl border border-white/5 hover:border-[#0081FF]/30 transition-colors">
                    <span className="material-symbols-rounded text-[#0081FF] mb-2 block text-xl">graphic_eq</span>
                    <strong className="text-white text-xs block mb-1">Analisador de Afinação</strong>
                    <p className="text-[10px] text-gray-400">Feedback visual em tempo real para saber se você está na nota certa.</p>
                </div>
                <div className="bg-[#151A23] p-3 rounded-xl border border-white/5 hover:border-[#FF00BC]/30 transition-colors">
                    <span className="material-symbols-rounded text-[#FF00BC] mb-2 block text-xl">piano</span>
                    <strong className="text-white text-xs block mb-1">Teclado Virtual</strong>
                    <p className="text-[10px] text-gray-400">Piano completo para pegar referências auditivas onde estiver.</p>
                </div>
            </div>
             <p className="text-[10px] text-gray-500 mt-3 italic text-center relative z-10">
                *Confira também os detalhes do seu plano e assinatura.
            </p>
        </div>

        {/* Section: Como usar o App */}
        <div className="bg-[#1A202C] p-5 rounded-2xl border border-white/5">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-rounded text-green-500">school</span>
                Seu Guia de Bolso
            </h3>
            
            <ul className="space-y-4">
                <li className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#0081FF]/20 flex items-center justify-center text-[#0081FF] shrink-0 mt-1">
                        <span className="material-symbols-rounded text-lg">map</span>
                    </div>
                    <div>
                        <strong className="text-white text-sm block">Sua Trilha Personalizada</strong>
                        <p className="text-xs text-gray-400">Módulos de estudo liberados conforme sua evolução na Academia.</p>
                    </div>
                </li>
                <li className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#6F4CE7]/20 flex items-center justify-center text-[#6F4CE7] shrink-0 mt-1">
                        <span className="material-symbols-rounded text-lg">library_music</span>
                    </div>
                    <div>
                        <strong className="text-white text-sm block">Guia de Prática Diária</strong>
                        <p className="text-xs text-gray-400">Áudios de vocalizes e exercícios de respiração com qualidade de estúdio.</p>
                    </div>
                </li>
            </ul>
        </div>

        {/* Quote & CTA */}
        <div className="text-center pt-4 pb-2">
            <span className="material-symbols-rounded text-4xl text-[#6F4CE7]/30 mb-2">format_quote</span>
            <p className="text-lg font-serif italic text-white mb-6">
              "A voz é a única arte onde o instrumento é a própria vida."
            </p>

            <button 
              onClick={() => onNavigate(Screen.LIBRARY)}
              className="w-full py-4 rounded-2xl bg-brand-gradient text-white font-bold shadow-[0_10px_40px_rgba(111,76,231,0.3)] hover:scale-[1.02] transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
               <span className="material-symbols-rounded">play_circle</span>
               Acessar a Academia
            </button>
        </div>

      </div>
    </div>
  );
};
