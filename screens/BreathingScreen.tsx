
import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onBack: () => void;
}

type BreathingState = 'intro' | 'tme_test' | 'menu' | 'practice' | 'summary';
type ExerciseType = 'capacity' | 'flow' | 'recovery';

const EXERCISES = {
  capacity: {
    title: 'Capacidade & Flexibilidade',
    subtitle: 'Box Breathing (4-4-4-4)',
    desc: 'Expansão das costelas e mobilidade diafragmática.',
    phases: [
      { name: 'Inspirar', duration: 4, color: '#0081FF', instruction: 'Expanda as costelas lateralmente' },
      { name: 'Segurar', duration: 4, color: '#6F4CE7', instruction: 'Mantenha a expansão (suspensão)' },
      { name: 'Expirar', duration: 4, color: '#FF00BC', instruction: 'Esvazie lentamente' },
      { name: 'Vazio', duration: 4, color: '#1A202C', instruction: 'Relaxe o abdome' }
    ]
  },
  flow: {
    title: 'Gestão de Fluxo (Suporte)',
    subtitle: 'Resistência em "S"',
    desc: 'Controle da saída de ar constante (Appoggio).',
    phases: [
      { name: 'Inspirar', duration: 2, color: '#0081FF', instruction: 'Inspiração rápida e baixa' },
      { name: 'Expirar (S)', duration: 0, color: '#FF00BC', instruction: 'Emita "S" constante e firme' } // Duration dynamic based on TME
    ]
  },
  recovery: {
    title: 'Recuperação Flash',
    subtitle: 'Catch Breath',
    desc: 'Inspirar rápido e silencioso entre frases.',
    phases: [
      { name: 'Expirar', duration: 2, color: '#FF00BC', instruction: 'Sopre o ar fora' },
      { name: 'Catch', duration: 0.5, color: '#0081FF', instruction: 'Solte a barriga (Ar entra sozinho)' },
      { name: 'Segurar', duration: 1, color: '#6F4CE7', instruction: 'Bloqueio rápido' }
    ]
  }
};

export const BreathingScreen: React.FC<Props> = ({ onBack }) => {
  const [viewState, setViewState] = useState<BreathingState>('intro');
  const [tmeResult, setTmeResult] = useState(0); // Tempo Máximo de Fonação em segundos
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>('capacity');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testTime, setTestTime] = useState(0);
  
  // Practice State
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Carregar TME salvo
  useEffect(() => {
    const savedTme = localStorage.getItem('user_tme');
    if (savedTme) {
        setTmeResult(parseFloat(savedTme));
        setViewState('menu'); // Pula intro se já fez teste
    }
  }, []);

  // Timer do Teste TME
  useEffect(() => {
    let interval: number;
    if (isTestRunning) {
        const startTime = Date.now();
        interval = window.setInterval(() => {
            setTestTime((Date.now() - startTime) / 1000);
        }, 100);
    }
    return () => clearInterval(interval);
  }, [isTestRunning]);

  // Lógica do Exercício (Loop de Fases)
  useEffect(() => {
    let interval: number;
    if (isRunning && viewState === 'practice') {
        const exerciseData = EXERCISES[selectedExercise];
        const currentPhase = exerciseData.phases[phaseIndex];
        
        // Dynamic Duration logic
        let duration = currentPhase.duration;
        if (selectedExercise === 'flow' && currentPhase.name.includes('Expirar')) {
            // Flow dura 70% do TME do usuário
            duration = Math.max(5, tmeResult * 0.7);
        }

        if (timeLeft <= 0) {
            setTimeLeft(duration);
            // Haptic Feedback na troca de fase
            if (navigator.vibrate) navigator.vibrate(50);
        }

        interval = window.setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0.1) {
                    // Next Phase
                    const nextIndex = (phaseIndex + 1) % exerciseData.phases.length;
                    setPhaseIndex(nextIndex);
                    
                    if (nextIndex === 0) {
                        setCycleCount(c => c + 1);
                    }
                    
                    // Define duration for next phase immediately
                    let nextDuration = exerciseData.phases[nextIndex].duration;
                    if (selectedExercise === 'flow' && exerciseData.phases[nextIndex].name.includes('Expirar')) {
                        nextDuration = Math.max(5, tmeResult * 0.7);
                    }
                    return nextDuration;
                }
                return prev - 0.1;
            });
        }, 100);
    }
    return () => clearInterval(interval);
  }, [isRunning, phaseIndex, timeLeft, viewState, selectedExercise, tmeResult]);

  const startTest = () => {
      setTestTime(0);
      setIsTestRunning(true);
  };

  const stopTest = () => {
      setIsTestRunning(false);
      setTmeResult(testTime);
      localStorage.setItem('user_tme', testTime.toString());
      // Aguarda um pouco para usuário ver o tempo antes de mudar
      setTimeout(() => setViewState('menu'), 1500);
  };

  const startPractice = (type: ExerciseType) => {
      setSelectedExercise(type);
      setPhaseIndex(0);
      setCycleCount(0);
      setTimeLeft(EXERCISES[type].phases[0].duration);
      setIsRunning(true);
      setViewState('practice');
  };

  const getTmeLevel = (time: number) => {
      if (time < 15) return { label: 'Iniciante', color: 'text-yellow-500' };
      if (time < 25) return { label: 'Intermediário', color: 'text-blue-400' };
      return { label: 'Avançado', color: 'text-[#FF00BC]' };
  };

  // --- RENDERIZADORES DE ESTADO ---

  const renderIntro = () => (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in slide-in-from-bottom duration-500">
          <div className="w-20 h-20 rounded-full bg-[#0081FF]/20 flex items-center justify-center text-[#0081FF] mb-6 animate-pulse">
              <span className="material-symbols-rounded text-4xl">self_improvement</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Gatekeeper Postural</h2>
          <p className="text-gray-400 text-sm mb-8 leading-relaxed">
              Antes de começar, precisamos garantir que seu "tubo" (traqueia) esteja reto. Se você estiver curvado sobre o celular, o exercício será inútil.
          </p>
          
          <div className="bg-[#1A202C] p-4 rounded-xl border border-white/5 w-full mb-8 text-left space-y-3">
              <div className="flex gap-3 items-center">
                  <span className="material-symbols-rounded text-green-500">check_circle</span>
                  <p className="text-xs text-gray-300">Posicione o celular na altura dos olhos.</p>
              </div>
              <div className="flex gap-3 items-center">
                  <span className="material-symbols-rounded text-green-500">check_circle</span>
                  <p className="text-xs text-gray-300">Coluna reta (sentado ou em pé).</p>
              </div>
              <div className="flex gap-3 items-center">
                  <span className="material-symbols-rounded text-green-500">check_circle</span>
                  <p className="text-xs text-gray-300">Pés apoiados no chão.</p>
              </div>
          </div>

          <button 
            onClick={() => setViewState('tme_test')}
            className="w-full py-4 rounded-xl bg-brand-gradient text-white font-bold shadow-lg shadow-purple-900/40 hover:scale-105 transition-transform"
          >
              Estou Alinhado
          </button>
      </div>
  );

  const renderTmeTest = () => (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-in fade-in">
          <h2 className="text-xl font-bold text-white mb-2">Teste de Nivelamento (TME)</h2>
          <p className="text-gray-400 text-xs mb-8">
              Vamos medir sua capacidade atual. Inspire fundo e solte em "S" (como pneu esvaziando) o máximo que conseguir.
          </p>

          <div className="mb-10 relative">
              <div className={`text-6xl font-mono font-bold transition-colors ${isTestRunning ? 'text-[#FF00BC]' : 'text-white'}`}>
                  {testTime.toFixed(1)}s
              </div>
              {isTestRunning && <div className="absolute -bottom-6 left-0 right-0 text-xs text-[#FF00BC] animate-pulse">Medindo...</div>}
          </div>

          {!isTestRunning ? (
              <button 
                onClick={startTest}
                className="w-24 h-24 rounded-full bg-[#0081FF] text-white shadow-[0_0_30px_rgba(0,129,255,0.4)] flex items-center justify-center hover:scale-110 transition-transform"
              >
                  <span className="font-bold text-sm">INICIAR</span>
              </button>
          ) : (
              <button 
                onClick={stopTest}
                className="w-24 h-24 rounded-full bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] flex items-center justify-center hover:scale-110 transition-transform"
              >
                  <span className="font-bold text-sm">PARAR</span>
              </button>
          )}
          
          <p className="mt-8 text-xs text-gray-500 italic max-w-xs">
              Toque em INICIAR quando começar o som e PARAR quando acabar o ar totalmente.
          </p>
      </div>
  );

  const renderMenu = () => {
      const level = getTmeLevel(tmeResult);
      return (
        <div className="px-6 py-6 h-full flex flex-col animate-in slide-in-from-right">
            <div className="bg-[#1A202C] p-4 rounded-xl border border-white/5 mb-6 flex justify-between items-center">
                <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Seu TME Atual</p>
                    <p className="text-2xl font-bold text-white">{tmeResult.toFixed(1)}s</p>
                </div>
                <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded bg-white/5 ${level.color}`}>
                        {level.label}
                    </span>
                    <button 
                        onClick={() => setViewState('tme_test')}
                        className="text-[10px] text-gray-500 block mt-1 hover:text-white underline decoration-gray-600"
                    >
                        Refazer teste
                    </button>
                </div>
            </div>

            <h3 className="text-lg font-bold text-white mb-4">Escolha seu Treino</h3>
            
            <div className="space-y-3 flex-1 overflow-y-auto hide-scrollbar">
                {Object.entries(EXERCISES).map(([key, ex]) => (
                    <button 
                        key={key}
                        onClick={() => startPractice(key as ExerciseType)}
                        className="w-full text-left p-4 rounded-xl bg-[#151A23] border border-white/5 hover:border-[#0081FF]/50 hover:bg-[#1A202C] transition-all group relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0081FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10">
                            <h4 className="font-bold text-white mb-1 group-hover:text-[#0081FF] transition-colors">{ex.title}</h4>
                            <p className="text-xs text-[#FF00BC] font-medium mb-1">{ex.subtitle}</p>
                            <p className="text-xs text-gray-400">{ex.desc}</p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
      );
  };

  const renderPractice = () => {
      const exerciseData = EXERCISES[selectedExercise];
      const currentPhase = exerciseData.phases[phaseIndex];
      const maxDuration = currentPhase.duration || (selectedExercise === 'flow' ? Math.max(5, tmeResult * 0.7) : 4);
      const progress = 100 - ((timeLeft / maxDuration) * 100);
      
      // Visualizer Scale Logic
      // Inhale: Scale up
      // Exhale: Scale down
      // Hold: Pulse slightly or stay static
      let scale = 1;
      if (currentPhase.name.includes('Inspirar') || currentPhase.name.includes('Catch')) {
          scale = 1 + (progress / 100) * 0.5; // 1 -> 1.5
      } else if (currentPhase.name.includes('Expirar') || currentPhase.name.includes('S')) {
          scale = 1.5 - (progress / 100) * 0.5; // 1.5 -> 1
      } else if (currentPhase.name.includes('Segurar')) {
          scale = 1.5;
      } else {
          scale = 1; // Vazio
      }

      return (
          <div className="flex flex-col h-full relative overflow-hidden">
              {/* Top Info */}
              <div className="pt-6 px-6 z-10 text-center">
                  <h3 className="text-white font-bold text-lg">{exerciseData.subtitle}</h3>
                  <p className="text-xs text-gray-400 mt-1">Ciclo {cycleCount + 1}</p>
              </div>

              {/* Visualizer Center */}
              <div className="flex-1 flex items-center justify-center relative z-0">
                  {/* Background Glow */}
                  <div 
                    className="absolute w-64 h-64 rounded-full blur-[100px] transition-all duration-500 opacity-30"
                    style={{ backgroundColor: currentPhase.color }}
                  ></div>

                  {/* Breathing Circle */}
                  <div 
                    className="w-48 h-48 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-100 ease-linear border-4 border-white/10 backdrop-blur-sm"
                    style={{ 
                        transform: `scale(${scale})`,
                        backgroundColor: `${currentPhase.color}20`, // 20% opacity
                        borderColor: currentPhase.color
                    }}
                  >
                      <div className="text-center transition-all duration-300 transform scale-100">
                          <p className="text-2xl font-bold text-white mb-1" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                              {currentPhase.name}
                          </p>
                          <p className="text-3xl font-mono font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
                              {timeLeft.toFixed(1)}
                          </p>
                      </div>
                  </div>
              </div>

              {/* Instruction Footer */}
              <div className="px-6 pb-10 z-10 text-center space-y-6">
                  <div className="bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
                      <p className="text-sm text-gray-200 font-medium animate-pulse">
                          {currentPhase.instruction}
                      </p>
                  </div>

                  <button 
                    onClick={() => { setIsRunning(false); setViewState('menu'); }}
                    className="text-gray-500 hover:text-white text-sm underline decoration-gray-600 underline-offset-4"
                  >
                      Encerrar Treino
                  </button>
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#101622] flex flex-col relative overflow-hidden">
        {/* Simple Header for navigation unless in practice mode */}
        {viewState !== 'practice' && (
            <div className="pt-8 px-6 pb-2 flex items-center gap-3 z-20">
                <button 
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                >
                    <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 className="text-lg font-bold text-white">Módulo Respiração</h1>
            </div>
        )}

        <div className="flex-1 relative z-10">
            {viewState === 'intro' && renderIntro()}
            {viewState === 'tme_test' && renderTmeTest()}
            {viewState === 'menu' && renderMenu()}
            {viewState === 'practice' && renderPractice()}
        </div>
    </div>
  );
};
