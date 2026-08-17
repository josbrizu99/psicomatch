import React, { useState } from 'react';
import ConversationsList from './ConversationsList';
import ChatWindow from '../user/ChatWindow';
import { useConversations } from '../../hooks/useChat';

const ChatContainer = ({ userId, userType = 'user', initialConversationId = null }) => {
    const [selectedConversation, setSelectedConversation] = useState(null);
    const { conversations, loading } = useConversations(userId);

    React.useEffect(() => {
        if (initialConversationId && conversations.length > 0 && !selectedConversation) {
            const target = conversations.find(c => c.id === initialConversationId);
            if (target) {
                setSelectedConversation(target);
            }
        }
    }, [initialConversationId, conversations, selectedConversation]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando conversaciones...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Conversations List - Left Side */}
            <div className={`${selectedConversation ? 'hidden md:block' : 'block'
                } w-full md:w-80 border-r border-gray-200`}>
                <ConversationsList
                    conversations={conversations}
                    selectedConversation={selectedConversation}
                    onSelectConversation={setSelectedConversation}
                    currentUserId={userId}
                />
            </div>

            {/* Chat Window - Right Side */}
            <div className={`${selectedConversation ? 'block' : 'hidden md:block'
                } flex-1 flex flex-col`}>
                {selectedConversation ? (
                    <>
                        {/* Chat Window */}
                        <ChatWindow
                            conversationId={selectedConversation.id}
                            userId={userId}
                            userType={userType}
                            recipientId={selectedConversation.participants?.find(id => id !== userId) ||
                                (userType === 'user' ? selectedConversation.professionalId : selectedConversation.userId)}
                            otherUserName={selectedConversation.professionalName || selectedConversation.userName || 'Usuario'}
                            otherUserPhoto={selectedConversation.professionalPhoto || selectedConversation.userPhoto}
                            onClose={() => setSelectedConversation(null)}
                        />
                    </>
                ) : (
                    <div className="hidden md:flex flex-col items-center justify-center h-full p-8 text-center bg-gray-50">
                        <svg className="w-24 h-24 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            Selecciona una conversación
                        </h3>
                        <p className="text-gray-500">
                            Elige una conversación de la lista para comenzar a chatear
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatContainer;
