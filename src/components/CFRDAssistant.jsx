import React, { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../api';
import { MessageSquare, X, Send, Bot, User, Sparkles } from 'lucide-react';

const CFRDAssistant = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I am your CFRD AI Assistant. How can I help you with research or reporting today?" }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMsg = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const data = await aiAPI.chat({ 
                message: userMsg.content,
                history: messages 
            });
            
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (err) {
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "I'm sorry, I'm having trouble connecting to the system right now. Please try again later." 
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 ${isOpen ? 'bg-red-500 rotate-90' : 'bg-primary-green'}`}
            >
                {isOpen ? <X className="text-white" /> : <MessageSquare className="text-white fill-white/20" />}
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-green-400"></span>
                    </span>
                )}
            </button>

            {/* Chat Box */}
            {isOpen && (
                <div className="absolute bottom-16 right-0 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="bg-primary-green p-4 flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                            <Bot className="w-6 h-6" />
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest">CFRD Assistant</h3>
                                <p className="text-[10px] opacity-70 font-bold uppercase">Online Help Intelligence</p>
                            </div>
                        </div>
                        <Sparkles className="w-5 h-5 opacity-40 animate-pulse" />
                    </div>

                    {/* Chat Area */}
                    <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className="flex-shrink-0 mt-1">
                                        {msg.role === 'user' ? (
                                            <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-[10px] font-black"><User size={12} /></div>
                                        ) : (
                                            <div className="w-6 h-6 bg-primary-green/10 rounded-full flex items-center justify-center text-primary-green"><Bot size={12} /></div>
                                        )}
                                    </div>
                                    <div className={`p-3 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                        ? 'bg-primary-green text-white rounded-tr-none' 
                                        : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white border p-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-100 flex gap-2">
                        <input
                            type="text"
                            placeholder="Ask me anything..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs focus:ring-2 focus:ring-primary-green/20 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || loading}
                            className="bg-primary-green text-white p-2 rounded-xl hover:bg-green-700 disabled:opacity-30 transition-all shadow-md active:scale-90"
                        >
                            <Send size={16} />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CFRDAssistant;
