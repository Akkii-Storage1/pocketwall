import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Bell, CheckCircle, Circle, StickyNote, Calendar, Clock, Edit2, Save, X } from 'lucide-react';
import DataAdapter from '../utils/dataAdapter';
import { useToast } from '../components/Toast';

const Reminders = ({ isDark }) => {
    const [reminders, setReminders] = useState([]);
    const [notes, setNotes] = useState([]);
    const [activeTab, setActiveTab] = useState('reminders'); // 'reminders' or 'notes'
    const [newReminder, setNewReminder] = useState({ title: '', date: '', time: '' });
    const [newNote, setNewNote] = useState({ title: '', content: '' });
    const [editingReminder, setEditingReminder] = useState(null);
    const [editingNote, setEditingNote] = useState(null);
    const toast = useToast();

    const bgColor = isDark ? '#1e1e1e' : '#ffffff';
    const textColor = isDark ? '#ffffff' : '#000000';
    const cardBg = isDark ? '#2d2d30' : '#f9fafb';
    const borderColor = isDark ? '#333' : '#e5e7eb';

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await DataAdapter.getReminders();
        // Separate reminders and notes based on type or just store them together with a type field
        // For now, let's assume the data structure handles both or we filter.
        // Let's say the stored array has objects with { type: 'reminder' | 'note' }
        setReminders(data.filter(item => item.type === 'reminder') || []);
        setNotes(data.filter(item => item.type === 'note') || []);
    };

    const saveData = async (updatedReminders, updatedNotes) => {
        const allItems = [...updatedReminders, ...updatedNotes];
        await DataAdapter.saveReminders(allItems);
        setReminders(updatedReminders);
        setNotes(updatedNotes);
    };

    const addReminder = async () => {
        if (!newReminder.title) return toast.error("Title is required");

        const reminder = {
            id: Date.now(),
            type: 'reminder',
            title: newReminder.title,
            date: newReminder.date,
            time: newReminder.time,
            completed: false,
            createdAt: new Date().toISOString()
        };

        const updatedReminders = [...reminders, reminder];
        await saveData(updatedReminders, notes);
        setNewReminder({ title: '', date: '', time: '' });
        toast.success("Reminder added");
    };

    const toggleReminder = async (id) => {
        const updatedReminders = reminders.map(r =>
            r.id === id ? { ...r, completed: !r.completed } : r
        );
        await saveData(updatedReminders, notes);
    };

    const updateReminder = async (updatedReminder) => {
        const updatedReminders = reminders.map(r => r.id === updatedReminder.id ? updatedReminder : r);
        await saveData(updatedReminders, notes);
        setEditingReminder(null);
        toast.success("Reminder updated");
    };

    const deleteReminder = async (id) => {
        if (!confirm("Delete this reminder?")) return;
        const updatedReminders = reminders.filter(r => r.id !== id);
        await saveData(updatedReminders, notes);
        toast.success("Reminder deleted");
    };

    const addNote = async () => {
        if (!newNote.title && !newNote.content) return toast.error("Note cannot be empty");

        const note = {
            id: Date.now(),
            type: 'note',
            title: newNote.title || 'Untitled Note',
            content: newNote.content,
            color: 'yellow', // Default color
            createdAt: new Date().toISOString()
        };

        const updatedNotes = [note, ...notes];
        await saveData(reminders, updatedNotes);
        setNewNote({ title: '', content: '' });
        toast.success("Note added");
    };

    const updateNote = async (updatedNote) => {
        const updatedNotes = notes.map(n => n.id === updatedNote.id ? updatedNote : n);
        await saveData(reminders, updatedNotes);
        setEditingNote(null);
        toast.success("Note updated");
    };

    const deleteNote = async (id) => {
        if (!confirm("Delete this note?")) return;
        const updatedNotes = notes.filter(n => n.id !== id);
        await saveData(reminders, updatedNotes);
        toast.success("Note deleted");
    };

    return (
        <div className="p-6 h-full flex flex-col" style={{ backgroundColor: bgColor, color: textColor }}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Bell className="text-blue-500" /> Reminders & Notes
                </h1>
                <div className="flex gap-2 p-1 rounded-lg" style={{ backgroundColor: isDark ? '#1f2937' : '#f3f4f6' }}>
                    <button
                        onClick={() => setActiveTab('reminders')}
                        style={{
                            backgroundColor: activeTab === 'reminders' ? (isDark ? '#374151' : '#ffffff') : 'transparent',
                            color: textColor
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'reminders' ? 'shadow' : 'opacity-70'}`}
                    >
                        Reminders
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        style={{
                            backgroundColor: activeTab === 'notes' ? (isDark ? '#374151' : '#ffffff') : 'transparent',
                            color: textColor
                        }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'notes' ? 'shadow' : 'opacity-70'}`}
                    >
                        Quick Notes
                    </button>
                </div>
            </div>

            {activeTab === 'reminders' && (
                <div className="flex-1 flex flex-col gap-6">
                    {/* Add Reminder Form */}
                    <div className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: cardBg, borderColor }}>
                        <h3 className="font-semibold mb-3">Add New Reminder</h3>
                        <div className="flex flex-col md:flex-row gap-3">
                            <input
                                type="text"
                                placeholder="What needs to be done?"
                                className="flex-1 p-2 rounded border bg-transparent"
                                style={{ borderColor, color: textColor }}
                                value={newReminder.title}
                                onChange={e => setNewReminder({ ...newReminder, title: e.target.value })}
                            />
                            <input
                                type="date"
                                className="p-2 rounded border bg-transparent"
                                style={{ borderColor, color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                                value={newReminder.date}
                                onChange={e => setNewReminder({ ...newReminder, date: e.target.value })}
                            />
                            <input
                                type="time"
                                className="p-2 rounded border bg-transparent"
                                style={{ borderColor, color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                                value={newReminder.time}
                                onChange={e => setNewReminder({ ...newReminder, time: e.target.value })}
                            />
                            <button
                                onClick={addReminder}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 justify-center"
                            >
                                <Plus size={18} /> Add
                            </button>
                        </div>
                    </div>

                    {/* Reminders List */}
                    <div className="flex-1 overflow-auto">
                        {reminders.length === 0 ? (
                            <div className="text-center opacity-50 mt-10">No reminders yet.</div>
                        ) : (
                            <div className="space-y-2">
                                {reminders.sort((a, b) => new Date(a.date) - new Date(b.date)).map(reminder => (
                                    <div
                                        key={reminder.id}
                                        className={`flex items-center justify-between p-4 rounded-lg border transition-all ${reminder.completed ? 'opacity-50' : ''}`}
                                        style={{ backgroundColor: cardBg, borderColor }}
                                    >
                                        {editingReminder?.id === reminder.id ? (
                                            /* Edit Mode */
                                            <>
                                                <div className="flex-1 flex gap-2">
                                                    <input
                                                        type="text"
                                                        className="flex-1 p-2 rounded border bg-transparent"
                                                        style={{ borderColor, color: textColor }}
                                                        value={editingReminder.title}
                                                        onChange={e => setEditingReminder({ ...editingReminder, title: e.target.value })}
                                                    />
                                                    <input
                                                        type="date"
                                                        className="p-2 rounded border bg-transparent"
                                                        style={{ borderColor, color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                                                        value={editingReminder.date}
                                                        onChange={e => setEditingReminder({ ...editingReminder, date: e.target.value })}
                                                    />
                                                    <input
                                                        type="time"
                                                        className="p-2 rounded border bg-transparent"
                                                        style={{ borderColor, color: textColor, colorScheme: isDark ? 'dark' : 'light' }}
                                                        value={editingReminder.time}
                                                        onChange={e => setEditingReminder({ ...editingReminder, time: e.target.value })}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => updateReminder(editingReminder)} className="text-green-500 hover:bg-green-100 dark:hover:bg-green-900 p-2 rounded">
                                                        <Save size={16} />
                                                    </button>
                                                    <button onClick={() => setEditingReminder(null)} className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded">
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            /* View Mode */
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <button onClick={() => toggleReminder(reminder.id)}>
                                                        {reminder.completed ? (
                                                            <CheckCircle className="text-green-500" />
                                                        ) : (
                                                            <Circle className="text-gray-400" />
                                                        )}
                                                    </button>
                                                    <div>
                                                        <div className={`font-medium ${reminder.completed ? 'line-through' : ''}`}>
                                                            {reminder.title}
                                                        </div>
                                                        {(reminder.date || reminder.time) && (
                                                            <div className="text-xs opacity-70 flex items-center gap-2 mt-1">
                                                                {reminder.date && <span className="flex items-center gap-1"><Calendar size={12} /> {new Date(reminder.date).toLocaleDateString()}</span>}
                                                                {reminder.time && <span className="flex items-center gap-1"><Clock size={12} /> {reminder.time}</span>}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setEditingReminder(reminder)} className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 p-2 rounded">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => deleteReminder(reminder.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900 p-2 rounded">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'notes' && (
                <div className="flex-1 flex flex-col gap-6">
                    {/* Add Note Form */}
                    <div className="p-4 rounded-xl border shadow-sm" style={{ backgroundColor: cardBg, borderColor }}>
                        <h3 className="font-semibold mb-3">Create Quick Note</h3>
                        <input
                            type="text"
                            placeholder="Title (optional)"
                            className="w-full p-2 mb-2 rounded border bg-transparent"
                            style={{ borderColor, color: textColor }}
                            value={newNote.title}
                            onChange={e => setNewNote({ ...newNote, title: e.target.value })}
                        />
                        <textarea
                            placeholder="Write your note here..."
                            className="w-full p-2 rounded border bg-transparent h-24 resize-none"
                            style={{ borderColor, color: textColor }}
                            value={newNote.content}
                            onChange={e => setNewNote({ ...newNote, content: e.target.value })}
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                onClick={addNote}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded flex items-center gap-2"
                            >
                                <StickyNote size={18} /> Save Note
                            </button>
                        </div>
                    </div>

                    {/* Notes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-auto pb-4">
                        {notes.length === 0 ? (
                            <div className="col-span-full text-center opacity-50 mt-10">No notes yet.</div>
                        ) : (
                            notes.map(note => (
                                <div
                                    key={note.id}
                                    className="p-4 rounded-lg border shadow-sm relative group hover:shadow-md transition-all"
                                    style={{ backgroundColor: isDark ? '#333' : '#fff9c4', borderColor: isDark ? '#444' : '#f0f0f0', color: isDark ? '#fff' : '#000' }}
                                >
                                    {editingNote?.id === note.id ? (
                                        /* Edit Mode */
                                        <>
                                            <input
                                                type="text"
                                                className="w-full p-2 mb-2 rounded border bg-transparent"
                                                style={{ borderColor: isDark ? '#555' : '#ddd', color: isDark ? '#fff' : '#000' }}
                                                value={editingNote.title}
                                                onChange={e => setEditingNote({ ...editingNote, title: e.target.value })}
                                            />
                                            <textarea
                                                className="w-full p-2 rounded border bg-transparent h-24 resize-none mb-2"
                                                style={{ borderColor: isDark ? '#555' : '#ddd', color: isDark ? '#fff' : '#000' }}
                                                value={editingNote.content}
                                                onChange={e => setEditingNote({ ...editingNote, content: e.target.value })}
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => updateNote(editingNote)} className="text-green-600 hover:bg-green-100 p-2rounded">
                                                    <Save size={14} />
                                                </button>
                                                <button onClick={() => setEditingNote(null)} className="text-gray-600 hover:bg-gray-100 p-2 rounded">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        /* View Mode */
                                        <>
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                                <button
                                                    onClick={() => setEditingNote(note)}
                                                    className="text-blue-600 hover:bg-blue-100 p-1 rounded"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => deleteNote(note.id)}
                                                    className="text-red-600 hover:bg-red-100 p-1 rounded"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <h4 className="font-bold mb-2 pr-16">{note.title}</h4>
                                            <p className="text-sm whitespace-pre-wrap opacity-90">{note.content}</p>
                                            <div className="text-xs opacity-50 mt-4 text-right">
                                                {new Date(note.createdAt).toLocaleDateString()}
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reminders;
