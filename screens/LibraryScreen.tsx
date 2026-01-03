
import React, { useState, useEffect, useRef } from 'react';
import { Screen, Module, Vocalize } from '../types';
import { MODULES, VOCALIZES } from '../constants';

interface Props {
  onNavigate: (screen: Screen) => void;
  onPlayVocalize: (vocalize: Vocalize) => void;
  defaultModuleId?: string;
}

export const LibraryScreen: React.FC<Props> = ({ onNavigate, onPlayVocalize, defaultModuleId }) => {
  // Estado inicial null garante que todos comecem fechados
  const [expandedModule, setExpandedModule] = useState<string | null>(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<{title: string; content: string} | null>(null);
  
  // Refs e Estados para o Checklist e Audio Inline
  const contentRef = useRef<HTMLDivElement>(null);
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  
  // Refs para controle de áudio inline
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeBtnRef = useRef<HTMLElement | null>(null);
  const visualizerIntervalRef = useRef<number | null>(null);

  // Carrega estado salvo do checklist ao iniciar
  useEffect(() => {
    const saved = localStorage.getItem('checklist_progress');
    if (saved) {
        try {
            setChecklistState(JSON.parse(saved));
        } catch (e) {
            console.error("Erro ao carregar checklist:", e);
        }
    }
  }, []);

  // Expande o módulo padrão se fornecido (apenas se defaultModuleId for passado explicitamente)
  useEffect(() => {
    if (defaultModuleId) {
        setExpandedModule(defaultModuleId);
    }
  }, [defaultModuleId]);

  // Função para limpar animações e áudio
  const stopCurrentAudio = () => {
    if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
    }

    if (visualizerIntervalRef.current) {
        clearInterval(visualizerIntervalRef.current);
        visualizerIntervalRef.current = null;
    }

    // Reset UI do botão anterior
    if (activeBtnRef.current) {
        const icon = activeBtnRef.current.querySelector('.material-symbols-rounded');
        if (icon) {
            icon.textContent = 'play_arrow';
            // Ajuste fino para centralizar o play visualmente
            icon.classList.add('ml-1'); 
        }
        
        // Reset Visualizer Bars para a altura base (formato do logo estático)
        const container = activeBtnRef.current.closest('div.player-container');
        if (container) {
            const viz = container.querySelector('.audio-viz');
            if (viz) {
                viz.classList.remove('opacity-100');
                viz.classList.add('opacity-50'); // Mantém visível mas discreto
                const bars = viz.querySelectorAll('div');
                bars.forEach(bar => {
                    // Reseta para a altura definida no HTML (data-base-height) ou padrão
                    const baseHeight = bar.getAttribute('data-base-height');
                    if (baseHeight) {
                        bar.style.height = `${baseHeight}px`;
                    } else {
                        bar.style.height = '8px';
                    }
                });
            }
        }
        activeBtnRef.current = null;
    }
  };

  // Para o áudio se fechar o modal
  useEffect(() => {
    if (!selectedTopic) {
        stopCurrentAudio();
    }
  }, [selectedTopic]);

  // Atualiza o visual do checklist sempre que o conteúdo ou o estado mudar
  useEffect(() => {
    if (!selectedTopic || !contentRef.current) return;

    // Aguarda um ciclo para garantir que o DOM foi renderizado dentro do modal
    const timeout = setTimeout(() => {
        if (!contentRef.current) return;
        const items = contentRef.current.querySelectorAll('.checklist-item');

        items.forEach(item => {
            const id = item.getAttribute('data-id');
            const box = item.querySelector('.checkbox-box');
            const icon = item.querySelector('.check-icon');

            if (id && checklistState[id]) {
                // Estilo MARCADO
                if (box) {
                    box.classList.remove('border-gray-600', 'bg-[#1A202C]');
                    box.classList.add('bg-green-500', 'border-green-500');
                }
                if (icon) {
                    icon.classList.remove('opacity-0', 'scale-0');
                    icon.classList.add('opacity-100', 'scale-100');
                }
                item.classList.add('bg-green-500/5');
            } else {
                // Estilo DESMARCADO
                if (box) {
                    box.classList.add('border-gray-600', 'bg-[#1A202C]');
                    box.classList.remove('bg-green-500', 'border-green-500');
                }
                if (icon) {
                    icon.classList.add('opacity-0', 'scale-0');
                    icon.classList.remove('opacity-100', 'scale-100');
                }
                item.classList.remove('bg-green-500/5');
            }
        });
    }, 50);

    return () => clearTimeout(timeout);
  }, [selectedTopic, checklistState]);

  const handleInlinePlay = async (url: string, btn: HTMLElement) => {
    // Se clicou no mesmo botão que estava tocando, apenas para
    if (activeBtnRef.current === btn) {
        stopCurrentAudio();
        return;
    }

    // Para qualquer áudio anterior
    stopCurrentAudio();

    let playUrl = url;

    // 1. Tenta carregar do cache offline
    try {
        if ('caches' in window) {
            const cache = await caches.open('vocalizes-offline-v1');
            const cachedResponse = await cache.match(url);
            if (cachedResponse) {
                const blob = await cachedResponse.blob();
                playUrl = URL.createObjectURL(blob);
                console.log('Tocando exemplo do cache:', url);
            }
        }
    } catch (e) {
        console.warn('Erro ao verificar cache offline, usando rede', e);
    }

    // 2. Inicia novo áudio
    const audio = new Audio(playUrl);
    audioRef.current = audio;
    activeBtnRef.current = btn;

    // Atualiza UI do botão clicado para "Stop"
    const icon = btn.querySelector('.material-symbols-rounded');
    if (icon) {
        icon.textContent = 'stop';
        icon.classList.remove('ml-1'); // Remove ajuste de margem do play
    }

    // Inicia Animação do Visualizer
    const container = btn.closest('div.player-container');
    if (container) {
        const viz = container.querySelector('.audio-viz');
        if (viz) {
            viz.classList.remove('opacity-50');
            viz.classList.add('opacity-100');
            
            const bars = viz.querySelectorAll('div');
            
            // Intervalo para animar as barras respeitando a proporção base
            visualizerIntervalRef.current = window.setInterval(() => {
                bars.forEach(bar => {
                    const baseHeight = parseInt(bar.getAttribute('data-base-height') || '10');
                    // Escala aleatória entre 0.5x e 1.5x da altura base
                    const randomScale = 0.5 + Math.random(); 
                    const h = Math.max(4, Math.min(32, baseHeight * randomScale));
                    bar.style.height = `${h}px`;
                });
            }, 80);
        }
    }

    // 3. Toca com tratamento de erro (AbortError)
    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(e => {
            // Ignora erro de interrupção pelo pause (comum ao trocar rápido de áudio ou interrupção de rede)
            // Verifica tanto o nome do erro quanto a mensagem
            if (e.name === 'AbortError' || e.message?.includes('interrupted by a call to pause')) return;
            
            console.error("Erro ao tocar áudio inline:", e);
            stopCurrentAudio();
        });
    }

    // 4. Ao terminar, reseta UI automaticamente
    audio.onended = () => {
        stopCurrentAudio();
    };
  };

  const handleContentClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;

      // 1. Lógica do Checklist
      const checklistItem = target.closest('.checklist-item');
      if (checklistItem) {
          const id = checklistItem.getAttribute('data-id');
          if (id) {
              const newState = { ...checklistState, [id]: !checklistState[id] };
              setChecklistState(newState);
              localStorage.setItem('checklist_progress', JSON.stringify(newState));
          }
          return;
      }

      // 2. Lógica do Botão de Exemplo (Áudio Inline)
      const playBtn = target.closest('.play-example-btn');
      if (playBtn) {
          e.preventDefault();
          const audioUrl = playBtn.getAttribute('data-src');
          if (audioUrl) {
              handleInlinePlay(audioUrl, playBtn as HTMLElement);
          }
      }
  };

  const toggleModule = (id: string) => {
    setExpandedModule(expandedModule === id ? null : id);
  };

  const getVocalizesForModule = (moduleId: string) => {
    return VOCALIZES.filter(v => v.moduleId === moduleId);
  };

  return (
    <div className="min-h-screen bg-[#101622] pb-24 flex flex-col relative">
      {/* Topic Content Modal (Lesson View) */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 bg-[#101622] flex flex-col animate-in slide-in-from-bottom duration-300">
          <div className="pt-8 px-6 pb-4 bg-[#101622]/95 border-b border-white/5 flex items-center gap-3 sticky top-0">
             <button 
               onClick={() => setSelectedTopic(null)}
               className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10"
             >
               <span className="material-symbols-rounded">close</span>
             </button>
             <h2 className="text-lg font-bold text-white flex-1 truncate">{selectedTopic.title}</h2>
          </div>
          <div 
             className="flex-1 overflow-y-auto p-6 hide-scrollbar" 
             ref={contentRef}
             onClick={handleContentClick}
          >
             <div 
               className="prose prose-invert prose-sm max-w-none"
               dangerouslySetInnerHTML={{ __html: selectedTopic.content }} 
             />
             <div className="h-12"></div>
          </div>
        </div>
      )}

       <header className="pt-8 pb-4 px-6 sticky top-0 bg-[#101622]/95 backdrop-blur-sm z-20 border-b border-white/5 shadow-lg">
        <h1 className="text-xl font-bold text-white mb-1">Academia</h1>
        <p className="text-xs text-[#0081FF] font-medium tracking-wide uppercase mb-4">Módulos do Curso</p>
        
        {/* Search */}
        <div className="relative">
          <span className="material-symbols-rounded absolute left-4 top-3.5 text-gray-500">search</span>
          <input 
            type="text" 
            placeholder="Buscar exercícios ou módulos..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 bg-[#1A202C] rounded-xl pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6F4CE7] border border-white/5"
          />
        </div>
      </header>

      <div className="px-6 py-6 space-y-4 overflow-y-auto hide-scrollbar flex-1">
        {MODULES.map((module) => {
          const isActive = expandedModule === module.id;
          const moduleExercises = getVocalizesForModule(module.id);
          
          if (searchTerm && !module.title.toLowerCase().includes(searchTerm.toLowerCase()) && !moduleExercises.some(v => v.title.toLowerCase().includes(searchTerm.toLowerCase()))) {
             return null;
          }

          return (
            <div 
              key={module.id}
              className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isActive 
                  ? 'bg-[#1A202C] border-[#6F4CE7]/50 shadow-[0_0_30px_rgba(111,76,231,0.1)]' 
                  : 'bg-[#1A202C]/50 border-white/5 hover:bg-[#1A202C]'
              }`}
            >
              {/* Module Header */}
              <button 
                onClick={() => toggleModule(module.id)}
                className="w-full flex items-start p-5 text-left relative"
              >
                <div className={`mr-4 w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg transition-colors ${
                    isActive ? 'bg-brand-gradient text-white' : 'bg-white/5 text-gray-500'
                }`}>
                    {module.number}
                </div>
                
                <div className="flex-1">
                    <h3 className={`font-bold text-lg leading-tight mb-1 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {module.title}
                    </h3>
                    <p className="text-xs text-[#0081FF] font-medium uppercase tracking-wider mb-1">{module.subtitle}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{module.description}</p>
                </div>

                <div className={`ml-2 mt-1 transition-transform duration-300 ${isActive ? 'rotate-180 text-[#6F4CE7]' : 'text-gray-600'}`}>
                    <span className="material-symbols-rounded">expand_more</span>
                </div>
              </button>

              {/* Module Content (Topics & Exercises) */}
              <div className={`transition-all duration-500 ease-in-out ${isActive ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="px-5 pb-5 pt-0">
                    
                    {/* Topics List */}
                    <div className="mb-6 pl-4 border-l border-white/10 space-y-3">
                        {module.topics.map(topic => (
                            <div 
                              key={topic.id} 
                              className={`relative p-2 rounded-lg transition-colors ${topic.content ? 'hover:bg-white/5 cursor-pointer group' : ''}`}
                              onClick={() => {
                                if (topic.content) {
                                  setSelectedTopic({ title: topic.title, content: topic.content });
                                }
                              }}
                            >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className={`text-sm font-semibold ${topic.content ? 'text-[#0081FF] group-hover:text-white' : 'text-white'}`}>
                                      {topic.title}
                                    </p>
                                    <p className="text-[10px] text-gray-500">{topic.description}</p>
                                  </div>
                                  {topic.content && (
                                    <span className="material-symbols-rounded text-gray-600 text-sm group-hover:text-white">article</span>
                                  )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Exercises List */}
                    {moduleExercises.length > 0 && (
                        <div>
                            <h4 className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="material-symbols-rounded text-sm">piano</span>
                                TREINE COM O PIANO
                            </h4>
                            <div className="space-y-2">
                                {moduleExercises.map(exercise => (
                                    <div 
                                        key={exercise.id}
                                        onClick={() => onPlayVocalize(exercise)}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-black/20 hover:bg-white/5 border border-white/5 cursor-pointer group transition-colors"
                                    >
                                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#FF00BC] group-hover:bg-[#FF00BC]/10 transition-colors">
                                            <span className="material-symbols-rounded text-lg">play_arrow</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{exercise.title}</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                                                    exercise.difficulty === 'Iniciante' ? 'bg-green-500/10 text-green-500' :
                                                    exercise.difficulty === 'Intermediário' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                    {exercise.difficulty}
                                                </span>
                                                <span className="text-[10px] text-gray-500">• {exercise.duration}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {moduleExercises.length === 0 && (
                        <div className="p-4 rounded-xl bg-white/5 text-center">
                            <p className="text-xs text-gray-400">Exercícios deste módulo serão liberados em breve.</p>
                        </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}

        <div className="h-4"></div>
      </div>
    </div>
  );
};
