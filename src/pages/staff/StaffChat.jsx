import { useState, useEffect, useRef } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../socket';
import { Send, User, MessageSquare, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const StaffChat = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        fetchAdmin();
        
        socket.on('new_message', (msg) => {
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
        });

        return () => socket.off('new_message');
    }, []);

    useEffect(scrollToBottom, [messages]);

    const fetchAdmin = async () => {
        try {
            // Get the first admin available to chat
            const res = await API.get('/admin/users');
            const mainAdmin = res.data.find(u => u.role === 'admin' && u.isActive);
            if (mainAdmin) {
                setAdmin(mainAdmin);
                fetchMessages(mainAdmin._id);
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchMessages = async (adminId) => {
        try {
            const res = await API.get(`/messages/${adminId}`);
            setMessages(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !admin) return;

        try {
            const res = await API.post('/messages', {
                receiverId: admin._id,
                message: newMessage.trim()
            });
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
            scrollToBottom();
        } catch (err) {
            toast.error('Failed to send message');
        }
    };

    if (loading) return <div className="p-8 text-center text-primary-green animate-pulse">Loading Chat Support...</div>;

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-2xl shadow-sm border border-[#bbf7d0] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-[#f0fdf4] bg-[#f0fdf4] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link to="/staff/dashboard" className="p-2 border border-slate-200 rounded-lg bg-white text-slate-500 hover:text-slate-800 lg:hidden">
                        <ArrowLeft size={18} />
                    </Link>
                    <div className="w-12 h-12 rounded-full bg-primary-green/10 flex items-center justify-center text-primary-green font-black border border-primary-green/20">
                        A
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center">
                            Chat with Admin
                            <span className="w-2.5 h-2.5 rounded-full bg-green-500 ml-2 animate-pulse"></span>
                        </h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Center for Research and Development (CFRD) Support</p>
                    </div>
                </div>
                <div className="hidden md:flex flex-col items-end">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-tight">Active Session</p>
                    <p className="text-[10px] font-black text-primary-green uppercase tracking-widest">Secure Messaging</p>
                </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-slate-50/10">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 opacity-40">
                        <MessageSquare size={48} className="text-slate-200 mb-4" />
                        <p className="text-sm font-bold text-slate-400 mb-1 uppercase tracking-widest">No previous messages</p>
                        <p className="text-xs font-medium text-slate-400">Your conversation with the admin for support and queries.</p>
                    </div>
                ) : (
                    messages.map((msg, i) => {
                        const isMe = msg.senderRole === 'staff';
                        return (
                            <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] md:max-w-[70%] group`}>
                                    <div className={`px-5 py-3 rounded-2xl text-sm font-medium shadow-sm leading-relaxed transition-all transform hover:scale-[1.01] ${
                                        isMe 
                                        ? 'bg-primary-green text-white rounded-tr-none' 
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none ring-1 ring-slate-100'
                                    }`}>
                                        {msg.message}
                                    </div>
                                    <div className={`flex items-center gap-2 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter opacity-80">
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isMe && (
                                            <span className={`text-[10px] font-black uppercase transition-opacity ${msg.isRead ? 'text-primary-green' : 'text-slate-300'}`}>
                                                {msg.isRead ? '✓✓ Read' : '✓ Sent'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-5 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Describe your query or update..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-primary-green/10 outline-none transition-all placeholder:text-slate-400"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-primary-green text-white p-4 rounded-2xl hover:bg-green-700 shadow-xl shadow-green-100 disabled:opacity-50 transition-all transform active:scale-95 flex items-center justify-center w-14"
                    >
                        <Send className="w-6 h-6" />
                    </button>
                </form>
                <p className="text-[10px] font-bold text-slate-400 text-center mt-3 uppercase tracking-widest flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"></span>
                    Admin typically responds within working hours
                </p>
            </div>
        </div>
    );
};

export default StaffChat;
