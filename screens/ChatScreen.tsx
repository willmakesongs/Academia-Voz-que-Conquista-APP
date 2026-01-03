
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
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

    // State para a Chave de API
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [showConfig, setShowConfig] = useState(false);
    const [configInput, setConfigInput] = useState('');

    // Inicializa mensagens do cache
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
    const chatSessionRef = useRef<any | null>(null);

    // Verifica e carrega a Chave de API
    useEffect(() => {
        const checkKey = () => {
            // 1. Tenta pegar do ambiente (Vercel/env)
            const envKey = process.env.API_KEY;
            // Verifica se é uma chave válida (não vazia e não placeholder)
            if (envKey && envKey.length > 20 && !envKey.includes('PLACEHOLDER')) {
                setApiKey(envKey);
                return;
            }

            // 2. Tenta pegar do LocalStorage (Salva pelo usuário)
            const localKey = localStorage.getItem('gemini_api_key');
            if (localKey) {
                setApiKey(localKey);
                return;
            }

            // 3. Se não tiver chave, mostra tela de configuração
            setShowConfig(true);
        };

        checkKey();
    }, []);

    // Sincroniza cache
    useEffect(() => {
        cachedMessages = messages;
        cachedUserId = user?.id || null;
    }, [messages, user]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [messages, isTyping]);

    // Inicializa Chat (Apenas quando tiver chave)
    useEffect(() => {
        if (!apiKey) return;

        const initChat = async () => {
            try {
                const genAI = new GoogleGenerativeAI(apiKey);

                const systemPrompt = `
            Você é a **Lorena Pimentel IA**, a mentora virtual da academia "Voz Que Conquista".
            
            **Sua Personalidade:**
            - Vibrante, solar, encorajadora e apaixonada por voz.
            - Use emojis de música (✨, 🎤, 🎶), mas sem exagerar no meio das frases.
            - Fale de forma fluida e humanizada, como uma professora conversando no WhatsApp.

            **Formatação de Resposta:**
            - **Letras de Música:** Se o aluno pedir uma letra, apresente-a de forma limpa, com espaçamento entre as estrofes. Não coloque links no meio da letra.
            - **Links:** Se usar a ferramenta de busca, NÃO liste as URLs no texto. O sistema exibe cards automaticamente.
            
            **Seu Conhecimento:**
            Módulos: ${JSON.stringify(MODULES.map(m => m.title))}
            Aluno: ${user?.name}. Tarefas: ${JSON.stringify(STUDENT_TASKS_CONTEXT)}.

            **Regra de Ouro:**
            Termine com uma pergunta motivadora ou ação prática.
            `;

                // Tenta usar a versão específica 001 que é mais estável
                const model = genAI.getGenerativeModel({
                    model: "gemini-1.5-flash-001",
                    systemInstruction: systemPrompt
                });

                const history = messages
                    .filter(m => m.id !== 'welcome' && !m.text.includes("Minha conexão falhou") && !m.text.includes("Erro Técnico"))
                    .map(m => ({
                        role: m.role,
                        parts: [{ text: m.text }]
                    }));

                console.log("Iniciando chat com histórico:", history.length);

                chatSessionRef.current = model.startChat({
                    history: history
                });

            } catch (e) {
                console.error("Erro ao inicializar chat:", e);
            }
        };

        initChat();
    }, [apiKey]); // Recria se a chave mudar

    const handleSaveKey = () => {
        if (!configInput.trim() || configInput.length < 20) {
            alert("Por favor, insira uma chave API válida.");
            return;
        }
        localStorage.setItem('gemini_api_key', configInput.trim());
        setApiKey(configInput.trim());
        setShowConfig(false);
    };

    const handleSendMessage = async () => {
        if (!inputText.trim()) return;

        if (!apiKey) {
            setShowConfig(true);
            return;
        }

        if (!chatSessionRef.current) {
            // Tenta recriar se perdeu a sessão por algum motivo
            const systemPrompt = `
            Você é a **Lorena Pimentel IA**, a mentora virtual da academia "Voz Que Conquista".
            
            **Sua Personalidade:**
            - Vibrante, solar, encorajadora e apaixonada por voz.
            - Use emojis de música (✨, 🎤, 🎶), mas sem exagerar no meio das frases.
            - Fale de forma fluida e humanizada, como uma professora conversando no WhatsApp.

            **Formatação de Resposta:**
            - **Letras de Música:** Se o aluno pedir uma letra, apresente-a de forma limpa, com espaçamento entre as estrofes. Não coloque links no meio da letra.
            - **Links:** Se usar a ferramenta de busca, NÃO liste as URLs no texto. O sistema exibe cards automaticamente.
            
            **Seu Conhecimento:**
            Módulos: ${JSON.stringify(MODULES.map(m => m.title))}
            Aluno: ${user?.name}. Tarefas: ${JSON.stringify(STUDENT_TASKS_CONTEXT)}.

            **Regra de Ouro:**
            Termine com uma pergunta motivadora ou ação prática.
            `;

            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-001", systemInstruction: systemPrompt });
            chatSessionRef.current = model.startChat({});
        }

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        const botMsgId = (Date.now() + 1).toString();
        const botPlaceholder: Message = {
            id: botMsgId,
            role: 'model',
            text: '',
            isLoading: true
        };
        setMessages(prev => [...prev, botPlaceholder]);

        try {
            if (chatSessionRef.current) {
                const result = await chatSessionRef.current.sendMessageStream(userMsg.text);

                let accumulatedText = '';
                let finalMetadata = null;

                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    accumulatedText += chunkText;

                    if (chunk.groundingMetadata) {
                        finalMetadata = chunk.groundingMetadata;
                    }

                    setMessages(prev => {
                        const newMsgs = [...prev];
                        const lastMsgIndex = newMsgs.findIndex(m => m.id === botMsgId);
                        if (lastMsgIndex !== -1) {
                            newMsgs[lastMsgIndex] = {
                                ...newMsgs[lastMsgIndex],
                                text: accumulatedText,
                                groundingMetadata: finalMetadata,
                                isLoading: false
                            };
                        }
                        return newMsgs;
                    });
                }
            }
        } catch (error: any) {
            console.error("Erro no chat:", error);

            // Log mais detalhado do erro
            const errorMessage = error?.message || String(error);
            const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error));
            console.log("Detalhes do erro:", errorDetails);

            // Se erro for de autenticação, pede a chave novamente
            if (errorMessage.includes('400') || errorMessage.includes('API key') || errorMessage.includes('permission denied')) {
                localStorage.removeItem('gemini_api_key');
                setApiKey(null);
                setShowConfig(true);
            }

            setMessages(prev => {
                const newMsgs = [...prev];
                return newMsgs.filter(m => m.id !== botMsgId).concat({
                    id: Date.now().toString(),
                    role: 'model',
                    text: `⚠️ Ops, tivemos um problema!\n\nErro: ${errorMessage}\n\nTente novamente ou verifique sua conexão.`
                });
            });
            chatSessionRef.current = null;
        } finally {
            setIsTyping(false);
        }
    };

    if (!apiKey || showConfig) {
        return (
            <div className="min-h-screen bg-[#101622] flex flex-col relative overflow-hidden">
                {/* Header Simplificado */}
                <div className="pt-8 px-6 pb-4 bg-[#101622] border-b border-white/5 flex items-center gap-4">
                    <button onClick={onBack} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white">
                        <span className="material-symbols-rounded">arrow_back</span>
                    </button>
                    <h1 className="text-lg font-bold text-white">Configuração da IA</h1>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 relative">
                        <span className="material-symbols-rounded text-4xl text-[#FF00BC]">key</span>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-[#101622] flex items-center justify-center">!</div>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold text-white mb-2">Conectar Lorena IA</h2>
                        <p className="text-sm text-gray-400">Para conversar com a mentora, precisamos de uma chave de acesso do Google (API Key).</p>
                    </div>

                    <div className="w-full max-w-sm space-y-3">
                        <input
                            type="text"
                            value={configInput}
                            onChange={(e) => setConfigInput(e.target.value)}
                            placeholder="Cole sua chave aqui (AIza...)"
                            className="w-full h-12 bg-[#1A202C] rounded-xl border border-white/10 px-4 text-white text-sm focus:outline-none focus:border-[#0081FF]"
                        />
                        <button
                            onClick={handleSaveKey}
                            className="w-full h-12 bg-[#0081FF] hover:bg-[#006bd1] text-white font-bold rounded-xl shadow-lg transition-all"
                        >
                            Salvar e Conectar
                        </button>
                    </div>

                    <div className="p-4 bg-white/5 rounded-xl border border-white/5 text-left w-full max-w-sm">
                        <p className="text-xs text-gray-300 font-bold mb-2">Como conseguir uma chave?</p>
                        <ol className="list-decimal list-inside text-xs text-gray-400 space-y-1">
                            <li>Acesse o <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-[#0081FF] underline">Google AI Studio</a>.</li>
                            <li>Clique em "Create API Key".</li>
                            <li>Selecione "Create in new project".</li>
                            <li>Copie o código e cole acima.</li>
                        </ol>
                    </div>
                </div>
            </div>
        );
    }

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
                <button onClick={() => { localStorage.removeItem('gemini_api_key'); setApiKey(null); }} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white" title="Redefinir Chave">
                    <span className="material-symbols-rounded text-sm">settings</span>
                </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar" ref={scrollRef}>
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <div
                            className={`max-w-[90%] rounded-2xl p-4 text-sm leading-relaxed relative ${msg.role === 'user'
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
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${inputText.trim()
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
