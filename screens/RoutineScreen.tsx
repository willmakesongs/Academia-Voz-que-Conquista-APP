
import React, { useState, useEffect } from 'react';
import { Screen, Task } from '../types';

interface Props {
  onNavigate: (screen: Screen) => void;
}

// Jan 2, 2026 is Friday.
const WEEK_DAYS = [
  { day: 'Seg', date: '29', active: false }, // Dec
  { day: 'Ter', date: '30', active: false }, // Dec
  { day: 'Qua', date: '31', active: false }, // Dec
  { day: 'Qui', date: '01', active: false }, // Jan
  { day: 'Sex', date: '02', active: true }, // Jan (Today)
  { day: 'Sáb', date: '03', active: false }, // Jan
  { day: 'Dom', date: '04', active: false }, // Jan
];

const INITIAL_TASKS: Task[] = [
  {
    id: '1',
    time: '08:00',
    title: 'Aquecimento Matinal',
    duration: '10 min',
    status: 'completed',
    category: 'Aquecimento',
    date: '02'
  },
  {
    id: '2',
    time: '14:30',
    title: 'Técnica de Respiração',
    duration: '15 min',
    status: 'pending',
    category: 'Técnica',
    date: '02'
  },
  {
    id: '3',
    time: '19:00',
    title: 'Relaxamento Vocal',
    duration: '5 min',
    status: 'locked',
    category: 'Saúde Vocal',
    date: '02'
  }
];

const CATEGORIES = ['Aquecimento', 'Técnica', 'Repertório', 'Saúde Vocal'];

export const RoutineScreen: React.FC<Props> = ({ onNavigate }) => {
  const [selectedDate, setSelectedDate] = useState('02');
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  
  // UI States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | number | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  // Form States
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Técnica');
  const [newTaskTime, setNewTaskTime] = useState('10:00');
  const [newTaskDuration, setNewTaskDuration] = useState('15');
  const [newTaskDate, setNewTaskDate] = useState('02'); 

  // Fecha o menu se clicar fora (simples)
  useEffect(() => {
    const closeMenu = () => setOpenMenuId(null);
    if (openMenuId) {
        document.addEventListener('click', closeMenu);
    }
    return () => document.removeEventListener('click', closeMenu);
  }, [openMenuId]);

  // Filter tasks for the selected date
  const filteredTasks = tasks
    .filter(t => t.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  const completedCount = filteredTasks.filter(t => t.status === 'completed').length;
  const progressPercentage = filteredTasks.length > 0 ? (completedCount / filteredTasks.length) * 100 : 0;

  const resetForm = () => {
    setNewTaskTitle('');
    setNewTaskCategory('Técnica');
    setNewTaskTime('10:00');
    setNewTaskDuration('15');
    setNewTaskDate(selectedDate);
    setEditingTask(null);
  };

  const handleOpenAddModal = () => {
      resetForm();
      setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
      setEditingTask(task);
      setNewTaskTitle(task.title);
      setNewTaskCategory(task.category);
      setNewTaskTime(task.time);
      setNewTaskDuration(task.duration.replace(' min', ''));
      setNewTaskDate(task.date);
      setIsAddModalOpen(true);
      setOpenMenuId(null);
  };

  const handleSaveTask = () => {
    if (!newTaskTitle.trim()) return;

    if (editingTask) {
        // EDITAR: Usa atualização funcional para garantir estado consistente
        setTasks(prevTasks => prevTasks.map(t => {
            if (t.id === editingTask.id) {
                return {
                    ...t,
                    title: newTaskTitle,
                    category: newTaskCategory,
                    time: newTaskTime,
                    duration: `${newTaskDuration} min`,
                    date: newTaskDate
                };
            }
            return t;
        }));
    } else {
        // ADICIONAR NOVO
        const newTask: Task = {
            id: Date.now().toString(), // Garante ID único como string
            title: newTaskTitle,
            category: newTaskCategory,
            time: newTaskTime,
            duration: `${newTaskDuration} min`,
            date: newTaskDate,
            status: 'pending'
        };
        setTasks(prevTasks => [...prevTasks, newTask]);
    }
    
    resetForm();
    setIsAddModalOpen(false);
  };

  const handleDeleteTask = (taskId: string | number) => {
      // Executa a confirmação de forma síncrona
      if (window.confirm("Tem certeza que deseja excluir esta tarefa?")) {
          setTasks(prevTasks => prevTasks.filter(t => String(t.id) !== String(taskId)));
      }
      setOpenMenuId(null);
  };

  const toggleTaskStatus = (taskId: string | number) => {
    setTasks(prevTasks => prevTasks.map(t => {
      if (t.id === taskId) {
        if (t.status === 'locked') return t; // Don't toggle locked
        return { ...t, status: t.status === 'pending' ? 'completed' : 'pending' };
      }
      return t;
    }));
  };

  const toggleMenu = (e: React.MouseEvent, taskId: string | number) => {
      e.stopPropagation();
      setOpenMenuId(openMenuId === taskId ? null : taskId);
  };

  return (
    <div className="min-h-screen bg-[#101622] pb-24 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[80%] h-[40%] bg-[#0081FF] blur-[120px] opacity-10 pointer-events-none"></div>

      {/* Header */}
      <header className="pt-8 pb-4 px-6 relative z-10">
        <h1 className="text-2xl font-bold text-white mb-1">Minha Rotina</h1>
        <p className="text-sm text-gray-400">Organize seus estudos diários</p>
      </header>

      {/* Calendar Strip */}
      <div className="pl-6 mb-8 overflow-x-auto hide-scrollbar">
        <div className="flex gap-3 min-w-max pr-6">
          {WEEK_DAYS.map((item) => (
            <button
              key={item.date}
              onClick={() => setSelectedDate(item.date)}
              className={`flex flex-col items-center justify-center w-14 h-20 rounded-2xl border transition-all ${
                selectedDate === item.date
                  ? 'bg-[#FF00BC] border-[#FF00BC] text-white shadow-[0_4px_20px_rgba(255,0,188,0.4)] transform scale-105'
                  : 'bg-[#1A202C] border-white/5 text-gray-400 hover:bg-white/5'
              }`}
            >
              <span className="text-xs font-medium mb-1">{item.day}</span>
              <span className="text-lg font-bold">{item.date}</span>
              {/* Dot indicator if tasks exist for this day */}
              {tasks.some(t => t.date === item.date) && selectedDate !== item.date && (
                <span className="w-1 h-1 rounded-full bg-[#0081FF] mt-1"></span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-8">
        {/* Progress Card */}
        <div className="bg-gradient-to-br from-[#1A202C] to-[#161b26] p-5 rounded-2xl border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#6F4CE7] blur-[50px] opacity-20"></div>
          
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h3 className="text-lg font-bold text-white">Metas de Hoje</h3>
              <p className="text-xs text-gray-400">
                {filteredTasks.length === 0 
                  ? "Nenhuma tarefa agendada" 
                  : `Você completou ${completedCount} de ${filteredTasks.length} tarefas`
                }
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#6F4CE7]/20 flex items-center justify-center text-[#6F4CE7]">
              <span className="material-symbols-rounded">emoji_events</span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="flex justify-between text-xs font-medium mb-2">
              <span className="text-white">Progresso</span>
              <span className="text-[#6F4CE7]">{Math.round(progressPercentage)}%</span>
            </div>
            <div className="h-2 w-full bg-[#101622] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#0081FF] to-[#6F4CE7] rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="pb-20">
          <h3 className="text-lg font-bold text-white mb-4">Cronograma</h3>
          
          {filteredTasks.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-10 opacity-50">
                <span className="material-symbols-rounded text-4xl mb-2">calendar_today</span>
                <p className="text-sm">Dia livre de estudos.</p>
             </div>
          ) : (
            <div className="space-y-0 relative">
              {/* Vertical Line */}
              <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#6F4CE7] via-[#FF00BC] to-transparent opacity-20"></div>

              {filteredTasks.map((task, index) => {
                const isLast = index === filteredTasks.length - 1;
                return (
                  <div key={task.id} className={`relative pl-12 ${!isLast ? 'mb-6' : ''}`}>
                    {/* Status Indicator Dot (Clickable to toggle status) */}
                    <button 
                      onClick={() => toggleTaskStatus(task.id)}
                      className={`absolute left-0 top-1 w-10 h-10 rounded-full border-4 border-[#101622] flex items-center justify-center z-10 transition-colors ${
                        task.status === 'completed' ? 'bg-[#0081FF] text-white' :
                        task.status === 'pending' ? 'bg-[#FF00BC] text-white hover:bg-[#FF00BC]/80' :
                        'bg-[#1A202C] text-gray-600 border-white/5'
                      }`}
                    >
                      <span className="material-symbols-rounded text-lg">
                        {task.status === 'completed' ? 'check' : 
                        task.status === 'pending' ? 'play_arrow' : 'lock'}
                      </span>
                    </button>

                    {/* Card */}
                    <div 
                      onClick={() => task.status !== 'locked' && onNavigate(Screen.PLAYER)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer group relative ${
                        task.status === 'pending' 
                          ? 'bg-[#1A202C] border-[#FF00BC]/50 shadow-[0_0_20px_rgba(255,0,188,0.1)]' 
                          : 'bg-[#1A202C]/50 border-white/5 opacity-80'
                      }`}
                    >
                      {/* MORE OPTIONS BUTTON CONTAINER */}
                      <div 
                        className="absolute top-2 right-2 z-20"
                        onClick={(e) => e.stopPropagation()} // Garante que cliques no menu não abram o player
                      >
                          <button 
                             onClick={(e) => toggleMenu(e, task.id)}
                             className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                          >
                              <span className="material-symbols-rounded text-xl">more_vert</span>
                          </button>
                          
                          {/* DROPDOWN MENU */}
                          {openMenuId === task.id && (
                              <div className="absolute right-0 top-8 w-32 bg-[#151A23] border border-white/10 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-30">
                                  <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleOpenEditModal(task); 
                                    }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-white hover:bg-white/5 flex items-center gap-2"
                                  >
                                      <span className="material-symbols-rounded text-sm">edit</span>
                                      Editar
                                  </button>
                                  <button 
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleDeleteTask(task.id); 
                                    }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                                  >
                                      <span className="material-symbols-rounded text-sm">delete</span>
                                      Excluir
                                  </button>
                              </div>
                          )}
                      </div>

                      <div className="flex justify-between items-start mb-2 pr-6">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          task.status === 'pending' ? 'bg-[#FF00BC]/10 text-[#FF00BC]' : 'bg-white/5 text-gray-400'
                        }`}>
                          {task.time}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">{task.category}</span>
                      </div>
                      
                      <h4 className="font-bold text-white mb-1 group-hover:text-[#0081FF] transition-colors pr-4">{task.title}</h4>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className="material-symbols-rounded text-sm">schedule</span>
                        {task.duration}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* FAB for Add */}
      <button 
        onClick={handleOpenAddModal}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[#6F4CE7] text-white shadow-lg shadow-purple-900/40 flex items-center justify-center hover:scale-110 transition-transform z-20"
      >
        <span className="material-symbols-rounded text-2xl">add</span>
      </button>

      {/* MODAL: Add/Edit Task */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
           <div className="w-full max-w-sm bg-[#1A202C] rounded-2xl border border-white/10 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#151A23] rounded-t-2xl">
                 <h3 className="font-bold text-white">{editingTask ? 'Editar Tarefa' : 'Programar Estudo'}</h3>
                 <button 
                    onClick={() => setIsAddModalOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10"
                 >
                    <span className="material-symbols-rounded text-lg">close</span>
                 </button>
              </div>

              <div className="p-6 space-y-4">
                 <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold uppercase ml-1">O que vamos treinar?</label>
                    <input 
                       type="text" 
                       value={newTaskTitle}
                       onChange={(e) => setNewTaskTitle(e.target.value)}
                       placeholder="Ex: Escalas de Agilidade"
                       className="w-full h-12 bg-[#101622] rounded-xl border border-white/10 px-4 text-white text-sm focus:outline-none focus:border-[#6F4CE7]"
                       autoFocus
                    />
                 </div>

                 <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-bold uppercase ml-1">Categoria</label>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setNewTaskCategory(cat)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                    newTaskCategory === cat 
                                    ? 'bg-[#6F4CE7] border-[#6F4CE7] text-white' 
                                    : 'bg-[#101622] border-white/10 text-gray-400 hover:text-white'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                     <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">Dia</label>
                        <select 
                            value={newTaskDate}
                            onChange={(e) => setNewTaskDate(e.target.value)}
                            className="w-full h-10 bg-[#101622] rounded-xl border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-[#6F4CE7]"
                        >
                            {WEEK_DAYS.map(d => (
                                <option key={d.date} value={d.date}>{d.day} - dia {d.date}</option>
                            ))}
                        </select>
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">Horário</label>
                        <input 
                           type="time" 
                           value={newTaskTime}
                           onChange={(e) => setNewTaskTime(e.target.value)}
                           className="w-full h-10 bg-[#101622] rounded-xl border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-[#6F4CE7]"
                        />
                     </div>
                 </div>

                 <div className="space-y-1">
                     <label className="text-xs text-gray-400 font-bold uppercase ml-1">Duração (minutos)</label>
                     <div className="flex items-center gap-4 bg-[#101622] rounded-xl border border-white/10 px-4 h-12">
                        <input 
                           type="range" 
                           min="5" max="60" step="5"
                           value={newTaskDuration}
                           onChange={(e) => setNewTaskDuration(e.target.value)}
                           className="flex-1 accent-[#6F4CE7]"
                        />
                        <span className="text-white text-sm font-bold w-12 text-right">{newTaskDuration}m</span>
                     </div>
                 </div>

                 <button 
                    onClick={handleSaveTask}
                    disabled={!newTaskTitle.trim()}
                    className="w-full h-12 bg-[#6F4CE7] hover:bg-[#5b3dc4] text-white font-bold rounded-xl shadow-lg shadow-purple-900/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                 >
                    <span className="material-symbols-rounded">{editingTask ? 'save' : 'add_task'}</span>
                    {editingTask ? 'Salvar Alterações' : 'Adicionar à Rotina'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
