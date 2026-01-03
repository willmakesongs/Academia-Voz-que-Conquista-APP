
import React from 'react';
import { Screen } from '../types';
import { LORENA_AVATAR_URL } from '../constants';

interface BottomNavProps {
  currentScreen: Screen;
  onNavigate: (screen: Screen) => void;
  role: 'student' | 'teacher';
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentScreen, onNavigate, role }) => {
  const getIconColor = (screen: Screen) => 
    currentScreen === screen ? 'text-[#FF00BC]' : 'text-gray-400';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1A202C] border-t border-gray-800 pb-safe pt-2 px-6 shadow-2xl z-50">
      <div className="flex justify-between items-center h-16 max-w-md mx-auto">
        <button 
          onClick={() => onNavigate(role === 'student' ? Screen.STUDENT_DASHBOARD : Screen.TEACHER_DASHBOARD)}
          className="flex flex-col items-center gap-1 w-16"
        >
          <span className={`material-symbols-rounded text-2xl ${getIconColor(role === 'student' ? Screen.STUDENT_DASHBOARD : Screen.TEACHER_DASHBOARD)}`}>
            dashboard
          </span>
          <span className={`text-[10px] font-medium ${getIconColor(role === 'student' ? Screen.STUDENT_DASHBOARD : Screen.TEACHER_DASHBOARD)}`}>
            Início
          </span>
        </button>

        <button 
          onClick={() => onNavigate(Screen.LIBRARY)}
          className="flex flex-col items-center gap-1 w-16"
        >
          <span className={`material-symbols-rounded text-2xl ${getIconColor(Screen.LIBRARY)}`}>
            library_music
          </span>
          <span className={`text-[10px] font-medium ${getIconColor(Screen.LIBRARY)}`}>
            Academia
          </span>
        </button>

        {/* BOTÃO CENTRAL - LORENA IA */}
        <div 
            className="relative flex flex-col items-center gap-1 w-16 group cursor-pointer" 
            onClick={() => onNavigate(Screen.CHAT)}
        >
          {/* CAMADA 1: Botão Flutuante (Fundo) */}
          {/* Subindo mais o ícone (-top-14) para destaque, sem afetar o fluxo do texto */}
          <div className="absolute -top-14 w-20 h-20 z-0">
              <div className="absolute inset-0 bg-brand-gradient rounded-full blur-md opacity-50 group-hover:opacity-80 transition-opacity animate-pulse duration-2000"></div>
              <button 
                className="relative flex items-center justify-center w-full h-full rounded-full bg-[#1A202C] shadow-[0_8px_24px_rgba(238,19,202,0.5)] hover:scale-105 transition-transform border-4 border-[#101622] overflow-hidden group-hover:border-[#FF00BC]/50"
              >
                 <img 
                   src={LORENA_AVATAR_URL} 
                   alt="Lorena IA" 
                   className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                 />
                 {/* Overlay de brilho */}
                 <div className="absolute inset-0 bg-gradient-to-tr from-[#0081FF]/20 to-[#FF00BC]/20 mix-blend-overlay"></div>
              </button>
          </div>

          {/* Spacer: Usa um ícone invisível idêntico aos outros botões para garantir altura e alinhamento perfeitos */}
          <span className="material-symbols-rounded text-2xl opacity-0">dashboard</span>
          
          {/* CAMADA 2: Texto (Frente) */}
          <span className={`text-[10px] font-medium relative z-10 ${getIconColor(Screen.CHAT)}`}>
            Lorena IA
          </span>
        </div>

        <button 
          onClick={() => onNavigate(Screen.ROUTINE)}
          className="flex flex-col items-center gap-1 w-16"
        >
          <span className={`material-symbols-rounded text-2xl ${getIconColor(Screen.ROUTINE)}`}>
            calendar_today
          </span>
          <span className={`text-[10px] font-medium ${getIconColor(Screen.ROUTINE)}`}>
            Rotina
          </span>
        </button>

        <button 
          onClick={() => onNavigate(Screen.PROFILE)}
          className="flex flex-col items-center gap-1 w-16"
        >
          <span className={`material-symbols-rounded text-2xl ${getIconColor(Screen.PROFILE)}`}>
            person
          </span>
          <span className={`text-[10px] font-medium ${getIconColor(Screen.PROFILE)}`}>
            Perfil
          </span>
        </button>
      </div>
    </div>
  );
};
