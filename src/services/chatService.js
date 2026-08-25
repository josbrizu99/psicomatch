import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  increment
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

/**
 * Servicio para gestionar chat en tiempo real
 */
class ChatService {
  /**
   * Crear una nueva conversación entre usuario y profesional
   */
  async createConversation(userId, professionalId, userName = null, professionalName = null, sessionId = null, userPhoto = null, professionalPhoto = null) {
    try {
      const conversationData = {
        participants: [userId, professionalId],
        userId,
        professionalId,
        sessionId,
        createdAt: serverTimestamp(),
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: {
          [userId]: 0,
          [professionalId]: 0
        }
      };

      if (userName) conversationData.userName = userName;
      if (professionalName) conversationData.professionalName = professionalName;
      if (userPhoto) conversationData.userPhoto = userPhoto;
      if (professionalPhoto) conversationData.professionalPhoto = professionalPhoto;

      const conversationRef = await addDoc(collection(db, 'conversations'), conversationData);

      return conversationRef.id;
    } catch (error) {
      console.error('Error creando conversación:', error);
      throw error;
    }
  }

  /**
   * Enviar un mensaje en una conversación
   */
  async sendMessage(conversationId, senderId, text, senderRole = 'user', recipientId = null) {
    try {
      const messageRef = await addDoc(
        collection(db, 'conversations', conversationId, 'messages'),
        {
          senderId,
          senderRole,
          text,
          timestamp: serverTimestamp(),
          read: false
        }
      );

      const updateData = {
        lastMessage: text,
        lastMessageAt: serverTimestamp()
      };

      // Si tenemos el ID del destinatario, incrementar su contador específico
      if (recipientId) {
        updateData[`unreadCount.${recipientId}`] = increment(1);
      } else {
        // Fallback para compatibilidad con código antiguo (menos preciso)
        const recipientRole = senderRole === 'user' ? 'professional' : 'user';
        // Nota: Esto no funcionará bien si cambiamos a IDs específicos, 
        // pero se mantiene para no romper llamadas antiguas sin recipientId
        // Lo ideal es migrar todo a usar recipientId
        console.warn('sendMessage llamado sin recipientId, usará lógica basada en roles que puede ser imprecisa');
      }

      // Actualizar último mensaje en la conversación
      await updateDoc(doc(db, 'conversations', conversationId), updateData);

      return messageRef.id;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  }

  /**
   * Escuchar mensajes en tiempo real
   */
  subscribeToMessages(conversationId, callback) {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(messages);
    });
  }

  /**
   * Suscribirse a las conversaciones del usuario
   */
  subscribeToConversations(userId, callback) {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('lastMessageAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const conversations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(conversations);
    }, (error) => {
      console.error('Error suscribiéndose a conversaciones:', error);
    });
  }
  async getUserConversations(userId) {
    try {
      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId),
        orderBy('lastMessageAt', 'desc')
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
      throw error;
    }
  }

  /**
   * Marcar mensajes como leídos
   */
  async markAsRead(conversationId, userId) {
    try {
      await updateDoc(doc(db, 'conversations', conversationId), {
        [`unreadCount.${userId}`]: 0
      });
    } catch (error) {
      console.error('Error marcando como leído:', error);
      throw error;
    }
  }
}

export default new ChatService();
