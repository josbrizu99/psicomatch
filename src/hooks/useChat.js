import { useState, useEffect } from 'react';
import chatService from '../services/chatService';

/**
 * Hook para gestionar chat en tiempo real
 */
export const useChat = (conversationId) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Suscribirse a mensajes en tiempo real
    const unsubscribe = chatService.subscribeToMessages(
      conversationId,
      (newMessages) => {
        setMessages(newMessages);
        setLoading(false);
      }
    );

    // Cleanup al desmontar
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [conversationId]);

  const sendMessage = async (text, senderId, senderRole, recipientId) => {
    try {
      await chatService.sendMessage(conversationId, senderId, text, senderRole, recipientId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const markAsRead = async (userId) => {
    try {
      await chatService.markAsRead(conversationId, userId);
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  return { messages, loading, error, sendMessage, markAsRead };
};

/**
 * Hook para gestionar conversaciones del usuario
 */
export const useConversations = (userId) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Usar suscripción en tiempo real
    const unsubscribe = chatService.subscribeToConversations(
      userId,
      (convs) => {
        setConversations(convs);
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [userId]);

  const createConversation = async (professionalId, sessionId, userName, professionalName, userPhoto, professionalPhoto) => {
    try {
      const id = await chatService.createConversation(userId, professionalId, userName, professionalName, sessionId, userPhoto, professionalPhoto);
      return id;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { conversations, loading, error, createConversation };
};
