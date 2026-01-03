
import React, { useState, useEffect } from 'react';
import { Appointment, StudentSummary } from '../types';
import { MOCK_STUDENTS } from '../constants';
import { supabase } from '../lib/supabaseClient';

interface Props {
  onBack: () => void;
}

// Janeiro 2026: dia 1 é Quinta-feira.
const CALENDAR_DAYS = Array.from({ length: 35 }, (_, i) => {
  const day = i - 3; 
  return day > 0 && day <= 31 ? day : null;
});

// Mapeamento de Dias da Semana para Datas em Janeiro 2026
const DAY_MAP: Record<string, number[]> = {
  'Dom': [4, 11, 18, 25],
  'Seg': [5, 12, 19, 26],
  'Ter': [6, 13, 20, 27],
  'Qua': [7, 14, 21, 28],
  'Qui': [1, 8, 15, 22, 29],
  'Sex': [2, 9, 16, 23, 30],
  'Sáb': [3, 10, 17, 24, 31]
};

// Eventos estáticos (Exemplos específicos)
const STATIC_EVENTS: (Appointment & { date: number, hasAlarm: boolean, notes: string })[] = [
  {
    id: 'e1',
    studentId: 's1',
    studentName: 'Miguel Rocha',
    avatarUrl: 'https://ui-avatars.com/api/?name=Miguel+Rocha&background=random',
    time: '09:00',
    type: 'Repertório',
    status: 'finished',
    date: 30, // Anterior (Dezembro fake ou final do mês)
    hasAlarm: false,
    notes: 'Trabalhamos respiração diafragmática.'
  }
];

export const CalendarScreen: React.FC<Props> = ({ onBack }) => {
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate() > 2 ? new Date().getDate() : 2); // Default to roughly today or 2nd
  const [currentMonth, setCurrentMonth] = useState('Janeiro 2026');
  const [events, setEvents] = useState<any[]>(STATIC_EVENTS);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    // 1. Carregar alunos do LocalStorage (Novos cadastros)
    const localData = localStorage.getItem('vocalizes_local_students');
    const localStudents: StudentSummary[] = localData ? JSON.parse(localData) : [];

    // 2. Carregar alunos MOCK (simulando banco)
    // Nota: Em um app real, buscaríamos do Supabase aqui também.
    // Vamos mesclar garantindo que não duplicamos IDs se o mock já tiver sido salvo localmente
    const allStudentsMap = new Map<string, StudentSummary>();
    
    [...MOCK_STUDENTS, ...localStudents].forEach(s => {
        // Garante campos mínimos para exibição
        const student = {
            ...s,
            scheduleDay: s.scheduleDay || 'Seg',
            scheduleTime: s.scheduleTime || '10:00'
        };
        allStudentsMap.set(s.id, student);
    });

    const combinedStudents = Array.from(allStudentsMap.values());

    // 3. Gerar eventos recorrentes baseados no dia da semana do aluno
    const generatedEvents: any[] = [];

    combinedStudents.forEach(student => {
        if (student.scheduleDay && DAY_MAP[student.scheduleDay]) {
            const dates = DAY_MAP[student.scheduleDay];
            dates.forEach(date => {
                generatedEvents.push({
                    id: `gen-${student.id}-${date}`,
                    studentId: student.id,
                    studentName: student.name,
                    avatarUrl: student.avatarUrl,
                    time: student.scheduleTime,
                    type: 'Aula Regular',
                    status: date < 2 ? 'finished' : 'pending', // Lógica simples de status por data
                    date: date,
                    hasAlarm: true,
                    notes: student.notes || 'Aula semanal recorrente'
                });
            });
        }
    });

    setEvents([...STATIC_EVENTS, ...generatedEvents]);
  };

  const selectedEvents = events
    .filter(e => e.date === selectedDay)
    .sort((a, b) => a.time.localeCompare(b.time));

  const toggleAlarm = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, hasAlarm: !e.hasAlarm } : e));
  };

  return (
    <div className="min-h-screen bg-[#101622] pb-6 relative overflow-hidden flex flex-col">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#1A202C] to-[#101622] z-0"></div>
      
      {/* Header */}
      <header className="pt-8 pb-4 px-6 relative z-10 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-rounded">arrow_back</span>
        </button>
        <h1 className="text-lg font-bold text-white">Agenda de Aulas</h1>
        <div className="flex gap-2">
           <button 
             onClick={onBack}
             className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors"
             title="Ir para Início"
           >
             <span className="material-symbols-rounded">home</span>
           </button>
           <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
             <span className="material-symbols-rounded">more_vert</span>
           </button>
        </div>
      </header>

      {/* Month Navigation */}
      <div className="px-6 mb-6 relative z-10 flex items-center justify-between">
        <button className="text-gray-400 hover:text-white">
          <span className="material-symbols-rounded">chevron_left</span>
        </button>
        <span className="text-xl font-bold text-white tracking-wide">{currentMonth}</span>
        <button className="text-gray-400 hover:text-white">
          <span className="material-symbols-rounded">chevron_right</span>
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="px-4 mb-8 relative z-10">
        <div className="bg-[#1A202C]/80 backdrop-blur-md rounded-2xl p-4 border border-white/5 shadow-xl">
          {/* Week Days Header */}
          <div className="grid grid-cols-7 mb-4">
            {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs font-medium text-gray-500">
                {day}
              </div>
            ))}
          </div>
          
          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-4">
            {CALENDAR_DAYS.map((day, index) => {
              const hasEvent = events.some(e => e.date === day);
              const isSelected = day === selectedDay;
              
              if (!day) return <div key={index}></div>;

              return (
                <button
                  key={index}
                  onClick={() => setSelectedDay(day)}
                  className="flex flex-col items-center relative"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    isSelected 
                      ? 'bg-[#FF00BC] text-white shadow-[0_0_15px_rgba(255,0,188,0.5)]' 
                      : 'text-gray-300 hover:bg-white/5'
                  }`}>
                    {day}
                  </div>
                  {hasEvent && !isSelected && (
                    <div className="w-1 h-1 rounded-full bg-[#0081FF] mt-1"></div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="px-6 flex-1 relative z-10 pb-20 overflow-y-auto hide-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {selectedDay} de Janeiro
          </h3>
          <span className="text-xs text-gray-400 bg-white/5 px-3 py-1 rounded-full">
            {selectedEvents.length} Agendamentos
          </span>
        </div>

        <div className="space-y-4">
          {selectedEvents.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <span className="material-symbols-rounded text-4xl mb-2 opacity-50">event_busy</span>
              <p className="text-sm">Nenhuma aula agendada para este dia.</p>
            </div>
          ) : (
            selectedEvents.map((event) => (
              <div 
                key={event.id} 
                className={`p-4 rounded-xl border relative transition-all ${
                  event.status === 'finished' 
                    ? 'bg-[#1A202C]/50 border-white/5 opacity-70' 
                    : 'bg-[#1A202C] border-white/10'
                }`}
              >
                {/* Time Strip */}
                <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-r-full ${
                   event.status === 'confirmed' ? 'bg-[#0081FF]' :
                   event.status === 'finished' ? 'bg-gray-600' :
                   'bg-[#FF00BC]'
                }`}></div>

                <div className="pl-3">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                       <span className="text-lg font-bold text-white font-mono">{event.time}</span>
                       <span className={`text-[10px] px-2 py-0.5 rounded border ${
                         event.status === 'finished' ? 'border-gray-600 text-gray-400' :
                         event.status === 'confirmed' ? 'border-[#0081FF] text-[#0081FF]' :
                         'border-[#FF00BC] text-[#FF00BC]'
                       }`}>
                         {event.status === 'finished' ? 'Concluída' : 
                          event.status === 'confirmed' ? 'Confirmada' : 'Pendente'}
                       </span>
                    </div>
                    
                    {/* Alarm Toggle */}
                    {event.status !== 'finished' && (
                      <button 
                        onClick={() => toggleAlarm(event.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          event.hasAlarm ? 'bg-[#6F4CE7]/20 text-[#6F4CE7]' : 'text-gray-600 hover:bg-white/5'
                        }`}
                      >
                        <span className="material-symbols-rounded text-lg">
                          {event.hasAlarm ? 'notifications_active' : 'notifications_off'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <img src={event.avatarUrl} alt={event.studentName} className="w-10 h-10 rounded-full border border-white/10" />
                    <div>
                      <p className="text-sm font-semibold text-white">{event.studentName}</p>
                      <p className="text-xs text-gray-400">{event.type}</p>
                    </div>
                  </div>

                  {event.notes && (
                    <div className="bg-[#101622] rounded-lg p-3 text-xs text-gray-400 flex gap-2">
                       <span className="material-symbols-rounded text-sm pt-0.5">sticky_note_2</span>
                       <p>{event.notes}</p>
                    </div>
                  )}
                  
                  {event.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button className="flex-1 py-2 bg-[#0081FF] rounded-lg text-xs font-bold text-white">Aceitar</button>
                      <button className="flex-1 py-2 bg-white/5 rounded-lg text-xs font-bold text-gray-400">Reagendar</button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Floating Add Button */}
      <button className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#FF00BC] text-white shadow-lg shadow-pink-900/40 flex items-center justify-center hover:scale-110 transition-transform z-20">
        <span className="material-symbols-rounded text-2xl">add</span>
      </button>

    </div>
  );
};
