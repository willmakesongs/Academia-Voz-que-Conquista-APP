
import React, { useState, useEffect } from 'react';
import { Screen, Vocalize } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import { StudentDashboard } from './screens/StudentDashboard';
import { TeacherDashboard } from './screens/TeacherDashboard';
import { PlayerScreen } from './screens/PlayerScreen';
import { LibraryScreen } from './screens/LibraryScreen';
import { RoutineScreen } from './screens/RoutineScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CalendarScreen } from './screens/CalendarScreen';
import { TwisterScreen } from './screens/TwisterScreen';
import { BreathingScreen } from './screens/BreathingScreen';
import { ChatScreen } from './screens/ChatScreen'; // Importação nova
import { BottomNav } from './components/BottomNav';
import { VOCALIZES } from './constants';

const AppContent = () => {
  const { user, loading, signOut } = useAuth();
  const [screen, setScreen] = useState<Screen>(Screen.LOGIN);
  const [previousScreen, setPreviousScreen] = useState<Screen>(Screen.LIBRARY);
  const [currentVocalize, setCurrentVocalize] = useState<Vocalize | null>(null);
  const [libraryResetKey, setLibraryResetKey] = useState(0);
  const [profileResetKey, setProfileResetKey] = useState(0);

  // Redirect based on auth state
  useEffect(() => {
    if (!loading) {
      if (user) {
        if (screen === Screen.LOGIN) {
            const initialScreen = user.role === 'student' ? Screen.STUDENT_DASHBOARD : Screen.TEACHER_DASHBOARD;
            setScreen(initialScreen);
            setPreviousScreen(initialScreen); // Initialize previousScreen correctly
        }
      } else {
        setScreen(Screen.LOGIN);
      }
    }
  }, [user, loading, screen]);

  if (loading) return <div className="min-h-screen bg-[#101622] flex items-center justify-center text-white">Carregando Vocalizes...</div>;

  const handleLogout = async () => {
    await signOut();
    setScreen(Screen.LOGIN);
  };

  const navigateToPlayer = (vocalize: Vocalize) => {
    // Só atualiza a tela anterior se NÃO estiver vindo do próprio player (ex: próxima música)
    if (screen !== Screen.PLAYER && screen !== Screen.TWISTERS && screen !== Screen.BREATHING && screen !== Screen.CHAT) {
        setPreviousScreen(screen);
    }
    
    setCurrentVocalize(vocalize);
    if (vocalize.moduleId === 'm6') {
        setScreen(Screen.TWISTERS);
    } else {
        setScreen(Screen.PLAYER);
    }
  };

  // Wrapper para navegação padrão para lidar com o histórico
  const handleNavigate = (targetScreen: Screen) => {
      // Se for navegar para telas secundárias manualmente, salva o histórico
      if ([Screen.PLAYER, Screen.TWISTERS, Screen.BREATHING, Screen.CHAT].includes(targetScreen)) {
          if (![Screen.PLAYER, Screen.TWISTERS, Screen.BREATHING, Screen.CHAT].includes(screen)) {
             setPreviousScreen(screen);
          }
      }
      setScreen(targetScreen);
  };

  const handleNextVocalize = () => {
    if (!currentVocalize) return;
    const currentIndex = VOCALIZES.findIndex(v => v.id === currentVocalize.id);
    if (currentIndex < VOCALIZES.length - 1) {
        setCurrentVocalize(VOCALIZES[currentIndex + 1]);
    }
  };

  const handlePrevVocalize = () => {
    if (!currentVocalize) return;
    const currentIndex = VOCALIZES.findIndex(v => v.id === currentVocalize.id);
    if (currentIndex > 0) {
        setCurrentVocalize(VOCALIZES[currentIndex - 1]);
    }
  };

  // Intercepta a navegação do rodapé
  const handleBottomNav = (targetScreen: Screen) => {
    if (targetScreen === Screen.LIBRARY) {
        // Incrementa a chave para forçar remontagem do componente LibraryScreen
        setLibraryResetKey(prev => prev + 1);
    }
    
    // Incrementa a chave para forçar remontagem do componente ProfileScreen
    // Isso garante que ele volte para o menu inicial ('menu') mesmo se já estiver na tela de perfil
    if (targetScreen === Screen.PROFILE) {
        setProfileResetKey(prev => prev + 1);
    }

    setScreen(targetScreen);
  };

  const renderScreen = () => {
    // Force Login if no user (and not currently on login screen)
    if (!user && screen !== Screen.LOGIN) return <LoginScreen />;

    switch (screen) {
      case Screen.LOGIN:
        return <LoginScreen />;
      case Screen.STUDENT_DASHBOARD:
        return <StudentDashboard onNavigate={handleNavigate} onPlayVocalize={navigateToPlayer} />;
      case Screen.TEACHER_DASHBOARD:
        return <TeacherDashboard onNavigate={handleNavigate} onLogout={handleLogout} />;
      case Screen.PLAYER:
        return (
            <PlayerScreen 
                vocalize={currentVocalize} 
                onBack={() => setScreen(previousScreen)} 
                onNext={handleNextVocalize}
                onPrev={handlePrevVocalize}
            />
        );
      case Screen.TWISTERS:
        return (
            <TwisterScreen 
                initialExerciseId={currentVocalize?.id}
                onBack={() => setScreen(previousScreen)} 
            />
        );
      case Screen.BREATHING:
        return (
            <BreathingScreen 
                onBack={() => setScreen(previousScreen)} 
            />
        );
      case Screen.CHAT:
        return (
            <ChatScreen 
                onBack={() => setScreen(previousScreen)} 
            />
        );
      case Screen.LIBRARY:
        return (
            <LibraryScreen 
                key={libraryResetKey} 
                onNavigate={handleNavigate} 
                onPlayVocalize={navigateToPlayer} 
            />
        );
      case Screen.ROUTINE:
        return <RoutineScreen onNavigate={handleNavigate} />;
      case Screen.PROFILE:
        return (
            <ProfileScreen 
                key={profileResetKey} 
                onNavigate={handleNavigate} 
                onLogout={handleLogout} 
            />
        );
      case Screen.CALENDAR:
        return <CalendarScreen onBack={() => setScreen(Screen.TEACHER_DASHBOARD)} />;
      default:
        return <div className="p-10 text-center text-white">Tela em construção: {screen}</div>;
    }
  };

  return (
    <div className="font-sans antialiased text-white bg-[#101622] min-h-screen max-w-md mx-auto relative shadow-2xl overflow-hidden">
      {renderScreen()}
      
      {/* Menu rodapé presente em quase todas as telas para navegação rápida */}
      {user && screen !== Screen.LOGIN && screen !== Screen.CALENDAR && (
        <BottomNav 
          currentScreen={screen} 
          onNavigate={handleBottomNav} 
          role={user.role}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
