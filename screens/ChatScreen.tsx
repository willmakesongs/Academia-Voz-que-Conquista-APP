
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';
import { MODULES, LORENA_AVATAR_URL } from '../constants';

interface Props {
  onBack: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
  groundingMetadata?: any;
}

// Tarefas iniciais (Mock do contexto do aluno)
const STUDENT_TASKS_CONTEXT = [
  { id: 1, title: 'Aquecimento Matinal', status: 'completed' },
  { id: 2, title: 'Técnica de Respiração (Módulo 3)', status: 'pending' },
  { id: 3, title: 'Repertório: Let It Be', status: 'pending' }
];

// Variáveis globais para persistência
let cachedMessages: Message[] | null = null;
let cachedUserId: string | null = null;

export const ChatScreen: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  
  // Inicializa mensagens do cache se o usuário for o mesmo
  const [messages, setMessages] = useState<Message[]>(() => {
    if (cachedMessages && cachedUserId === user?.id) {
        return cachedMessages;
    }
    return [{
      id: 'welcome',
      role: 'model',
      text: `Olá, ${user?.name || 'Voz'}! 🎶✨ Eu sou a Lorena IA. Como posso ajudar a brilhar sua voz hoje? \n\nPosso sugerir exercícios, tirar dúvidas do método ou encontrar um karaokê pra você treinar!`
    }];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Ref para manter a instância do chat ATUAL
  const chatSessionRef = useRef<Chat | null>(null);

  // Sincroniza cache sempre que mensagens mudarem
  useEffect(() => {
      cachedMessages = messages;
      cachedUserId = user?.id || null;
  }, [messages, user]);

  // Auto-scroll suave
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isTyping]);

  // Inicializa Chat
  useEffect(() => {
    const initChat = async () => {
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Contexto rico sobre o método e o aluno
            const systemPrompt = `
            Você é a **Lorena Pimentel IA**, a mentora virtual da academia "Voz Que Conquista".
            
            **Sua Personalidade:**
            - Vibrante, solar, encorajadora e apaixonada por voz.
            - Use emojis de música (✨, 🎤, 🎶), mas sem exagerar no meio das frases.
            - Fale de forma fluida e humanizada, como uma professora conversando no WhatsApp.

            **Formatação de Resposta:**
            - **Letras de Música:** Se o aluno pedir uma letra, apresente-a de forma limpa, com espaçamento entre as estrofes. Não coloque links ou textos misturados com a letra.
            - **Links e Pesquisas:** Se usar a ferramenta de busca, **NÃO** liste as URLs no corpo do texto. O sistema irá exibi-las automaticamente como cards no final. Mantenha o texto da resposta focado na explicação.
            
            **Seu Conhecimento:**
            Módulos: ${JSON.stringify(MODULES.map(m => m.title))}
            Aluno: ${user?.name}. Tarefas: ${JSON.stringify(STUDENT_TASKS_CONTEXT)}.

            **Regra de Ouro:**
            Termine com uma pergunta motivadora ou ação prática.
            `;

            // Histórico limpo para a API
            const history = messages
                .filter(m => m.id !== 'welcome' && !m.text.includes("Minha conexão falhou"))
                .map(m => ({
                    role: m.role,
                    parts: [{ text: m.text }]
                }));

            chatSessionRef.current = ai.chats.create({
                model: 'gemini-3-flash-preview',
                config: {
                    systemInstruction: systemPrompt,
                    tools: [{ googleSearch: {} }]
                },
                history: history
            });
            
        } catch (e) {
            console.error("Erro ao inicializar chat:", e);
        }
    };

    initChat();
  }, []);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    if (!chatSessionRef.current) {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        chatSessionRef.current = ai.chats.create({ model: 'gemini-3-flash-preview' });
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText
    };

    // Adiciona mensagem do usuário
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    // Cria placeholder para a mensagem da IA
    const botMsgId = (Date.now() + 1).toString();
    const botPlaceholder: Message = {
        id: botMsgId,
        role: 'model',
        text: '', // Começa vazio para o efeito de streaming
        isLoading: true
    };
    setMessages(prev => [...prev, botPlaceholder]);

    try {
        if (chatSessionRef.current) {
            // Usa sendMessageStream para efeito de digitação gradual
            const resultStream = await chatSessionRef.current.sendMessageStream({ message: userMsg.text });
            
            let accumulatedText = '';
            let finalMetadata = null;

            for await (const chunk of resultStream) {
                // Captura texto
                const chunkText = chunk.text || '';
                accumulatedText += chunkText;

                // Captura metadados se houver (geralmente no último chunk ou durante processamento)
                if (chunk.groundingMetadata) {
                    finalMetadata = chunk.groundingMetadata;
                }

                // Atualiza a última mensagem com o texto acumulado
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsgIndex = newMsgs.findIndex(m => m.id === botMsgId);
                    if (lastMsgIndex !== -1) {
                        newMsgs[lastMsgIndex] = {
                            ...newMsgs[lastMsgIndex],
                            text: accumulatedText,
                            groundingMetadata: finalMetadata,
                            isLoading: false // Remove loading assim que começa a chegar texto
                        };
                    }
                    return newMsgs;
                });
            }
        }
    } catch (error) {
        console.error("Erro no chat:", error);
        setMessages(prev => {
            const newMsgs = [...prev];
            // Remove o placeholder vazio se deu erro
            return newMsgs.filter(m => m.id !== botMsgId).concat({
                id: Date.now().toString(),
                role: 'model',
                text: "Ops! Minha conexão falhou momentaneamente. Por favor, tente enviar sua mensagem novamente. 🔌"
            });
        });
        chatSessionRef.current = null;
    } finally {
        setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#101622] flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="pt-8 px-6 pb-4 bg-[#101622]/95 backdrop-blur-sm z-20 border-b border-white/5 flex items-center gap-4 shadow-lg shadow-purple-900/10">
        <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
        >
            <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <div className="flex-1">
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Lorena Pimentel
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            </h1>
            <p className="text-xs text-[#FF00BC] font-medium">Mentora IA • Voz Que Conquista</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-brand-gradient p-[2px]">
            <div className="w-full h-full bg-[#101622] rounded-full flex items-center justify-center overflow-hidden relative">
                 <img src={LORENA_AVATAR_URL} className="w-full h-full object-cover" alt="Lorena Bot" />
            </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar" ref={scrollRef}>
         {messages.map((msg) => (
             <div 
                key={msg.id} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
             >
                 <div 
                    className={`max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed relative ${
                        msg.role === 'user' 
                        ? 'bg-[#1A202C] text-white rounded-tr-none border border-white/10' 
                        : 'bg-gradient-to-br from-[#2D3748] to-[#1A202C] text-gray-100 rounded-tl-none border border-white/5 shadow-md'
                    }`}
                 >
                    {/* Renderiza Markdown simplificado (quebras de linha) */}
                    <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                 </div>

                 {/* Renderiza Grounding como CARDS horizontais abaixo da mensagem */}
                 {msg.groundingMetadata?.groundingChunks && msg.groundingMetadata.groundingChunks.length > 0 && (
                    <div className="w-full max-w-[90%] mt-3 pl-2 overflow-x-auto hide-scrollbar">
                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 flex items-center gap-1">
                            <span className="material-symbols-rounded text-xs">manage_search</span>
                            Sugestões & Referências
                        </p>
                        <div className="flex gap-3 pb-2">
                            {msg.groundingMetadata.groundingChunks.map((chunk: any, idx: number) => (
                                chunk.web?.uri && (
                                    <a 
                                        key={idx} 
                                        href={chunk.web.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="min-w-[200px] max-w-[200px] bg-[#101622] border border-white/10 rounded-xl p-3 hover:border-[#0081FF] transition-colors flex flex-col gap-2 group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-white transition-colors">
                                                <span className="material-symbols-rounded text-xs">public</span>
                                            </div>
                                            <span className="material-symbols-rounded text-xs text-gray-600 -rotate-45">arrow_forward</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-300 line-clamp-2 leading-tight group-hover:text-[#0081FF] transition-colors">
                                            {chunk.web.title || "Referência Externa"}
                                        </span>
                                    </a>
                                )
                            ))}
                        </div>
                    </div>
                 )}
             </div>
         ))}

         {isTyping && messages[messages.length - 1]?.text === '' && (
             <div className="flex justify-start">
                 <div className="bg-[#1A202C] p-4 rounded-2xl rounded-tl-none flex gap-1.5 items-center w-16 h-10 border border-white/5">
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                     <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                 </div>
             </div>
         )}
         
         <div className="h-4"></div>
      </div>

      {/* Quick Actions (Chips) */}
      {!isTyping && messages.length < 4 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto hide-scrollbar">
              <button onClick={() => setInputText("O que tenho pra treinar hoje?")} className="whitespace-nowrap px-4 py-2 rounded-full bg-[#1A202C] border border-white/10 text-xs text-gray-300 hover:text-white hover:border-[#FF00BC]/50 transition-colors">
                  📅 Minha Rotina
              </button>
              <button onClick={() => setInputText("Letra de Queen - Love of my Life")} className="whitespace-nowrap px-4 py-2 rounded-full bg-[#1A202C] border border-white/10 text-xs text-gray-300 hover:text-white hover:border-[#FF00BC]/50 transition-colors">
                  🎵 Letra de Música
              </button>
              <button onClick={() => setInputText("Estou com a garganta arranhando")} className="whitespace-nowrap px-4 py-2 rounded-full bg-[#1A202C] border border-white/10 text-xs text-gray-300 hover:text-white hover:border-[#FF00BC]/50 transition-colors">
                  🚑 SOS Voz
              </button>
          </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-[#101622] border-t border-white/5 pb-24"> 
          <div className="flex gap-2 items-end bg-[#1A202C] p-2 rounded-2xl border border-white/10 focus-within:border-[#6F4CE7] transition-colors shadow-lg">
              <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                      }
                  }}
                  placeholder="Converse com a Lorena..."
                  className="flex-1 bg-transparent text-white text-sm p-3 max-h-32 min-h-[44px] focus:outline-none resize-none hide-scrollbar placeholder-gray-500"
                  rows={1}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    inputText.trim() 
                    ? 'bg-[#0081FF] text-white shadow-lg transform active:scale-95' 
                    : 'bg-white/5 text-gray-600'
                }`}
              >
                  <span className="material-symbols-rounded">send</span>
              </button>
          </div>
          <p className="text-[10px] text-center text-gray-600 mt-2">
              A IA pode cometer erros. Verifique informações importantes.
          </p>
      </div>
    </div>
  );
};
