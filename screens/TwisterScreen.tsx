
import React, { useState, useEffect, useRef } from 'react';
import { Screen, TwisterExercise } from '../types';
import { TWISTERS_DATA } from '../constants';

interface Props {
  onBack: () => void;
  initialExerciseId?: string;
}

const PHASES = [
  { id: 1, label: 'Sussurrado', icon: 'mic_off', desc: 'Foco muscular sem som' },
  { id: 2, label: 'Lento', icon: 'speed', desc: 'Consciência exagerada' },
  { id: 3, label: 'Rápido', icon: 'rocket_launch', desc: 'Velocidade real' }
];

export const TwisterScreen: React.FC<Props> = ({ onBack, initialExerciseId }) => {
  const [selectedExercise, setSelectedExercise] = useState<TwisterExercise | null>(null);
  const [activePhase, setActivePhase] = useState(1);
  const [bpm, setBpm] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBitolaMode, setIsBitolaMode] = useState(false);
  
  // Audio Context Ref for Metronome Sound
  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<number | null>(null);

  // Seleciona exercício inicial se fornecido
  useEffect(() => {
      if (initialExerciseId) {
          const ex = TWISTERS_DATA.find(t => t.id === initialExerciseId);
          if (ex) {
              setSelectedExercise(ex);
          }
      }
  }, [initialExerciseId]);

  // Initialize Audio Context
  const initAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playClick = () => {
    if (!audioCtxRef.current) return;
    
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();

    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);

    osc.frequency.setValueAtTime(1200, audioCtxRef.current.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current.currentTime + 0.05);

    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.05);
  };

  // Metronome Logic
  useEffect(() => {
    if (isPlaying) {
      initAudio();
      const ms = 60000 / bpm;
      playClick();
      timerRef.current = window.setInterval(() => {
        playClick();
      }, ms);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, bpm]);

  useEffect(() => {
    setIsPlaying(false);
    setBpm(selectedExercise?.targetBpm ? Math.round(selectedExercise.targetBpm * 0.6) : 60); 
  }, [selectedExercise]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const navigateExercise = (direction: 'next' | 'prev') => {
    if (!selectedExercise) return;
    const currentIndex = TWISTERS_DATA.findIndex(t => t.id === selectedExercise.id);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (newIndex >= 0 && newIndex < TWISTERS_DATA.length) {
        setSelectedExercise(TWISTERS_DATA[newIndex]);
        setActivePhase(1); 
        setIsBitolaMode(false); 
    }
  };

  const modules = ['A', 'B', 'C', 'D'];

  // VIEW 1: EXERCISE SELECTION (LIST)
  if (!selectedExercise) {
    return (
      <div className="min-h-screen bg-[#101622] pb-24 relative flex flex-col">
        <header className="pt-8 pb-4 px-6 sticky top-0 bg-[#101622]/95 backdrop-blur-sm z-20 border-b border-white/5">
            <div className="flex items-center gap-3 mb-2">
                <button 
                onClick={onBack}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10"
                >
                <span className="material-symbols-rounded">arrow_back</span>
                </button>
                <h1 className="text-xl font-bold text-white">Articulação & Dicção</h1>
            </div>
            <p className="text-xs text-gray-400 pl-1">Independência dos articuladores</p>
        </header>

        <div className="px-6 py-6 space-y-8 overflow-y-auto flex-1 hide-scrollbar">
            {modules.map((modCode) => {
                const exercises = TWISTERS_DATA.filter(t => t.module === modCode);
                if (exercises.length === 0) return null;
                const modTitle = exercises[0].moduleTitle;

                return (
                    <div key={modCode}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#0081FF] flex items-center justify-center font-bold text-white">
                                {modCode}
                            </div>
                            <h2 className="font-bold text-lg text-white">{modTitle}</h2>
                        </div>

                        <div className="grid gap-3">
                            {exercises.map(ex => (
                                <div 
                                    key={ex.id}
                                    onClick={() => {
                                        setSelectedExercise(ex);
                                        setActivePhase(1);
                                        setIsBitolaMode(false);
                                    }}
                                    className="p-4 rounded-xl bg-[#1A202C] border border-white/5 hover:border-[#0081FF]/50 cursor-pointer active:scale-[0.98] transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-white">{ex.title}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                            ex.difficulty === 'Nível 1' ? 'border-green-500 text-green-500' :
                                            ex.difficulty === 'Nível 2' ? 'border-yellow-500 text-yellow-500' :
                                            'border-red-500 text-red-500'
                                        }`}>
                                            {ex.difficulty}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end mb-2">
                                        <p className="text-xs text-gray-400">{ex.focus}</p>
                                        {ex.targetBpm && (
                                            <span className="text-[10px] text-[#FF00BC] font-medium flex items-center gap-1">
                                                <span className="material-symbols-rounded text-xs">speed</span>
                                                Meta: {ex.targetBpm} BPM
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-300 italic opacity-80 line-clamp-2 border-l-2 border-white/10 pl-2">
                                        "{ex.text}"
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
    );
  }

  // VIEW 2: PRACTICE MODE (DETAILS)
  const currentIndex = TWISTERS_DATA.findIndex(t => t.id === selectedExercise.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < TWISTERS_DATA.length - 1;

  return (
    <div className="min-h-screen bg-[#101622] flex flex-col relative overflow-hidden pb-24">
        {/* Header with Navigation */}
        <div className="pt-8 px-6 pb-2 flex items-center justify-between z-10 bg-[#101622] border-b border-white/5 shadow-md">
            <button 
                onClick={() => {
                    // Se foi aberto diretamente via biblioteca (deep link), volta para lá.
                    // Caso contrário, volta para a lista de módulos interna.
                    if (initialExerciseId) {
                        onBack();
                    } else {
                        setSelectedExercise(null);
                    }
                }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10"
            >
                <span className="material-symbols-rounded">arrow_back</span>
            </button>
            
            <div className="flex items-center gap-4">
                 <button 
                    onClick={() => navigateExercise('prev')}
                    disabled={!hasPrev}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${!hasPrev ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                 >
                    <span className="material-symbols-rounded">chevron_left</span>
                 </button>

                 <div className="text-center">
                    <span className="text-[10px] uppercase tracking-widest text-[#0081FF] font-bold">Módulo {selectedExercise.module}</span>
                    <p className="text-sm font-bold truncate max-w-[150px]">{selectedExercise.title}</p>
                </div>

                <button 
                    onClick={() => navigateExercise('next')}
                    disabled={!hasNext}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${!hasNext ? 'text-gray-700 cursor-not-allowed' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
                 >
                    <span className="material-symbols-rounded">chevron_right</span>
                 </button>
            </div>

            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10">
                <span className="material-symbols-rounded">info</span>
            </button>
        </div>

        <div className="flex-1 flex flex-col px-6 py-4 overflow-y-auto hide-scrollbar z-10">
            {/* ... Conteúdo do exercício (Phases, Text, Controls) mantido ... */}
            
            {/* Phase Selector */}
            <div className="bg-[#1A202C] rounded-xl p-1 flex mb-4 border border-white/5 shrink-0">
                {PHASES.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => setActivePhase(p.id)}
                        className={`flex-1 py-2 rounded-lg flex flex-col items-center gap-1 transition-all ${
                            activePhase === p.id 
                                ? 'bg-[#0081FF] text-white shadow-lg' 
                                : 'text-gray-500 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        <span className="material-symbols-rounded text-lg">{p.icon}</span>
                        <span className="text-[9px] font-bold">{p.label}</span>
                    </button>
                ))}
            </div>

            {/* Contextual Info */}
            <div className="mb-6 space-y-2 shrink-0">
                <div className="bg-[#0081FF]/10 border border-[#0081FF]/20 px-3 py-2 rounded-lg flex gap-2 items-center">
                    <span className="material-symbols-rounded text-[#0081FF] text-lg">lightbulb</span>
                    <p className="text-xs text-blue-100 font-medium">
                        {activePhase === 1 ? "Pratique sem som (Sussurro). Foque no movimento." : 
                         activePhase === 2 ? "Articule exageradamente. Abra bem a boca." : 
                         "Busque velocidade mantendo a clareza."}
                    </p>
                </div>
                
                <div className="px-2">
                    <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Foco Técnico</p>
                    <p className="text-xs text-gray-300 leading-relaxed border-l-2 border-white/10 pl-2">
                        {selectedExercise.instructions}
                    </p>
                </div>
            </div>

            {/* Text Display Area */}
            <div className="flex-1 flex items-center justify-center min-h-[160px] mb-6 relative bg-[#151A23] rounded-2xl p-6 border border-white/5 shadow-inner">
                 {/* Bitola Mode Badge */}
                 {isBitolaMode && (
                    <div className="absolute top-3 right-3 bg-red-500/10 text-red-400 text-[9px] font-bold px-2 py-1 rounded-full border border-red-500/20 flex items-center gap-1">
                        <span className="material-symbols-rounded text-[10px]">block</span>
                        COM OBSTÁCULO
                    </div>
                 )}
                 
                 <p className={`text-center font-serif leading-relaxed transition-all ${
                     isBitolaMode ? 'text-red-100' : 'text-white'
                 } ${
                     activePhase === 1 ? 'text-xl opacity-70 italic' : 
                     activePhase === 2 ? 'text-2xl tracking-wider font-medium' : 
                     'text-xl font-normal'
                 }`}>
                     "{selectedExercise.text}"
                 </p>
            </div>

            {/* Controls Row */}
            <div className="flex gap-3 mb-6 shrink-0">
                <button 
                    onClick={() => setIsBitolaMode(!isBitolaMode)}
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-xl border transition-all ${
                        isBitolaMode 
                            ? 'bg-red-500/20 border-red-500 text-red-200' 
                            : 'bg-[#1A202C] border-white/5 hover:bg-white/5 text-gray-400'
                    }`}
                >
                    <span className="material-symbols-rounded mb-1">hardware</span>
                    <span className="text-[10px] font-bold">Modo Bitola</span>
                </button>
                
                <button className="flex-1 flex flex-col items-center justify-center py-3 rounded-xl bg-[#1A202C] border border-white/5 hover:bg-white/5 text-gray-400 transition-all">
                    <span className="material-symbols-rounded mb-1 text-[#0081FF]">headphones</span>
                    <span className="text-[10px] font-bold">Ouvir Exemplo</span>
                </button>
            </div>

            {/* Metronome Control Panel */}
            <div className="bg-[#1A202C] p-5 rounded-2xl border border-white/5 shrink-0">
                <div className="flex justify-between items-end mb-4">
                    <div className="flex items-center gap-2 text-white">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4V6" stroke="#FF00BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M6 20H18L12 6L6 20Z" stroke="#FF00BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 15L14.5 10" stroke="#FF00BC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="15" r="1.5" fill="#FF00BC"/>
                        </svg>
                        <span className="text-sm font-bold tracking-wide">Metrônomo</span>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-mono text-white font-bold leading-none">{bpm}</div>
                        <div className="text-[10px] text-gray-500 font-medium">BPM</div>
                    </div>
                </div>
                
                <div className="relative mb-6 pt-2">
                    {selectedExercise.targetBpm && (
                        <div 
                            className="absolute -top-2 w-px h-3 bg-[#FF00BC] z-10 flex flex-col items-center"
                            style={{ left: `${Math.min(100, Math.max(0, ((selectedExercise.targetBpm - 50) / (160 - 50)) * 100))}%` }}
                        >
                             <div className="w-2 h-2 rounded-full bg-[#FF00BC] -mt-1"></div>
                             <span className="text-[9px] text-[#FF00BC] font-bold mt-1 whitespace-nowrap">Meta</span>
                        </div>
                    )}
                    <input 
                        type="range" 
                        min="50" 
                        max="160" 
                        step="5"
                        value={bpm} 
                        onChange={(e) => setBpm(parseInt(e.target.value))}
                        className="w-full h-2 bg-[#101622] rounded-lg appearance-none cursor-pointer accent-[#0081FF] relative z-0"
                    />
                </div>
                
                <div className="flex justify-center">
                    <button 
                        onClick={togglePlay}
                        className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                            isPlaying 
                                ? 'bg-[#FF00BC] text-white shadow-[0_0_20px_rgba(255,0,188,0.4)]' 
                                : 'bg-white text-black hover:scale-105'
                        }`}
                    >
                        <span className="material-symbols-rounded text-4xl ml-1">
                            {isPlaying ? 'stop' : 'play_arrow'}
                        </span>
                    </button>
                </div>
            </div>

        </div>
    </div>
  );
};
