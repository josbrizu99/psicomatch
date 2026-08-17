import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../hooks/useChat';
import SkeletonLoader from '../common/SkeletonLoader';

/**
 * Ventana de Chat en tiempo real
 */
const ChatWindow = ({ conversationId, otherUserName, otherUserPhoto, onClose, recipientId }) => {
    const { currentUser } = useAuth();
    const { messages, loading, sendMessage, markAsRead } = useChat(conversationId);
    const [newMessage, setNewMessage] = useState('');
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef(null);

    // Marcar como leído al abrir o recibir mensajes
    useEffect(() => {
        if (conversationId && currentUser?.uid) {
            markAsRead(currentUser.uid);
        }
    }, [conversationId, messages.length, currentUser?.uid]);

    // Auto-scroll al último mensaje
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || sending) return;

        try {
            setSending(true);
            // Usar 'user' o 'professional' dependiendo del rol del usuario actual
            // Esto podría mejorarse pasando el rol como prop
            const senderRole = currentUser?.role || 'user';
            await sendMessage(newMessage.trim(), currentUser.uid, senderRole, recipientId);
            setNewMessage('');
        } catch (error) {
            console.error('Error enviando mensaje:', error);
        } finally {
            setSending(false);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10 relative rounded-t-lg">
                <div className="flex items-center gap-3">
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors mr-1"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    )}
                    <div className="relative">
                        {otherUserPhoto ? (
                            <img src={otherUserPhoto} alt={otherUserName} className="w-10 h-10 rounded-full object-cover shadow-sm border border-gray-100 dark:border-gray-600" />
                        ) : (
                            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white font-semibold shadow-sm text-lg">
                                {otherUserName?.charAt(0) || '?'}
                            </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-800 rounded-full"></span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white leading-tight">{otherUserName || 'Usuario'}</h3>
                        <p className="text-xs text-green-500 font-medium mt-0.5">En línea</p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900">
                {loading ? (
                    <SkeletonLoader variant="text" count={5} />
                ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 py-8">
                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="font-medium">No hay mensajes aún.</p>
                        <p className="text-sm mt-1">Inicia la conversación enviando un mensaje.</p>
                    </div>
                ) : (
                    messages.map((msg, index) => {
                        const isOwn = msg.senderId === currentUser.uid;
                        const showAvatar = !isOwn && (index === messages.length - 1 || messages[index + 1]?.senderId === currentUser.uid);
                        
                        return (
                            <div
                                key={msg.id}
                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                            >
                                {!isOwn && (
                                    <div className="w-8 h-8 mr-2 flex-shrink-0 flex items-end">
                                        {showAvatar ? (
                                            otherUserPhoto ? (
                                                <img src={otherUserPhoto} alt="" className="w-8 h-8 rounded-full object-cover shadow-sm" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-secondary-400 flex items-center justify-center text-white text-xs font-semibold shadow-sm">
                                                    {otherUserName?.charAt(0) || '?'}
                                                </div>
                                            )
                                        ) : null}
                                    </div>
                                )}
                                <div
                                    className={`relative max-w-[75%] lg:max-w-md px-4 py-2.5 shadow-sm ${isOwn
                                        ? 'bg-primary-600 text-white rounded-2xl rounded-tr-sm'
                                        : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700'
                                        }`}
                                >
                                    <p className="text-sm sm:text-base leading-relaxed break-words">{msg.text}</p>
                                    <div className={`flex items-center justify-end gap-1 mt-1 ${isOwn ? 'text-primary-100' : 'text-gray-400 dark:text-gray-500'}`}>
                                        <p className="text-[10px] sm:text-xs">
                                            {formatTime(msg.timestamp)}
                                        </p>
                                        {isOwn && (
                                            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} className="h-1" />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 sm:p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                <div className="flex items-end gap-2 relative">
                    <div className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full flex items-center px-4 py-1.5 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all shadow-inner">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Escribe un mensaje..."
                            className="w-full bg-transparent border-none focus:ring-0 py-2 text-sm sm:text-base text-gray-800 dark:text-white placeholder-gray-400 outline-none"
                            disabled={sending}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="flex-shrink-0 w-11 h-11 rounded-full bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        {sending ? (
                            <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatWindow;
