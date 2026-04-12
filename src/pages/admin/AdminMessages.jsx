import { useState, useEffect, useRef } from 'react';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { socket } from '../../socket';
import { Search, Send, User, MessageSquare, Clock } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const AdminMessages = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        fetchConversations();
        
        socket.on('new_message', (msg) => {
            // If the message is from or to the currently selected staff
            if (selectedStaff && (msg.sender._id === selectedStaff._id || msg.receiver === selectedStaff._id)) {
                setMessages(prev => [...prev, msg]);
                scrollToBottom();
            }
            // Update conversation list
            fetchConversations();
        });

        return () => socket.off('new_message');
    }, [selectedStaff]);

    useEffect(scrollToBottom, [messages]);

    const fetchConversations = async () => {
        try {
            const res = await API.get('/messages/admin/list');
            setConversations(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    const fetchMessages = async (staffId) => {
        try {
            const res = await API.get(`/messages/${staffId}`);
            setMessages(res.data);
            // Refresh conversation list to clear unread count
            fetchConversations();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSelectStaff = (staff) => {
        setSelectedStaff(staff);
        fetchMessages(staff._id);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedStaff) return;

        try {
            const res = await API.post('/messages', {
                receiverId: selectedStaff._id,
                message: newMessage.trim()
            });
            setMessages(prev => [...prev, res.data]);
            setNewMessage('');
            scrollToBottom();
            fetchConversations();
        } catch (err) {
            toast.error('Failed to send message');
        }
    };

    const filteredConversations = conversations.filter(c => 
        c.staff.name.toLowerCase().includes(search.toLowerCase()) ||
        c.staff.department.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Sidebar: Staff List */}
            <div className="w-80 border-r border-gray-100 flex flex-col bg-slate-50/30">
                <div className="p-4 border-b border-gray-100">
                    <h2 className="text-lg font-black text-gray-800 uppercase tracking-tighter mb-4 flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2 text-primary-green" />
                        Staff Conversations
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search staff or dept..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-green/20 outline-none"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-400 animate-pulse">Loading chats...</div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">No conversations found</div>
                    ) : (
                        filteredConversations.map((conv) => (
                            <button
                                key={conv.staff._id}
                                onClick={() => handleSelectStaff(conv.staff)}
                                className={`w-full p-4 flex items-start gap-3 border-b border-gray-100 transition-all hover:bg-white text-left ${selectedStaff?._id === conv.staff._id ? 'bg-white ring-1 ring-primary-green/10 shadow-sm' : ''}`}
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="w-12 h-12 rounded-full bg-primary-green/10 flex items-center justify-center text-primary-green font-black border border-primary-green/20">
                                        {conv.staff.name.charAt(0)}
                                    </div>
                                    {conv.unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                                            {conv.unreadCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h3 className="text-sm font-black text-gray-800 truncate">{conv.staff.name}</h3>
                                        {conv.lastMessage && (
                                            <span className="text-[10px] text-gray-400 font-bold whitespace-nowrap">
                                                {new Date(conv.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-bold text-primary-green uppercase tracking-wider mb-1">{conv.staff.department}</p>
                                    <p className="text-xs text-gray-500 truncate font-medium">
                                        {conv.lastMessage?.message || 'Start conversation...'}
                                    </p>
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
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black border border-slate-200">
                                    {selectedStaff.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-800 tracking-tight">{selectedStaff.name}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center">
                                        <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
                                        {selectedStaff.department} | Staff ID: {selectedStaff.staffId}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Messages List */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                            {messages.map((msg, i) => {
                                const isMe = msg.senderRole === 'admin';
                                return (
                                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[70%] group`}>
                                            <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm transition-all ${
                                                isMe 
                                                ? 'bg-primary-green text-white rounded-tr-none' 
                                                : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                            }`}>
                                                {msg.message}
                                            </div>
                                            <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                                {isMe && (
                                                    <span className={`text-[9px] font-bold uppercase transition-opacity ${msg.isRead ? 'text-primary-green' : 'text-gray-300'}`}>
                                                        {msg.isRead ? 'Read' : 'Sent'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Chat Input */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <form onSubmit={handleSendMessage} className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Type your message..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-primary-green/10 outline-none transition-all"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim()}
                                    className="bg-primary-green text-white p-3 rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 disabled:opacity-50 transition-all flex items-center justify-center w-12"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/10">
                        <div className="w-20 h-20 bg-primary-green/10 rounded-full flex items-center justify-center text-primary-green mb-4">
                            <MessageSquare size={40} />
                        </div>
                        <h3 className="text-xl font-black text-gray-800 tracking-tight">Direct Staff Support</h3>
                        <p className="text-sm text-gray-500 max-w-xs mt-2 font-medium">
                            Select a conversation from the sidebar to start chatting with staff members.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminMessages;
