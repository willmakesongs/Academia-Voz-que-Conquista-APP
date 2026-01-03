
import React, { useState, useEffect, useRef } from 'react';
import { Screen } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import * as Tone from 'tone';

interface Props {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

// --- DADOS E CONSTANTES DO TESTE VOCAL ---
const VOCAL_RANGES_DATA = [
    { name: 'Baixo', min: 40, max: 64, type: 'Masculina', desc: 'E2 - E4' },
    { name: 'Barítono', min: 45, max: 69, type: 'Masculina', desc: 'A2 - A4' },
    { name: 'Tenor', min: 48, max: 72, type: 'Masculina', desc: 'C3 - C5' },
    { name: 'Contralto', min: 53, max: 77, type: 'Feminina', desc: 'F3 - F5' },
    { name: 'Mezzo-soprano', min: 57, max: 81, type: 'Feminina', desc: 'A3 - A5' },
    { name: 'Soprano', min: 60, max: 84, type: 'Feminina', desc: 'C4 - C6' }
];

const NOTE_STRINGS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// --- FUNÇÕES DE ÁUDIO (Pitch Detection Otimizado) ---
function autoCorrelate(buf: Float32Array, sampleRate: number) {
  let SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buf[i];
    rms += val * val;
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.03) return -1; // Noise gate

  let r1 = 0, r2 = SIZE - 1, thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }

  buf = buf.slice(r1, r2);
  SIZE = buf.length;

  let c = new Array(SIZE).fill(0);
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - i; j++) {
      c[i] = c[i] + buf[j] * buf[j + i];
    }
  }

  let d = 0; while (c[d] > c[d + 1]) d++;
  let maxval = -1, maxpos = -1;
  for (let i = d; i < SIZE; i++) {
    if (c[i] > maxval) {
      maxval = c[i];
      maxpos = i;
    }
  }
  let T0 = maxpos;

  let x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
  let a = (x1 + x3 - 2 * x2) / 2;
  let b = (x3 - x1) / 2;
  if (a) T0 = T0 - b / (2 * a);

  return sampleRate / T0;
}

function getNoteFromFrequency(frequency: number) {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  return Math.round(noteNum) + 69;
}

function getNoteStringFromMidi(midi: number) {
    const note = NOTE_STRINGS[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    return `${note}${octave}`;
}

export const ProfileScreen: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const { user } = useAuth();

  // Navigation State
  const [activeView, setActiveView] = useState<'menu' | 'personal_data' | 'subscription' | 'vocal_test' | 'piano' | 'tuner'>('menu');
  
  // --- ESTADOS DO TESTE VOCAL & AFINADOR ---
  const [rangeStep, setRangeStep] = useState<'intro' | 'low' | 'high' | 'result'>('intro');
  const [vocalType, setVocalType] = useState<string>('Indefinido');
  const [userVocalRange, setUserVocalRange] = useState<string>('--');
  const [isMicOn, setIsMicOn] = useState(false);
  const [pitchNote, setPitchNote] = useState('-');
  const [pitchOctave, setPitchOctave] = useState<number | null>(null);
  const [pitchMidi, setPitchMidi] = useState(0);
  const [pitchCents, setPitchCents] = useState(0); // Para o afinador fino
  const [detectedLowMidi, setDetectedLowMidi] = useState<number | null>(null);
  const [detectedHighMidi, setDetectedHighMidi] = useState<number | null>(null);
  const [rangeAnalysisStatus, setRangeAnalysisStatus] = useState('Aguardando som...');

  // Refs de Áudio
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const synthRef = useRef<Tone.Synth | null>(null);

  // --- ESTADOS DO FORMULÁRIO DADOS PESSOAIS ---
  const [formData, setFormData] = useState({
      name: user?.name || '',
      email: 'usuario@email.com', // Mock, já que user não tem email no tipo atual
      phone: '(11) 99999-9999',
      bio: 'Apaixonado por música e buscando evoluir minha técnica vocal.'
  });
  const [isEditing, setIsEditing] = useState(false);
  
  // --- ESTADO DO BOTÃO PIX ---
  const [pixCopyStatus, setPixCopyStatus] = useState('Copiar Chave');

  // Limpeza de áudio ao sair
  useEffect(() => {
      return () => {
          stopMic();
          if (synthRef.current) synthRef.current.dispose();
      };
  }, []);

  // --- LÓGICA DE ÁUDIO ---
  const startMic = async () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioCtx.createMediaStreamSource(stream);
        sourceRef.current = source;
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 4096; // Aumentado para melhor resolução em graves
        source.connect(analyser);
        analyserRef.current = analyser;
        setIsMicOn(true);
        updatePitch();
    } catch (err) {
        console.error("Erro mic:", err);
        alert("Erro ao acessar microfone.");
    }
  };

  const stopMic = () => {
    if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    if (sourceRef.current) {
        sourceRef.current.mediaStream.getTracks().forEach(track => track.stop());
        sourceRef.current.disconnect();
    }
    if (analyserRef.current) analyserRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    setIsMicOn(false);
    setPitchNote('-');
    setPitchOctave(null);
    setPitchMidi(0);
    setPitchCents(0);
  };

  const updatePitch = () => {
    if (!analyserRef.current) return;
    const buf = new Float32Array(analyserRef.current.fftSize);
    analyserRef.current.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, audioContextRef.current?.sampleRate || 44100);

    if (freq !== -1 && freq > 50 && freq < 1400) {
        const noteNum = 12 * (Math.log(freq / 440) / Math.log(2));
        const midi = Math.round(noteNum) + 69;
        const note = NOTE_STRINGS[midi % 12];
        const octave = Math.floor(midi / 12) - 1;
        
        // Cents calculation for Tuner
        const idealFreq = 440 * Math.pow(2, (midi - 69) / 12);
        const cents = 1200 * Math.log2(freq / idealFreq);

        setPitchNote(note);
        setPitchOctave(octave);
        setPitchMidi(midi);
        setPitchCents(cents);
    }
    rafIdRef.current = requestAnimationFrame(updatePitch);
  };

  useEffect(() => {
     if (activeView === 'vocal_test' && isMicOn && pitchMidi > 0) {
        if (rangeStep === 'low') {
            if (pitchMidi > 33) { 
                if (detectedLowMidi === null || pitchMidi < detectedLowMidi) {
                    setDetectedLowMidi(pitchMidi);
                    setRangeAnalysisStatus(`Detectado: ${getNoteStringFromMidi(pitchMidi)}`);
                }
            }
        } else if (rangeStep === 'high') {
            if (pitchMidi < 96) {
                if (detectedHighMidi === null || pitchMidi > detectedHighMidi) {
                    setDetectedHighMidi(pitchMidi);
                    setRangeAnalysisStatus(`Detectado: ${getNoteStringFromMidi(pitchMidi)}`);
                }
            }
        }
     }
  }, [pitchMidi, activeView, isMicOn, rangeStep, detectedLowMidi, detectedHighMidi]);

  const calculateClassification = () => {
      stopMic();
      if (detectedLowMidi && detectedHighMidi) {
          const centerUser = (detectedLowMidi + detectedHighMidi) / 2;
          let bestMatch = 'Indefinido';
          let minDiff = 999;
          VOCAL_RANGES_DATA.forEach(range => {
              const centerRange = (range.min + range.max) / 2;
              const diff = Math.abs(centerUser - centerRange);
              if (diff < minDiff) {
                  minDiff = diff;
                  bestMatch = range.name;
              }
          });
          setVocalType(bestMatch);
          setUserVocalRange(`${getNoteStringFromMidi(detectedLowMidi)} - ${getNoteStringFromMidi(detectedHighMidi)}`);
          setRangeStep('result');
      }
  };

  const resetTest = () => {
      setRangeStep('intro');
      setDetectedLowMidi(null);
      setDetectedHighMidi(null);
      setVocalType('Indefinido');
      setUserVocalRange('--');
      setRangeAnalysisStatus('Aguardando som...');
      stopMic();
  };

  const playNote = (note: string) => {
      if (!synthRef.current) {
          synthRef.current = new Tone.Synth().toDestination();
      }
      if (Tone.context.state !== 'running') Tone.context.resume();
      synthRef.current.triggerAttackRelease(note, "8n");
  };

  const handleCopyPix = () => {
      navigator.clipboard.writeText("lorenapimenteloficial@gmail.com"); 
      setPixCopyStatus('Copiado!');
      setTimeout(() => setPixCopyStatus('Copiar Chave'), 2000);
  };

  // --- RENDERIZADORES DE VIEW ---

  const renderHeader = (title: string, onBackAction: () => void) => (
      <div className="pt-8 px-6 pb-4 bg-[#101622]/95 z-20 border-b border-white/5 flex items-center gap-3 sticky top-0">
          <button 
              onClick={onBackAction}
              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
          >
              <span className="material-symbols-rounded">arrow_back</span>
          </button>
          <h1 className="text-xl font-bold text-white">{title}</h1>
      </div>
  );

  const renderMenu = () => (
      <div className="flex-1 overflow-y-auto hide-scrollbar animate-in slide-in-from-left duration-300">
          {/* Header Profile Info */}
          <div className="pt-10 px-6 pb-8 bg-gradient-to-b from-[#1A202C] to-[#101622] text-center border-b border-white/5 relative overflow-hidden">
              <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-[150%] h-[200px] bg-[#0081FF]/10 blur-[80px] rounded-full pointer-events-none"></div>
              
              <div className="relative z-10">
                  <div className="w-24 h-24 mx-auto rounded-full p-[3px] bg-brand-gradient mb-4 shadow-xl shadow-blue-900/20">
                      <div className="w-full h-full rounded-full bg-[#151A23] p-1">
                          <img 
                              src={user?.avatarUrl || 'https://picsum.photos/200'} 
                              alt="Profile" 
                              className="w-full h-full rounded-full object-cover"
                          />
                      </div>
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-1">{user?.name || 'Visitante'}</h2>
                  <p className="text-sm text-gray-400 mb-3">{user?.role === 'teacher' ? 'Professor(a)' : 'Aluno(a) Premium'}</p>
                  
                  <div className="flex justify-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-[#0081FF]/10 text-[#0081FF] border border-[#0081FF]/20 text-[10px] font-bold uppercase tracking-wider">
                          Plano Pro
                      </span>
                      {vocalType !== 'Indefinido' && (
                          <span className="px-3 py-1 rounded-full bg-[#6F4CE7]/10 text-[#6F4CE7] border border-[#6F4CE7]/20 text-[10px] font-bold uppercase tracking-wider">
                              {vocalType}
                          </span>
                      )}
                  </div>
              </div>
          </div>

          <div className="p-6 space-y-8">
              {/* Seção Ferramentas */}
              <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Meu Estúdio</h3>
                  <div className="grid grid-cols-2 gap-3">
                      <button 
                          onClick={() => setActiveView('vocal_test')}
                          className="bg-[#1A202C] p-4 rounded-2xl border border-white/5 hover:border-[#6F4CE7]/50 transition-all group text-left relative overflow-hidden hover:shadow-lg hover:shadow-purple-900/20"
                      >
                          <div className="absolute inset-0 bg-gradient-to-br from-[#6F4CE7]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="w-10 h-10 rounded-xl bg-[#6F4CE7]/20 flex items-center justify-center text-[#6F4CE7] mb-3 group-hover:scale-110 transition-transform">
                              <span className="material-symbols-rounded">graphic_eq</span>
                          </div>
                          <h4 className="font-bold text-white text-sm">Extensão Vocal</h4>
                          <p className="text-[10px] text-gray-500 mt-1">Descubra sua classificação.</p>
                      </button>
                      
                      <button 
                          onClick={() => setActiveView('piano')}
                          className="bg-[#1A202C] p-4 rounded-2xl border border-white/5 hover:border-[#FF00BC]/50 transition-all group text-left relative overflow-hidden hover:shadow-lg hover:shadow-pink-900/20"
                      >
                          <div className="absolute inset-0 bg-gradient-to-br from-[#FF00BC]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="w-10 h-10 rounded-xl bg-[#FF00BC]/20 flex items-center justify-center text-[#FF00BC] mb-3 group-hover:scale-110 transition-transform">
                              <span className="material-symbols-rounded">piano</span>
                          </div>
                          <h4 className="font-bold text-white text-sm">Piano Virtual</h4>
                          <p className="text-[10px] text-gray-500 mt-1">Teclado para treino.</p>
                      </button>

                      <button 
                          onClick={() => setActiveView('tuner')}
                          className="col-span-2 bg-[#1A202C] p-4 rounded-2xl border border-white/5 hover:border-[#0081FF]/50 transition-all group flex items-center gap-4 relative overflow-hidden hover:shadow-lg hover:shadow-blue-900/20"
                      >
                          <div className="absolute inset-0 bg-gradient-to-r from-[#0081FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                          <div className="w-10 h-10 rounded-xl bg-[#0081FF]/20 flex items-center justify-center text-[#0081FF] group-hover:scale-110 transition-transform shrink-0">
                              <span className="material-symbols-rounded">tune</span>
                          </div>
                          <div>
                              <h4 className="font-bold text-white text-sm">Afinador Cromático</h4>
                              <p className="text-[10px] text-gray-500 mt-0.5">Verifique sua afinação em tempo real.</p>
                          </div>
                      </button>
                  </div>
              </div>

              {/* Seção Minha Conta */}
              <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 px-1">Minha Conta</h3>
                  <div className="bg-[#1A202C] rounded-2xl border border-white/5 overflow-hidden">
                       <button 
                          onClick={() => setActiveView('personal_data')}
                          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5"
                       >
                           <div className="flex items-center gap-4">
                               <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                   <span className="material-symbols-rounded text-lg">person</span>
                               </div>
                               <div className="text-left">
                                   <span className="text-sm font-semibold text-white block">Dados Pessoais</span>
                                   <span className="text-[10px] text-gray-500 block">Nome, contato e bio</span>
                               </div>
                           </div>
                           <span className="material-symbols-rounded text-gray-600">chevron_right</span>
                       </button>

                       <button 
                          onClick={() => setActiveView('subscription')}
                          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                       >
                           <div className="flex items-center gap-4">
                               <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                                   <span className="material-symbols-rounded text-lg">credit_card</span>
                               </div>
                               <div className="text-left">
                                   <span className="text-sm font-semibold text-white block">Assinatura</span>
                                   <span className="text-[10px] text-gray-500 block">Gerenciar plano e pagamentos</span>
                               </div>
                           </div>
                           <span className="material-symbols-rounded text-gray-600">chevron_right</span>
                       </button>
                  </div>
              </div>

              <button 
                  onClick={onLogout}
                  className="w-full py-4 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
              >
                  <span className="material-symbols-rounded">logout</span>
                  Sair da Conta
              </button>

              <div className="text-center pb-8 pt-4">
                  <p className="text-[10px] text-gray-600">Versão 2.1.0 • Build 2405</p>
                  <div className="flex justify-center mt-2 opacity-30">
                     <Logo size="sm" />
                  </div>
              </div>
          </div>
      </div>
  );

  const renderPersonalData = () => (
      <div className="flex-1 flex flex-col bg-[#101622] animate-in slide-in-from-right">
          {renderHeader('Dados Pessoais', () => setActiveView('menu'))}
          
          <div className="p-6 flex-1 overflow-y-auto hide-scrollbar">
              <div className="bg-[#1A202C] p-6 rounded-2xl border border-white/5 mb-6 text-center">
                  <div className="relative inline-block mb-4">
                      <img 
                          src={user?.avatarUrl} 
                          className="w-20 h-20 rounded-full border-2 border-white/10"
                          alt="Avatar"
                      />
                      <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#0081FF] border-2 border-[#1A202C] flex items-center justify-center text-white">
                          <span className="material-symbols-rounded text-sm">edit</span>
                      </button>
                  </div>
                  <p className="text-xs text-gray-400">Toque para alterar a foto</p>
              </div>

              <div className="space-y-5">
                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Nome Completo</label>
                      <input 
                          type="text" 
                          value={formData.name}
                          disabled={!isEditing}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full h-12 bg-[#1A202C] rounded-xl border border-white/10 px-4 text-white text-sm focus:border-[#0081FF] disabled:opacity-50"
                      />
                  </div>

                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">E-mail</label>
                      <input 
                          type="email" 
                          value={formData.email}
                          disabled={true}
                          className="w-full h-12 bg-[#1A202C] rounded-xl border border-white/10 px-4 text-gray-400 text-sm opacity-50 cursor-not-allowed"
                      />
                      <p className="text-[10px] text-gray-600 ml-1">O e-mail não pode ser alterado.</p>
                  </div>

                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Telefone</label>
                      <input 
                          type="tel" 
                          value={formData.phone}
                          disabled={!isEditing}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full h-12 bg-[#1A202C] rounded-xl border border-white/10 px-4 text-white text-sm focus:border-[#0081FF] disabled:opacity-50"
                      />
                  </div>

                  <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase ml-1">Bio / Objetivos</label>
                      <textarea 
                          value={formData.bio}
                          disabled={!isEditing}
                          onChange={(e) => setFormData({...formData, bio: e.target.value})}
                          className="w-full h-24 bg-[#1A202C] rounded-xl border border-white/10 p-4 text-white text-sm focus:border-[#0081FF] disabled:opacity-50 resize-none"
                      />
                  </div>
              </div>
          </div>

          <div className="p-6 border-t border-white/5 bg-[#151A23]">
              {isEditing ? (
                  <button 
                      onClick={() => setIsEditing(false)}
                      className="w-full h-12 rounded-xl bg-[#0081FF] text-white font-bold hover:bg-[#006bd1] transition-colors"
                  >
                      Salvar Alterações
                  </button>
              ) : (
                  <button 
                      onClick={() => setIsEditing(true)}
                      className="w-full h-12 rounded-xl bg-white/5 border border-white/5 text-white font-bold hover:bg-white/10 transition-colors"
                  >
                      Editar Perfil
                  </button>
              )}
          </div>
      </div>
  );

  const renderSubscription = () => (
      <div className="flex-1 flex flex-col bg-[#101622] animate-in slide-in-from-right">
          {renderHeader('Assinatura', () => setActiveView('menu'))}

          <div className="p-6 flex-1 overflow-y-auto hide-scrollbar">
              {/* Cartão do Plano Customizado com Nova Arte */}
              <div className="relative w-full h-48 rounded-2xl overflow-hidden mb-8 shadow-2xl shadow-purple-900/30 group bg-black">
                  <img 
                      src="https://sedjnyryixudxmmkeoam.supabase.co/storage/v1/object/public/VOCALIZES%20mp3/Fotos/Capa%20Pagamento.png" 
                      alt="Cartão Assinatura" 
                      className="absolute inset-0 w-full h-full object-cover"
                  />
                  
                  {/* Overlay Content */}
                  <div className="relative z-10 flex flex-col justify-between h-full p-6">
                      <div className="flex justify-between items-start">
                          <div></div> {/* Empty Left Side */}
                          <span className="px-2 py-1 bg-white/20 rounded-lg text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm text-white border border-white/10 shadow-sm">PRO</span>
                      </div>
                      
                      {/* Status Moved to Right */}
                      <div className="text-right">
                          <p className="text-xs text-white/90 mb-1 font-medium drop-shadow-md shadow-black">Status do Plano</p>
                          <div className="flex items-center justify-end gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]"></span>
                              <span className="text-lg font-bold text-white drop-shadow-md shadow-black">Ativo</span>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                  <div>
                      <h3 className="text-white font-bold mb-3">Detalhes do Plano</h3>
                      <div className="bg-[#1A202C] rounded-xl border border-white/5 divide-y divide-white/5">
                          <div className="p-4 flex justify-between items-center">
                              <span className="text-sm text-gray-400">Renovação</span>
                              <span className="text-sm text-white font-medium">02 de Fevereiro, 2026</span>
                          </div>
                          <div className="p-4 flex justify-between items-center">
                              <span className="text-sm text-gray-400">Valor</span>
                              <span className="text-sm text-white font-medium">R$ 97,00 / mês</span>
                          </div>
                          <div className="p-4 flex justify-between items-center">
                              <span className="text-sm text-gray-400">Forma de Pagamento</span>
                              <div className="flex items-center gap-2">
                                  <span className="material-symbols-rounded text-gray-400 text-sm">credit_card</span>
                                  <span className="text-sm text-white font-medium">PIX / Cartão</span>
                              </div>
                          </div>
                          
                          {/* Chave PIX adicionada aqui */}
                          <div className="p-4 bg-white/5 flex flex-col gap-2">
                              <span className="text-[10px] text-gray-400 uppercase font-bold">Chave PIX (E-mail)</span>
                              <div className="flex gap-2">
                                  <div className="flex-1 bg-[#101622] border border-white/10 rounded-lg px-3 py-2 flex items-center">
                                      <span className="text-xs text-white font-mono select-all truncate">
                                          lorenapimenteloficial@gmail.com
                                      </span>
                                  </div>
                                  <button 
                                      onClick={handleCopyPix}
                                      className={`px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                                          pixCopyStatus === 'Copiado!' 
                                          ? 'bg-green-500 text-white' 
                                          : 'bg-white/10 text-white hover:bg-white/20'
                                      }`}
                                  >
                                      <span className="material-symbols-rounded text-sm">
                                          {pixCopyStatus === 'Copiado!' ? 'check' : 'content_copy'}
                                      </span>
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div>
                      <h3 className="text-white font-bold mb-3">Histórico</h3>
                      <div className="space-y-2">
                          {[1, 2, 3].map((i) => (
                              <div key={i} className="flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500">
                                          <span className="material-symbols-rounded text-sm">check</span>
                                      </div>
                                      <div>
                                          <p className="text-sm text-white font-medium">Pagamento Efetuado</p>
                                          <p className="text-[10px] text-gray-500">02 de {['Janeiro', 'Dezembro', 'Novembro'][i-1]}</p>
                                      </div>
                                  </div>
                                  <span className="text-sm text-gray-300">R$ 97,00</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderPiano = () => (
      <div className="flex-1 flex flex-col animate-in slide-in-from-right">
          {renderHeader('Piano Virtual', () => setActiveView('menu'))}
          
          <div className="flex-1 flex items-center justify-center p-4">
              <div className="relative flex justify-center items-start bg-[#151A23] p-6 rounded-3xl border border-white/5 shadow-2xl overflow-x-auto hide-scrollbar">
                  {/* Teclas Brancas */}
                  {['C3','D3','E3','F3','G3','A3','B3','C4','D4','E4','F4','G4'].map(note => (
                      <button
                          key={note}
                          onMouseDown={() => playNote(note)}
                          className="w-12 h-40 bg-white border border-gray-300 rounded-b-lg hover:bg-gray-100 active:bg-gray-200 transition-colors mx-0.5 relative z-10 shadow-sm"
                      >
                          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-gray-500">{note}</span>
                      </button>
                  ))}
                  
                  {/* Teclas Pretas (Absolutas) */}
                  <div className="absolute top-6 left-6 flex pointer-events-none z-20">
                      <div className="w-[52px]"></div> {/* Spacer C */}
                      <button onMouseDown={() => playNote('C#3')} className="w-8 h-24 bg-black rounded-b-lg pointer-events-auto hover:bg-gray-800 active:bg-gray-700 shadow-md ml-[-16px]"></button>
                      <div className="w-[52px]"></div> {/* Spacer D */}
                      <button onMouseDown={() => playNote('D#3')} className="w-8 h-24 bg-black rounded-b-lg pointer-events-auto hover:bg-gray-800 active:bg-gray-700 shadow-md ml-[-16px]"></button>
                      <div className="w-[104px]"></div> {/* Spacer E, F */}
                      <button onMouseDown={() => playNote('F#3')} className="w-8 h-24 bg-black rounded-b-lg pointer-events-auto hover:bg-gray-800 active:bg-gray-700 shadow-md ml-[-16px]"></button>
                      <div className="w-[52px]"></div> {/* Spacer G */}
                      <button onMouseDown={() => playNote('G#3')} className="w-8 h-24 bg-black rounded-b-lg pointer-events-auto hover:bg-gray-800 active:bg-gray-700 shadow-md ml-[-16px]"></button>
                      <div className="w-[52px]"></div> {/* Spacer A */}
                      <button onMouseDown={() => playNote('A#3')} className="w-8 h-24 bg-black rounded-b-lg pointer-events-auto hover:bg-gray-800 active:bg-gray-700 shadow-md ml-[-16px]"></button>
                      <div className="w-[104px]"></div> {/* Spacer B, C */}
                      <button onMouseDown={() => playNote('C#4')} className="w-8 h-24 bg-black rounded-b-lg pointer-events-auto hover:bg-gray-800 active:bg-gray-700 shadow-md ml-[-16px]"></button>
                      <div className="w-[52px]"></div> {/* Spacer D */}
                      <button onMouseDown={() => playNote('D#4')} className="w-8 h-24 bg-black rounded-b-lg pointer-events-auto hover:bg-gray-800 active:bg-gray-700 shadow-md ml-[-16px]"></button>
                      <div className="w-[104px]"></div> {/* Spacer E, F */}
                      <button onMouseDown={() => playNote('F#4')} className="w-8 h-24 bg-black rounded-b-lg pointer-events-auto hover:bg-gray-800 active:bg-gray-700 shadow-md ml-[-16px]"></button>
                  </div>
              </div>
          </div>
          <div className="p-6 text-center text-gray-500 text-xs">
              Toque nas teclas para ouvir o tom de referência.
          </div>
      </div>
  );

  const renderTuner = () => (
      <div className="flex-1 flex flex-col animate-in slide-in-from-right">
          {renderHeader('Afinador', () => { stopMic(); setActiveView('menu'); })}
          
          <div className="flex-1 flex flex-col items-center justify-center p-6">
              {!isMicOn ? (
                  <div className="text-center">
                      <div className="w-24 h-24 bg-[#1A202C] rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                          <span className="material-symbols-rounded text-4xl text-gray-500">mic_off</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-6 max-w-xs mx-auto">
                          Ative o microfone para começar a detectar a nota que você está cantando.
                      </p>
                      <button 
                          onClick={startMic}
                          className="px-8 py-3 rounded-xl bg-[#0081FF] text-white font-bold hover:bg-[#006bd1] transition-colors shadow-lg shadow-blue-900/20"
                      >
                          Ligar Microfone
                      </button>
                  </div>
              ) : (
                  <div className="text-center w-full max-w-xs">
                      <div className={`relative w-64 h-64 mx-auto rounded-full border-8 flex items-center justify-center transition-colors duration-300 ${
                          Math.abs(pitchCents) < 10 && pitchNote !== '-' ? 'border-green-500 bg-green-500/5' : 'border-[#1A202C] bg-[#1A202C]'
                      }`}>
                          <div>
                              <div className="text-8xl font-bold text-white font-mono tracking-tighter">
                                  {pitchNote}
                              </div>
                              {pitchOctave !== null && (
                                  <div className="text-2xl text-gray-500 font-medium">
                                      {pitchOctave}
                                  </div>
                              )}
                          </div>
                          
                          {/* Gauge Needle */}
                          {pitchNote !== '-' && (
                              <div 
                                  className="absolute top-0 bottom-0 w-1 bg-red-500 origin-center transition-transform duration-100 ease-linear rounded-full opacity-70"
                                  style={{ transform: `rotate(${pitchCents}deg)` }}
                              ></div>
                          )}
                      </div>

                      <div className="mt-8 flex justify-center items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${pitchCents < -10 ? 'bg-red-500' : 'bg-gray-700'}`}></div>
                          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2">
                              {Math.abs(pitchCents) < 10 && pitchNote !== '-' ? 'AFINADO' : (pitchCents < 0 ? 'BAIXO' : 'ALTO')}
                          </span>
                          <div className={`w-3 h-3 rounded-full ${pitchCents > 10 ? 'bg-red-500' : 'bg-gray-700'}`}></div>
                      </div>
                      
                      <button 
                          onClick={stopMic}
                          className="mt-12 px-6 py-2 rounded-lg bg-white/5 text-gray-400 text-xs hover:bg-white/10 transition-colors"
                      >
                          Parar
                      </button>
                  </div>
              )}
          </div>
      </div>
  );

  const renderVocalTest = () => (
     <div className="flex-1 flex flex-col relative animate-in zoom-in-95 duration-300">
        {/* Header Específico do Teste */}
        <div className="pt-8 px-6 pb-2 flex items-center justify-between z-10">
             <button 
                onClick={() => {
                    stopMic();
                    setActiveView('menu');
                    setRangeStep('intro');
                }}
                className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10"
            >
                <span className="material-symbols-rounded">close</span>
            </button>
            <h2 className="font-bold text-white text-sm uppercase tracking-widest">Analisador Vocal</h2>
            <div className="w-10"></div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
            {/* Background Effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#6F4CE7]/20 blur-[100px] rounded-full pointer-events-none"></div>

            {/* STEP 1: INTRO */}
            {rangeStep === 'intro' && (
                 <div className="text-center w-full max-w-sm animate-in fade-in relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-[#0081FF] to-[#6F4CE7] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-900/40">
                        <span className="material-symbols-rounded text-5xl text-white">mic</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3">Descubra sua Voz</h2>
                    <p className="text-gray-400 text-sm mb-10 leading-relaxed px-4">
                        Vamos identificar suas notas mais graves e agudas para definir sua classificação vocal exata.
                    </p>
                    
                    <button 
                        onClick={() => { setRangeStep('low'); startMic(); }}
                        className="w-full py-4 rounded-2xl bg-[#white] text-black bg-white font-bold hover:bg-gray-200 transition-colors shadow-lg"
                    >
                        Iniciar Teste
                    </button>
                    <p className="text-[10px] text-gray-500 mt-4 flex items-center justify-center gap-1">
                        <span className="material-symbols-rounded text-xs">headphones</span> Recomendado usar fones
                    </p>
                 </div>
            )}

            {/* STEP 2 & 3: DETECTION */}
            {(rangeStep === 'low' || rangeStep === 'high') && (
                 <div className="text-center w-full max-w-sm animate-in slide-in-from-right relative z-10">
                     <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 ${rangeStep === 'low' ? 'bg-[#0081FF]/20 text-[#0081FF]' : 'bg-[#FF00BC]/20 text-[#FF00BC]'}`}>
                        {rangeStep === 'low' ? 'Passo 1: Graves' : 'Passo 2: Agudos'}
                     </span>

                     <h2 className="text-2xl font-bold text-white mb-2">
                        {rangeStep === 'low' ? 'Desça o tom...' : 'Suba o tom...'}
                     </h2>
                     <p className="text-gray-400 text-sm mb-8">
                        {rangeStep === 'low' ? 'Faça um "Uooo" bem grave e sustentado.' : 'Faça um "Iiiii" agudo e limpo.'}
                     </p>

                     <div className="bg-[#1A202C]/80 backdrop-blur-md rounded-3xl p-8 mb-8 border border-white/10 relative overflow-hidden shadow-2xl">
                         <p className="text-gray-500 text-xs uppercase font-bold mb-2">Nota Detectada</p>
                         <div className="text-7xl font-bold text-white mb-2 font-mono tracking-tighter">
                             {pitchNote !== '-' ? `${pitchNote}${pitchOctave}` : '--'}
                         </div>
                         <div className={`h-1 w-full rounded-full overflow-hidden bg-gray-800 mt-4`}>
                             <div className={`h-full transition-all duration-100 ${pitchNote !== '-' ? (rangeStep === 'low' ? 'bg-[#0081FF] w-full' : 'bg-[#FF00BC] w-full') : 'w-0'}`}></div>
                         </div>
                     </div>

                     <div className="flex justify-between items-center px-4 py-3 bg-white/5 rounded-xl mb-8">
                        <span className="text-gray-400 text-xs">Melhor registro:</span>
                        <span className="text-xl font-bold text-white font-mono">
                            {rangeStep === 'low' 
                                ? (detectedLowMidi ? getNoteStringFromMidi(detectedLowMidi) : '--') 
                                : (detectedHighMidi ? getNoteStringFromMidi(detectedHighMidi) : '--')}
                        </span>
                     </div>

                     {rangeStep === 'low' ? (
                         <button 
                            onClick={() => { if(detectedLowMidi) { setRangeStep('high'); setRangeAnalysisStatus('Aguardando agudos...'); } }}
                            disabled={!detectedLowMidi}
                            className="w-full py-4 rounded-xl bg-[#0081FF] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#006bd1] transition-colors"
                         >
                             Ir para Agudos
                         </button>
                     ) : (
                         <button 
                            onClick={calculateClassification}
                            disabled={!detectedHighMidi}
                            className="w-full py-4 rounded-xl bg-[#FF00BC] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#d6009e] transition-colors"
                         >
                             Finalizar
                         </button>
                     )}
                 </div>
            )}

            {/* STEP 4: RESULT */}
            {rangeStep === 'result' && (
             <div className="text-center w-full max-w-sm animate-in zoom-in duration-500 relative z-10">
                <div className="bg-gradient-to-b from-[#1A202C] to-[#151A23] rounded-3xl p-1 border border-white/10 shadow-2xl">
                    <div className="bg-[#101622] rounded-[22px] p-8 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#6F4CE7] blur-[80px] opacity-20"></div>
                        
                        <p className="text-gray-400 text-xs uppercase tracking-wider mb-2">Sua Classificação</p>
                        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 mb-6">{vocalType}</h2>

                        <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5 flex flex-col items-center">
                            <span className="text-[10px] text-gray-500 uppercase font-bold mb-1">Extensão Completa</span>
                            <p className="text-2xl font-mono font-bold text-[#0081FF]">{userVocalRange}</p>
                        </div>

                        <p className="text-xs text-gray-400 leading-relaxed mb-8">
                            Resultado salvo no seu perfil. Use essa informação para escolher o repertório adequado na biblioteca.
                        </p>

                        <div className="space-y-3">
                            <button 
                                onClick={resetTest}
                                className="w-full py-3 rounded-xl bg-white/5 text-white border border-white/10 hover:bg-white/10 font-bold transition-colors"
                            >
                                Refazer Teste
                            </button>
                            <button 
                                onClick={() => setActiveView('menu')}
                                className="w-full py-3 rounded-xl text-gray-400 hover:text-white transition-colors text-xs"
                            >
                                Voltar ao Menu
                            </button>
                        </div>
                    </div>
                </div>
             </div>
            )}
        </div>
     </div>
  );

  // --- RENDER MAIN ---
  return (
    <div className="min-h-screen bg-[#101622] flex flex-col relative overflow-hidden">
        {activeView === 'menu' && renderMenu()}
        {activeView === 'personal_data' && renderPersonalData()}
        {activeView === 'subscription' && renderSubscription()}
        {activeView === 'vocal_test' && renderVocalTest()}
        {activeView === 'piano' && renderPiano()}
        {activeView === 'tuner' && renderTuner()}
    </div>
  );
};
