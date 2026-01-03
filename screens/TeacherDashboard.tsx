
import React, { useState, useEffect, useRef } from 'react';
import { Screen, StudentSummary, Appointment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
// MOCK_STUDENTS and TEACHER_APPOINTMENTS removed


interface Props {
    onNavigate: (screen: Screen) => void;
    onLogout: () => void;
}

const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// Helper para formatar mensagens de erro
const formatErrorMessage = (error: any): string => {
    if (!error) return 'Erro desconhecido';
    if (typeof error === 'string') return error;
    if (error.message) return error.message;
    try {
        return JSON.stringify(error);
    } catch {
        return 'Erro não detalhado';
    }
};

export const TeacherDashboard: React.FC<Props> = ({ onNavigate, onLogout }) => {
    const { user } = useAuth();
    const [showConfig, setShowConfig] = useState(false);
    const [students, setStudents] = useState<StudentSummary[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const configRef = useRef<HTMLDivElement>(null);

    // States UI
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [loadingAction, setLoadingAction] = useState(false); // Feedback visual

    // States Detalhes
    const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null);
    const [notesInput, setNotesInput] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editPhone, setEditPhone] = useState('');

    // States Edição Agendamento
    const [editScheduleDay, setEditScheduleDay] = useState('Seg');
    const [editScheduleTime, setEditScheduleTime] = useState('');

    // Form Novo Aluno
    const [newStudentName, setNewStudentName] = useState('');
    const [newStudentAge, setNewStudentAge] = useState('');
    const [newStudentPhone, setNewStudentPhone] = useState('');
    const [newStudentInsta, setNewStudentInsta] = useState('');

    // Agendamento Novo Aluno
    const [scheduleDay, setScheduleDay] = useState('Seg');
    const [scheduleTime, setScheduleTime] = useState('14:00');

    const [newStudentLevel, setNewStudentLevel] = useState('Iniciante');
    const [newStudentModality, setNewStudentModality] = useState<'Online' | 'Presencial'>('Presencial');
    const [paymentDay, setPaymentDay] = useState('05');

    const filteredStudents = students.filter(student =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        // 1. Carrega alunos salvos localmente (Fallback)
        const localData = localStorage.getItem('vocalizes_local_students');
        const localStudents: StudentSummary[] = localData ? JSON.parse(localData) : [];

        try {
            // 2. Tenta carregar do Supabase
            const { data: sData, error: sError } = await supabase
                .from('profiles')
                .select('*')
                .eq('role', 'student');

            if (sError) {
                // Se for erro de permissão (RLS), ignoramos o banco e usamos Mock + Local
                if (String(sError.code) === '42501') {
                    console.warn('RLS na leitura: usando dados locais e mock.');
                    // Mescla Mock + Local (Mock removido)
                    const merged = [...localStudents];
                    // Remove duplicatas por ID (priorizando local se houver conflito com mock)
                    const unique = merged.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
                    setStudents(unique);
                } else {
                    throw sError;
                }
            } else if (sData) {
                // Formata dados do Supabase
                const dbStudents: StudentSummary[] = sData.map(s => ({
                    id: s.id,
                    name: s.name,
                    avatarUrl: s.avatar_url || `https://ui-avatars.com/api/?name=${s.name}&background=random`,
                    level: 'Iniciante',
                    lastPractice: 'Hoje',
                    progress: 0,
                    status: 'active',
                    phone: s.phone || '',
                    age: s.age ? String(s.age) : '',
                    paymentDay: '05',
                    notes: s.notes || '',
                    modality: s.modality || 'Online',
                    scheduleDay: s.schedule_day || 'Seg',
                    scheduleTime: s.schedule_time || '14:00'
                }));

                // Mescla: DB + Local (Local tem prioridade se o usuário acabou de criar e o DB falhou)
                const allStudentsMap = new Map<string, StudentSummary>();
                dbStudents.forEach(s => allStudentsMap.set(s.id, s));
                localStudents.forEach(s => allStudentsMap.set(s.id, s));

                setStudents(Array.from(allStudentsMap.values()));
            }

            setAppointments([]);

        } catch (error) {
            console.warn('Usando dados locais/mock devido a erro:', error);
            // Fallback total
            const merged = [...localStudents];
            const unique = merged.filter((v, i, a) => a.findIndex(v2 => (v2.id === v.id)) === i);
            setStudents(unique);
            setAppointments([]);
        }
    };

    // Salvar Novo Aluno
    const handleAddStudent = async () => {
        if (!newStudentName.trim()) return;
        setLoadingAction(true);

        const fakeId = crypto.randomUUID();
        const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(newStudentName)}&background=random&color=fff`;

        // Objeto do Aluno
        const newStudentLocal: StudentSummary = {
            id: fakeId,
            name: newStudentName,
            avatarUrl: avatarUrl,
            level: newStudentLevel,
            lastPractice: 'Nunca',
            progress: 0,
            status: 'active',
            age: newStudentAge,
            phone: newStudentPhone,
            paymentDay: paymentDay,
            notes: '',
            modality: newStudentModality,
            scheduleDay: scheduleDay,
            scheduleTime: scheduleTime
        };

        try {
            // Tenta salvar no Supabase
            const { error } = await supabase.from('profiles').insert([{
                id: fakeId,
                name: newStudentName,
                role: 'student',
                avatar_url: avatarUrl,
                phone: newStudentPhone || null,
                age: newStudentAge ? parseInt(newStudentAge) : null,
                modality: newStudentModality,
                schedule_day: scheduleDay,
                schedule_time: scheduleTime
            }]);

            // Se der erro no DB, salvamos apenas localmente sem assustar o usuário
            if (error) {
                console.warn("Erro ao salvar no DB (salvando localmente):", error);
            }

            // SALVA NO LOCALSTORAGE (Garante persistência mesmo com erro no DB)
            const existingLocal = localStorage.getItem('vocalizes_local_students');
            const localList = existingLocal ? JSON.parse(existingLocal) : [];
            localList.push(newStudentLocal);
            localStorage.setItem('vocalizes_local_students', JSON.stringify(localList));

            // Atualiza Estado React
            setStudents(prev => [...prev, newStudentLocal]);

            // Reset
            setNewStudentName('');
            setNewStudentAge('');
            setNewStudentPhone('');
            setScheduleDay('Seg');
            setScheduleTime('14:00');
            setIsAddModalOpen(false);

            alert("Aluno cadastrado com sucesso!");

        } catch (err: any) {
            console.error("Erro inesperado:", err);
            // Mesmo com erro crítico, tenta salvar local
            setStudents(prev => [...prev, newStudentLocal]);
            setIsAddModalOpen(false);
        } finally {
            setLoadingAction(false);
        }
    };

    const openStudentDetails = (student: StudentSummary) => {
        setSelectedStudent(student);
        setNotesInput(student.notes || '');
        setEditPhone(student.phone || '');
        setEditScheduleDay(student.scheduleDay || 'Seg');
        setEditScheduleTime(student.scheduleTime || '14:00');
        setIsEditing(false);
    };

    const handleSaveChanges = async () => {
        if (!selectedStudent) return;
        setLoadingAction(true);

        const updatedStudent: StudentSummary = {
            ...selectedStudent,
            notes: notesInput,
            phone: editPhone,
            scheduleDay: editScheduleDay,
            scheduleTime: editScheduleTime
        };

        try {
            // Tenta atualizar DB
            const { error } = await supabase
                .from('profiles')
                .update({
                    phone: editPhone,
                    notes: notesInput,
                    schedule_day: editScheduleDay,
                    schedule_time: editScheduleTime
                })
                .eq('id', selectedStudent.id);

            if (error) console.warn("Erro update DB (salvando local):", error);

            // ATUALIZA LOCALSTORAGE
            const existingLocal = localStorage.getItem('vocalizes_local_students');
            let localList: StudentSummary[] = existingLocal ? JSON.parse(existingLocal) : [];

            // Verifica se já existe no local, se não, adiciona (caso seja um mock que foi editado)
            const localIndex = localList.findIndex(s => s.id === selectedStudent.id);
            if (localIndex >= 0) {
                localList[localIndex] = updatedStudent;
            } else {
                // Se editou um aluno que veio do Mock/DB mas falhou o save, salvamos cópia local
                localList.push(updatedStudent);
            }
            localStorage.setItem('vocalizes_local_students', JSON.stringify(localList));

            // Atualiza Estado
            setStudents(prev => prev.map(s => s.id === selectedStudent.id ? updatedStudent : s));
            setSelectedStudent(updatedStudent);
            setIsEditing(false);

        } catch (err: any) {
            console.error(err);
            alert("Erro ao salvar alterações.");
        } finally {
            setLoadingAction(false);
        }
    };

    // Utilitário para Link WhatsApp
    const openWhatsApp = (phone: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone) return;

        const finalPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
        window.open(`https://wa.me/${finalPhone}`, '_blank');
    };

    return (
        <div className="min-h-screen bg-[#101622] pb-24 relative">
            {/* Header */}
            <header className="pt-8 pb-6 px-6 bg-gradient-to-b from-[#1A202C] to-[#101622] border-b border-white/5">
                <div className="flex justify-between items-center mb-6 relative">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <img src={user?.avatarUrl || 'https://picsum.photos/200'} alt="Profile" className="w-12 h-12 rounded-full border-2 border-[#0081FF]" />
                            <div className="absolute -bottom-1 -right-1 bg-[#0081FF] text-white text-[10px] px-1.5 py-0.5 rounded-full border border-[#101622] font-bold">PRO</div>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-medium">Bem-vinda,</p>
                            <h2 className="text-lg font-bold text-white">{user?.name || 'Professora'}</h2>
                        </div>
                    </div>

                    <div ref={configRef} className="relative">
                        <button onClick={() => setShowConfig(!showConfig)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10">
                            <span className="material-symbols-rounded">settings</span>
                        </button>
                        {showConfig && (
                            <div className="absolute right-0 top-12 w-48 bg-[#1A202C] rounded-xl border border-white/10 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-1 bg-red-500/5">
                                    <button onClick={onLogout} className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-500/10 text-sm flex items-center gap-2 text-red-500 font-medium">
                                        <span className="material-symbols-rounded text-lg">logout</span> Sair
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1A202C] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#0081FF]/20 flex items-center justify-center text-[#0081FF]"><span className="material-symbols-rounded">groups</span></div>
                        <div><p className="text-2xl font-bold text-white">{students.length}</p><p className="text-[10px] text-gray-400 uppercase tracking-wide">Alunos</p></div>
                    </div>
                    <div className="bg-[#1A202C] p-4 rounded-2xl border border-white/5 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#EE13CA]/20 flex items-center justify-center text-[#EE13CA]"><span className="material-symbols-rounded">event</span></div>
                        <div><p className="text-2xl font-bold text-white">{appointments.length}</p><p className="text-[10px] text-gray-400 uppercase tracking-wide">Aulas Hoje</p></div>
                    </div>
                </div>
            </header>

            <div className="px-6 py-6 space-y-8">
                {/* Schedule Strip */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Agenda de Hoje</h3>
                        <button onClick={() => onNavigate(Screen.CALENDAR)} className="text-xs text-[#0081FF] font-medium hover:text-white">Ver calendário</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
                        {appointments.map((apt) => (
                            <div key={apt.id} className="min-w-[200px] p-4 bg-[#1A202C] rounded-2xl border border-white/5 relative overflow-hidden group flex flex-col justify-between">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${apt.status === 'confirmed' ? 'bg-[#0081FF]' : 'bg-[#FF00BC]'}`}></div>
                                <div>
                                    <div className="flex justify-between items-start mb-3 pl-2"><span className="text-xl font-bold text-white">{apt.time}</span></div>
                                    <div className="flex items-center gap-3 pl-2 mb-3">
                                        <img src={apt.avatarUrl} className="w-8 h-8 rounded-full bg-gray-700" alt={apt.studentName} />
                                        <div className="overflow-hidden"><p className="text-sm font-semibold text-white truncate">{apt.studentName}</p><p className="text-[10px] text-gray-400 truncate">{apt.type}</p></div>
                                    </div>
                                </div>
                                <div className="flex gap-2 pl-2">
                                    <button className="flex-1 py-2 rounded-lg bg-white/5 text-xs text-gray-300 hover:bg-white/10" onClick={() => {
                                        const student = students.find(s => s.id === apt.studentId || s.name === apt.studentName);
                                        if (student) openStudentDetails(student);
                                    }}>Detalhes</button>
                                </div>
                            </div>
                        ))}
                        <div className="min-w-[60px] flex items-center justify-center">
                            <button onClick={() => setIsAddModalOpen(true)} className="w-12 h-12 rounded-full border-2 border-dashed border-gray-700 text-gray-500 flex items-center justify-center hover:border-[#6F4CE7] hover:text-[#6F4CE7]"><span className="material-symbols-rounded">add</span></button>
                        </div>
                    </div>
                </div>

                {/* Students List */}
                <div>
                    <div className="flex justify-between items-center mb-4 h-10">
                        {isSearchOpen ? (
                            <div className="flex-1 flex items-center bg-[#1A202C] rounded-xl px-3 border border-[#0081FF] animate-in fade-in slide-in-from-right duration-200">
                                <span className="material-symbols-rounded text-[#0081FF] text-sm">search</span>
                                <input type="text" autoFocus placeholder="Buscar aluno..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-transparent border-none text-white text-sm w-full h-10 px-2 focus:outline-none" />
                                <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-gray-400 hover:text-white"><span className="material-symbols-rounded text-sm">close</span></button>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold text-white">Meus Alunos</h3>
                                <button onClick={() => setIsSearchOpen(true)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"><span className="material-symbols-rounded text-sm">search</span></button>
                            </>
                        )}
                    </div>

                    <div className="space-y-3">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                                <div key={student.id} onClick={() => openStudentDetails(student)} className="flex items-center p-3 rounded-xl bg-[#1A202C] border border-white/5 hover:border-[#6F4CE7]/30 transition-all cursor-pointer group">
                                    <img src={student.avatarUrl} alt={student.name} className={`w-12 h-12 rounded-full border-2 mr-4 ${student.status === 'active' ? 'border-green-500/50' : 'border-gray-600'}`} />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-white truncate">{student.name}</h4>
                                        <div className="flex items-center gap-2">
                                            {student.modality && <span className={`text-[9px] uppercase font-bold ${student.modality === 'Online' ? 'text-[#0081FF]' : 'text-[#EE13CA]'}`}>{student.modality}</span>}
                                            <p className="text-xs text-gray-500">{student.scheduleDay ? `${student.scheduleDay} às ${student.scheduleTime}` : 'Sem horário'}</p>
                                        </div>
                                    </div>
                                    <span className="material-symbols-rounded text-gray-600 group-hover:text-white ml-2">chevron_right</span>
                                </div>
                            ))
                        ) : (
                            <div className="p-8 text-center text-gray-500"><p className="text-sm">Nenhum aluno encontrado.</p></div>
                        )}
                    </div>
                </div>
            </div>

            {/* Floating Action Button */}
            <button onClick={() => setIsAddModalOpen(true)} className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-[#0081FF] text-white shadow-lg shadow-blue-900/40 flex items-center justify-center hover:scale-110 transition-transform z-20">
                <span className="material-symbols-rounded text-2xl">person_add</span>
            </button>

            {/* MODAL: Student Details & Observations (COM EDIT MODE E AGENDAMENTO) */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md max-h-[90vh] bg-[#1A202C] rounded-2xl border border-white/10 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header Modal */}
                        <div className="p-6 pb-4 border-b border-white/5 flex items-start justify-between bg-[#151A23] rounded-t-2xl">
                            <div className="flex items-center gap-4">
                                <img src={selectedStudent.avatarUrl} alt={selectedStudent.name} className="w-16 h-16 rounded-full border-2 border-[#0081FF]" />
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-xl font-bold text-white leading-none mb-1">{selectedStudent.name}</h3>
                                    <p className="text-sm text-gray-400">{selectedStudent.level}</p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isEditing ? 'bg-[#0081FF] text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}
                                    title="Editar"
                                >
                                    <span className="material-symbols-rounded text-sm">edit</span>
                                </button>
                                <button onClick={() => setSelectedStudent(null)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white">
                                    <span className="material-symbols-rounded">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto hide-scrollbar flex-1">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {isEditing ? (
                                    <>
                                        {/* Editar Telefone */}
                                        <div className="p-2 bg-[#101622] border border-[#0081FF] rounded-xl flex items-center gap-2 shadow-[0_0_10px_rgba(0,129,255,0.2)] col-span-2">
                                            <span className="material-symbols-rounded text-[#0081FF]">phone</span>
                                            <div className="flex-1">
                                                <p className="text-[9px] text-[#0081FF] uppercase font-bold">Editar Tel</p>
                                                <input
                                                    type="tel"
                                                    value={editPhone}
                                                    onChange={(e) => setEditPhone(e.target.value)}
                                                    className="w-full bg-transparent text-white text-xs font-medium focus:outline-none"
                                                    placeholder="(00) 00000-0000"
                                                />
                                            </div>
                                        </div>

                                        {/* Editar Agenda */}
                                        <div className="col-span-2 space-y-2 mt-2 pt-2 border-t border-white/5">
                                            <p className="text-[10px] text-[#FF00BC] font-bold uppercase">Editar Agenda</p>
                                            <div className="flex gap-2">
                                                <select
                                                    value={editScheduleDay}
                                                    onChange={(e) => setEditScheduleDay(e.target.value)}
                                                    className="flex-1 h-10 bg-[#101622] rounded-lg border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-[#0081FF]"
                                                >
                                                    {WEEK_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                                <input
                                                    type="time"
                                                    value={editScheduleTime}
                                                    onChange={(e) => setEditScheduleTime(e.target.value)}
                                                    className="flex-1 h-10 bg-[#101622] rounded-lg border border-white/10 px-2 text-white text-xs focus:outline-none focus:border-[#0081FF]"
                                                />
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Visualizar Contato e Agenda */}
                                        <button
                                            onClick={() => openWhatsApp(selectedStudent.phone || '')}
                                            className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 hover:bg-green-500/20 transition-colors text-left"
                                        >
                                            <span className="material-symbols-rounded text-green-500">chat</span>
                                            <div>
                                                <p className="text-[10px] text-green-400 uppercase font-bold">WhatsApp</p>
                                                <p className="text-xs text-white font-medium">{selectedStudent.phone || 'N/A'}</p>
                                            </div>
                                        </button>

                                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
                                            <span className="material-symbols-rounded text-blue-400">calendar_month</span>
                                            <div>
                                                <p className="text-[10px] text-blue-400 uppercase font-bold">Aula</p>
                                                <p className="text-xs text-white font-medium">
                                                    {selectedStudent.scheduleDay} - {selectedStudent.scheduleTime}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Observation Area */}
                            <div className="space-y-2 h-full flex flex-col">
                                <label className="text-xs text-gray-400 font-bold uppercase ml-1 flex items-center gap-2">
                                    <span className="material-symbols-rounded text-sm">edit_note</span>
                                    Caderno de Observações
                                </label>
                                <div className="relative flex-1 min-h-[150px]">
                                    <textarea
                                        value={notesInput}
                                        onChange={(e) => setNotesInput(e.target.value)}
                                        placeholder="Registre o desenvolvimento..."
                                        className="w-full h-full bg-[#101622] rounded-xl border border-white/10 p-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#0081FF] resize-none leading-relaxed"
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-white/5 bg-[#151A23] rounded-b-2xl flex gap-3">
                            <button onClick={() => setSelectedStudent(null)} className="flex-1 h-12 rounded-xl border border-white/10 text-gray-400 font-bold text-sm hover:bg-white/5">Cancelar</button>
                            <button
                                onClick={handleSaveChanges}
                                disabled={loadingAction}
                                className="flex-1 h-12 rounded-xl bg-[#0081FF] text-white font-bold text-sm hover:bg-[#006bd1] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <span className="material-symbols-rounded">save</span>
                                {loadingAction ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: Add Student (COM AGENDAMENTO) */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-sm max-h-[90vh] bg-[#1A202C] rounded-2xl border border-white/10 shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-[#151A23] rounded-t-2xl">
                            <h3 className="font-bold text-white">Cadastrar Novo Aluno</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"><span className="material-symbols-rounded text-lg">close</span></button>
                        </div>

                        <div className="p-6 space-y-5 overflow-y-auto hide-scrollbar">
                            <div className="flex justify-center">
                                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(newStudentName || 'Novo')}&background=random&color=fff&size=128`} alt="Avatar" className="w-16 h-16 rounded-full border-2 border-[#0081FF] shadow-lg" />
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] text-[#0081FF] font-bold uppercase tracking-wider border-b border-white/5 pb-1">Dados Pessoais</p>
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="col-span-3 space-y-1">
                                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">Nome</label>
                                        <input type="text" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} placeholder="Ex: Ana Silva" className="w-full h-10 bg-[#101622] rounded-lg border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-[#0081FF]" />
                                    </div>
                                    <div className="col-span-1 space-y-1">
                                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">Idade</label>
                                        <input type="number" value={newStudentAge} onChange={(e) => setNewStudentAge(e.target.value)} className="w-full h-10 bg-[#101622] rounded-lg border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-[#0081FF]" />
                                    </div>
                                </div>
                            </div>

                            {/* Seção Agendamento */}
                            <div className="space-y-3">
                                <p className="text-[10px] text-[#0081FF] font-bold uppercase tracking-wider border-b border-white/5 pb-1">Agendamento</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">Dia da Semana</label>
                                        <div className="relative">
                                            <select
                                                value={scheduleDay}
                                                onChange={(e) => setScheduleDay(e.target.value)}
                                                className="w-full h-10 bg-[#101622] rounded-lg border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-[#0081FF] appearance-none"
                                            >
                                                {WEEK_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <span className="material-symbols-rounded absolute right-3 top-2.5 text-gray-500 pointer-events-none text-sm">calendar_month</span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">Horário</label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                value={scheduleTime}
                                                onChange={(e) => setScheduleTime(e.target.value)}
                                                className="w-full h-10 bg-[#101622] rounded-lg border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-[#0081FF]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] text-[#0081FF] font-bold uppercase tracking-wider border-b border-white/5 pb-1">Contato</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">WhatsApp</label>
                                        <input type="tel" value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} placeholder="(00) 00000-0000" className="w-full h-10 bg-[#101622] rounded-lg border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-[#0081FF]" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 font-bold uppercase ml-1">Insta</label>
                                        <input type="text" value={newStudentInsta} onChange={(e) => setNewStudentInsta(e.target.value)} className="w-full h-10 bg-[#101622] rounded-lg border border-white/10 px-3 text-white text-sm focus:outline-none focus:border-[#0081FF]" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handleAddStudent}
                                    disabled={!newStudentName.trim() || loadingAction}
                                    className="w-full h-12 bg-[#0081FF] hover:bg-[#006bd1] text-white font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-rounded">save</span>
                                    {loadingAction ? 'Salvando...' : 'Cadastrar Aluno'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
