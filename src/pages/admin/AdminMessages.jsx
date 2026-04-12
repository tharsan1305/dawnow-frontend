import React, { useState, useEffect, useRef } from 'react';
import { messageAPI, adminAPI } from '../../api';
import { socket } from '../../socket';
import { useAuth } from '../../context/AuthContext';
import { Search, Send, User, MessageSquare, Clock, CheckCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminMessages = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        fetchConversations();
        
        socket.on('receive_message', (msg) => {
            if (selectedStaff && (msg.senderId._id === selectedStaff._id || msg.receiverId._id === selectedStaff._id)) {
                setMessages(prev => [...prev, msg]);
                if (msg.senderId._id === selectedStaff._id) {
                    messageAPI.markAsRead(selectedStaff._id);
                    socket.emit('message_read', { senderId: selectedStaff._id, receiverId: user._id });
                }
            }
            fetchConversations();
        });

        socket.on('user_typing', (data) => {
            if (selectedStaff && data.senderId === selectedStaff._id) {
                setIsTyping(data.typing);
            }
        });

        socket.on('message_seen', (data) => {
            if (selectedStaff && data.readerId === selectedStaff._id) {
                setMessages(prev => prev.map(m => m.senderRole === 'admin' ? { ...m, isRead: true } : m));
            }
        });

        return () => {
            socket.off('receive_message');
            socket.off('user_typing');
            socket.off('message_seen');
        };
    }, [selectedStaff]);

    useEffect(scrollToBottom, [messages, isTyping]);

    const fetchConversations = async () => {
        try {
            const res = await messageAPI.getAdminConversations();
            setConversations(res);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchMessages = async (staffId) => {
        try {
            const res = await messageAPI.getConversation(staffId);
            setMessages(res);
            fetchConversations();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelectStaff = (staff) => {
        setSelectedStaff(staff);
        fetchMessages(staff._id);
        socket.emit('message_read', { senderId: staff._id, receiverId: user._id });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedStaff) return;

        try {
            const res = await messageAPI.sendMessage({
                receiverId: selectedStaff._id,
                message: newMessage.trim()
            });
            setMessages(prev => [...prev, res]);
            setNewMessage('');
            fetchConversations();
        } catch (err) {
            toast.error('Failed to send message');
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!selectedStaff) return;

        socket.emit('typing', { receiverId: selectedStaff._id, senderId: user._id, typing: true });
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing', { receiverId: selectedStaff._id, senderId: user._id, typing: false });
        }, 2000);
    };

    const filteredConversations = conversations.filter(c => 
        c.staff.name.toLowerCase().includes(search.toLowerCase()) ||
        c.staff.department.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-120px)] bg-gray-100 rounded-2xl shadow-xl overflow-hidden border border-gray-200">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <h2 className="text-xl font-black text-gray-800 tracking-tighter mb-4 flex items-center gap-2">
                        <MessageSquare className="text-primary-green" /> CHATS
                    </h2>
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-primary-green transition-colors" />
                        <input
                            type="text"
                            placeholder="Search staff..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-primary-green/20 focus:border-primary-green outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-10 flex justify-center">
                            <div className="w-6 h-6 border-2 border-primary-green border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-sm font-bold uppercase tracking-widest">No Chats Found</div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <button
                                key={conv.staff._id}
                                onClick={() => handleSelectStaff(conv.staff)}
                                className={`w-full p-4 flex items-start gap-3 border-b border-gray-50 transition-all text-left group ${selectedStaff?._id === conv.staff._id ? 'bg-primary-green/5 ring-1 ring-inset ring-primary-green/10' : 'hover:bg-gray-50'}`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-black border-2 border-white shadow-sm overflow-hidden text-lg">
                                        {conv.staff.profileImage ? <img src={conv.staff.profileImage} className="w-full h-full object-cover" /> : conv.staff.name.charAt(0)}
                                    </div>
                                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${conv.staff.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-0.5">
                                        <h3 className="text-sm font-black text-gray-800 truncate group-hover:text-primary-green transition-colors">{conv.staff.name}</h3>
                                        {conv.lastMessage && (
                                            <span className="text-[10px] text-gray-400 font-bold">
                                                {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-black text-primary-green uppercase tracking-tighter mb-1 opacity-70 truncate">{conv.staff.department}</p>
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs text-gray-500 truncate font-medium flex-1">
                                            {conv.lastMessage?.message || 'Tap to chat...'}
                                        </p>
                                        {conv.unreadCount > 0 && (
                                            <span className="ml-2 bg-primary-green text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-lg shadow-green-100">
                                                {conv.unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white">
                {selectedStaff ? (
                    <>
                        {/* Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black border border-slate-200">
                                    {selectedStaff.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-800 tracking-tight leading-none mb-1">{selectedStaff.name}</h3>
                                    <p className="text-[10px] font-black text-primary-green uppercase tracking-widest flex items-center">
                                        <span className={`w-2 h-2 rounded-full mr-1.5 ${selectedStaff.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}`}></span>
                                        {selectedStaff.isActive ? 'Online' : 'Offline'} | {selectedStaff.department}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f0f2f5] custom-scrollbar">
                            <div className="flex flex-col space-y-3">
                                {messages.map((msg, i) => {
                                    // Admin View: Admin (Me) on RIGHT, Staff on LEFT
                                    const isMe = msg.senderRole === 'admin';
                                    return (
                                        <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[70%] group relative`}>
                                                <div className={`px-4 py-2 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                                                    isMe 
                                                    ? 'bg-[#dcfce7] text-gray-800 rounded-tr-none' 
                                                    : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                                }`}>
                                                    {msg.message}
                                                    <div className="flex items-center justify-end gap-1 mt-1">
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                        {!isStaff && (
                                                             <span className={`text-[12px] ${msg.isRead ? 'text-blue-500' : 'text-gray-400'}`}>
                                                                <CheckCircle2 size={12} />
                                                             </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {isTyping && (
                                    <div className="flex justify-end">
                                        <div className="bg-[#dcfce7] px-4 py-2 rounded-2xl rounded-tr-none animate-pulse flex items-center gap-1">
                                            <div className="w-1 h-1 bg-green-600 rounded-full animate-bounce"></div>
                                            <div className="w-1 h-1 bg-green-600 rounded-full animate-bounce delay-75"></div>
                                            <div className="w-1 h-1 bg-green-600 rounded-full animate-bounce delay-150"></div>
                                            <span className="text-[10px] font-black text-green-700 uppercase ml-2 tracking-widest">Typing...</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    value={newMessage}
                                    onChange={handleTyping}
                                    onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { handleSendMessage(e); }}}
                                    className="flex-1 px-5 py-3.5 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-primary-green/5 focus:border-primary-green outline-none transition-all font-medium"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-primary-green text-white p-4 rounded-2xl hover:bg-green-700 shadow-xl shadow-green-100 disabled:opacity-20 disabled:scale-95 active:scale-90 transition-all flex items-center justify-center"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                        <div className="w-32 h-32 bg-primary-green/5 rounded-full flex items-center justify-center text-primary-green mb-6 animate-float">
                            <MessageSquare size={64} className="opacity-50" />
                        </div>
                        <h3 className="text-3xl font-black text-gray-800 tracking-tighter">Support Messenger</h3>
                        <p className="text-gray-400 max-w-sm mt-3 font-bold uppercase tracking-widest text-[11px] leading-relaxed">
                            Select a staff member from the left to start a real-time conversation. All messages are encrypted and private.
                        </p>
                    </div>
                )}
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                    100% { transform: translateY(0px); }
                }
                .animate-float { animation: float 3s ease-in-out infinite; }
            `}</style>
        </div>
    );
};

export default AdminMessages;
