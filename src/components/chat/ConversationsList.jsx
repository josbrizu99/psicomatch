import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ConversationsList = ({ conversations, selectedConversation, onSelectConversation, currentUserId, userType }) => {
    if (!conversations || conversations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No hay conversaciones
                </h3>
                <p className="text-sm text-gray-500">
                    Tus conversaciones aparecerán aquí cuando inicies un chat
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Mensajes</h2>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {conversations.map((conversation) => {
                    const otherUserId = conversation.participants.find(id => id !== currentUserId);
                    const unreadCount = conversation.unreadCount?.[currentUserId] || 0;
                    const isSelected = selectedConversation?.id === conversation.id;
                    const isProfessional = userType === 'professional';
                    const photo = isProfessional ? conversation.userPhoto : conversation.professionalPhoto;
                    const name = isProfessional ? (conversation.userName || 'Usuario') : (conversation.professionalName || 'Profesional');

                    return (
                        <div
                            key={conversation.id}
                            onClick={() => onSelectConversation(conversation)}
                            className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${isSelected
                                    ? 'bg-primary-50 border-l-4 border-l-primary-600'
                                    : 'hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                {/* Avatar */}
                                <div className="flex-shrink-0 relative">
                                    {photo ? (
                                        <img src={photo} alt={name} className="w-12 h-12 rounded-full object-cover shadow-sm border border-gray-100" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold shadow-sm text-lg">
                                            {name.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                                            {name}
                                        </h3>
                                        {conversation.lastMessageAt && (
                                            <span className="text-xs text-gray-500">
                                                {formatDistanceToNow(conversation.lastMessageAt.toDate(), {
                                                    addSuffix: true,
                                                    locale: es
                                                })}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <p className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-600'
                                            }`}>
                                            {conversation.lastMessage || 'No hay mensajes'}
                                        </p>
                                        {unreadCount > 0 && (
                                            <span className="ml-2 flex-shrink-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary-600 rounded-full">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ConversationsList;
