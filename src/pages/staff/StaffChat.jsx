import React, { useState, useEffect, useRef } from 'react';
import { messageAPI, adminAPI } from '../../api';
import { socket } from '../../socket';
import { useAuth } from '../../context/AuthContext';
import { Send, MessageSquare, CheckCircle2, User, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const StaffChat = () => {
    const { user } = useAuth();
    const [admin, setAdmin] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        fetchAdminAndMessages();

        socket.on('receive_message', (msg) => {
            // Check if message is from admin to current staff
            if (msg.senderRole === 'admin' && msg.receiverId._id === user._id) {
                setMessages(prev => [...prev, msg]);
                messageAPI.markAsRead(msg.senderId._id);
                socket.emit('message_read', { senderId: msg.senderId._id, receiverId: user._id });
                scrollToBottom();
            }
        });

        socket.on('user_typing', (data) => {
            if (data.senderRole === 'admin') {
                setIsTyping(data.typing);
            }
        });

        socket.on('message_seen', (data) => {
            if (data.readerId === admin?._id) {
                setMessages(prev => prev.map(m => m.senderRole === 'staff' ? { ...m, isRead: true } : m));
            }
        });

        return () => {
            socket.off('receive_message');
            socket.off('user_typing');
            socket.off('message_seen');
        };
    }, [admin, user._id]);

    useEffect(scrollToBottom, [messages, isTyping]);

    const fetchAdminAndMessages = async () => {
        try {
            // Fetch support admin directly (no longer needs adminAPI.getUsers)
            const supportAdmin = await messageAPI.getSupportAdmin();
            
            if (supportAdmin) {
                setAdmin(supportAdmin);
                const msgs = await messageAPI.getConversation(supportAdmin._id);
                setMessages(msgs);
                messageAPI.markAsRead(supportAdmin._id);
                socket.emit('message_read', { senderId: supportAdmin._id, receiverId: user._id });
            }
            setLoading(false);
        } catch (err) {
            console.error('Chat Init Error:', err);
            setLoading(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !admin) return;

        try {
            const res = await messageAPI.sendMessage({
                receiverId: admin._id,
                message: newMessage.trim()
            });
            setMessages(prev => [...prev, res]);
            setNewMessage('');
            scrollToBottom();
        } catch (err) {
            toast.error('Failed to send message');
        }
    };

    const handleTyping = (e) => {
        setNewMessage(e.target.value);
        if (!admin) return;

        socket.emit('typing', { receiverId: admin._id, senderId: user._id, typing: true });
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('typing', { receiverId: admin._id, senderId: user._id, typing: false });
        }, 2000);
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-gray-500 font-bold uppercase tracking-widest text-[10px]">Connecting to Administrator...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-160px)] flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="w-12 h-12 bg-primary-green/10 rounded-full flex items-center justify-center text-primary-green font-black border border-primary-green/20">
                    {admin?.name?.charAt(0) || 'A'}
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-black text-gray-800 tracking-tight leading-none mb-1">CFRD Administrator</h2>
                    <p className="text-[10px] font-black text-primary-green uppercase tracking-widest flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-1.5 ${admin?.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-gray-400'}`}></span>
                        {admin?.isActive ? 'Online Ready to assist' : 'Administrator Offline'}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f0f2f5] custom-scrollbar">
                <div className="flex flex-col space-y-3">
                    {messages.length === 0 ? (
                        <div className="text-center py-20 px-8">
                            <div className="w-20 h-20 bg-primary-green/5 rounded-full flex items-center justify-center text-primary-green mx-auto mb-4">
                                <MessageSquare size={40} className="opacity-40" />
                            </div>
                            <h3 className="text-lg font-black text-gray-800">Direct Support Line</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest max-w-xs mx-auto mt-2 leading-relaxed">
                                Send a message to the CFRD administrator for any platform or research related queries.
                            </p>
                        </div>
                    ) : (
                        messages.map((msg, i) => {
                            // User wants Staff on RIGHT (Green) and Admin on LEFT (White)
                            // Here I am Staff, so I am on RIGHT.
                            const isMe = msg.senderRole === 'staff';
                            return (
                                <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[75%] group relative animate-in fade-in duration-300`}>
                                        <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm leading-relaxed ${
                                            isMe 
                                            ? 'bg-[#dcfce7] text-gray-800 rounded-tr-none' 
                                            : 'bg-white text-gray-800 rounded-tl-none border border-gray-100 shadow-sm'
                                        }`}>
                                            {msg.message}
                                            <div className="flex items-center justify-end gap-1 mt-1 text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isMe && (
                                                     <span className={`text-[12px] ml-1 ${msg.isRead ? 'text-blue-500' : 'text-gray-400'}`}>
                                                        <CheckCircle2 size={12} />
                                                     </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    {isTyping && (
                        <div className="flex justify-start">
                           <div className="bg-white px-4 py-2 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm animate-pulse flex items-center gap-1.5">
                               <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                               <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                               <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                           </div>
                        </div>
                    )}
                </div>
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100 relative">
                <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                    <input
                        type="text"
                        placeholder="Type your message to administrator..."
                        value={newMessage}
                        onChange={handleTyping}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { handleSendMessage(e); }}}
                        className="flex-1 px-5 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm focus:bg-white focus:ring-4 focus:ring-primary-green/5 focus:border-primary-green outline-none transition-all font-medium"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim()}
                        className="bg-primary-green text-white p-4 rounded-2xl hover:bg-green-700 shadow-xl shadow-green-100 disabled:opacity-20 disabled:scale-95 active:scale-90 transition-all flex items-center justify-center shrink-0"
                    >
                        <Send size={24} />
                    </button>
                </form>
            </div>
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default StaffChat;
