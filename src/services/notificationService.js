import { collection, query, where, limit, onSnapshot, orderBy, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, messaging, auth } from '../firebase/firebase';
import { getToken, onMessage } from 'firebase/messaging';

class NotificationService {
  constructor() {
    this.listeners = new Map();
    this.notifications = [];
    this.unreadCount = 0;
    this.callbacks = new Set();
    this.isListening = false;
    this.readNotifications = new Set();
    this.dismissedNotifications = new Set();
    this.lastProcessedTime = null;
    this.loadPersistedData();
  }

  // Cargar datos persistidos desde localStorage
  loadPersistedData() {
    try {
      const persisted = localStorage.getItem('notificationService');
      if (persisted) {
        const data = JSON.parse(persisted);
        this.readNotifications = new Set(data.readNotifications || []);
        this.dismissedNotifications = new Set(data.dismissedNotifications || []);
        this.lastProcessedTime = data.lastProcessedTime ? new Date(data.lastProcessedTime) : null;
        console.log('📱 Datos de notificaciones cargados:', {
          readCount: this.readNotifications.size,
          dismissedCount: this.dismissedNotifications.size,
          lastProcessed: this.lastProcessedTime
        });
      }
    } catch (error) {
      console.error('❌ Error al cargar datos persistidos:', error);
    }
  }

  // Guardar datos en localStorage
  savePersistedData() {
    try {
      const data = {
        readNotifications: Array.from(this.readNotifications),
        dismissedNotifications: Array.from(this.dismissedNotifications),
        lastProcessedTime: this.lastProcessedTime ? this.lastProcessedTime.toISOString() : null,
        lastSave: new Date().toISOString()
      };
      localStorage.setItem('notificationService', JSON.stringify(data));
      console.log('💾 Datos de notificaciones guardados');
    } catch (error) {
      console.error('❌ Error al guardar datos persistidos:', error);
    }
  }

  // Iniciar listeners en tiempo real
  startListening() {
    if (this.isListening) {
      console.log('⚠️ Ya está escuchando, evitando duplicados');
      return;
    }

    console.log('🚀 Iniciando listeners de notificaciones...');
    this.isListening = true;
    
    // Limpiar listeners existentes primero
    this.cleanup();
    
    // Pequeño delay para asegurar que los listeners anteriores se cierren
    setTimeout(() => {
      if (this.isListening) {
        // Listener para usuarios
        this.subscribeToUsers();
        
        // Listener para profesionales
        this.subscribeToProfessionals();

        // Si el usuario está logueado, pedir permiso de push y escuchar foreground messages
        this.setupPushNotifications();
      }
    }, 100);
  }

  // Configurar notificaciones push (FCM)
  async setupPushNotifications() {
    if (!messaging) return;
    
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const token = await getToken(messaging, { 
          // Reemplaza con tu VAPID key si la tenés configurada en Firebase Console, de lo contrario funcionará con la config por defecto en algunos entornos.
          // vapidKey: 'TU_VAPID_KEY_AQUI'
        });
        
        if (token && auth.currentUser) {
          console.log('✅ FCM Token obtenido. Guardando en perfil...', token);
          
          // Determine collection based on some logic or check both.
          // For safety we can try to update both if we don't know the exact role here.
          const userId = auth.currentUser.uid;
          
          try {
            await updateDoc(doc(db, 'users', userId), {
              fcmTokens: arrayUnion(token)
            });
          } catch (e) {
            // Might be a professional
            try {
              await updateDoc(doc(db, 'professionals', userId), {
                fcmTokens: arrayUnion(token)
              });
            } catch (err) {
              console.log('User not found in users or professionals collection to save token.');
            }
          }
        }
        
        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          console.log('🔔 Foreground Push Notification received:', payload);
          // Optional: Add it to in-app notifications
          if (payload.notification) {
            this.addNotifications([{
              id: `push-${Date.now()}`,
              type: 'push_notification',
              data: {
                title: payload.notification.title,
                message: payload.notification.body
              },
              timestamp: new Date().toISOString(),
              isRead: false
            }]);
          }
        });
      }
    } catch (error) {
      console.log('❌ Error setting up push notifications:', error);
    }
  }

  // Limpiar listeners existentes
  cleanup() {
    if (this.listeners.size > 0) {
      console.log(`🔌 Limpiando ${this.listeners.size} listeners existentes...`);
      this.listeners.forEach((unsubscribe, key) => {
        try {
          console.log(`🔌 Limpiando listener: ${key}`);
          unsubscribe();
        } catch (error) {
          console.error(`❌ Error al limpiar listener ${key}:`, error);
        }
      });
      this.listeners.clear();
    }
  }

  // Suscribirse a cambios en usuarios
  subscribeToUsers() {
    console.log('👤 Configurando listener de usuarios...');
    
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        try {
          console.log('📊 Snapshot de usuarios:', {
            changes: snapshot.docChanges().length,
            totalDocs: snapshot.docs.length,
            timestamp: new Date().toLocaleTimeString()
          });

          // Procesar solo cambios de tipo "added" y filtrar por role
          const addedChanges = snapshot.docChanges().filter(change => 
            change.type === 'added' && change.doc.data()?.role === 'user'
          );
          
          if (addedChanges.length > 0) {
            console.log('👤 Nuevos usuarios detectados:', addedChanges.length);
            
            const newNotifications = addedChanges.map(change => {
              try {
                const data = change.doc.data();
                if (!data) return null;
                
                const notificationId = `user-${change.doc.id}`;
                
                // Verificar si ya fue leída o descartada
                if (this.readNotifications.has(notificationId) || this.dismissedNotifications.has(notificationId)) {
                  return null; // No agregar notificaciones ya leídas o descartadas
                }
                
                return {
                  id: notificationId,
                  type: 'new_user',
                  data: data,
                  timestamp: data.createdAt,
                  isRead: false
                };
              } catch (err) {
                console.error('❌ Error procesando cambio de usuario:', err);
                return null;
              }
            }).filter(n => n !== null);

            // Agregar solo notificaciones nuevas
            this.addNotifications(newNotifications);
          }
        } catch (error) {
          console.error('❌ Error procesando snapshot de usuarios:', error);
        }
      },
      (error) => {
        // Filtrar errores de extensiones del navegador
        if (
          error?.message?.includes('message channel closed') ||
          error?.message?.includes('asynchronous response') ||
          error?.message?.includes('Extension context invalidated')
        ) {
          return; // Ignorar errores de extensiones
        }
        console.error('❌ Error en listener de usuarios:', error);
      }
    );

    this.listeners.set('users', unsubscribe);
  }

  // Suscribirse a cambios en profesionales
  subscribeToProfessionals() {
    console.log('👨‍⚕️ Configurando listener de profesionales...');
    
    const professionalsQuery = query(
      collection(db, 'professionals'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(
      professionalsQuery,
      (snapshot) => {
        try {
          console.log('📊 Snapshot de profesionales:', {
            changes: snapshot.docChanges().length,
            totalDocs: snapshot.docs.length,
            timestamp: new Date().toLocaleTimeString()
          });

          // Procesar solo cambios de tipo "added" y filtrar por isVerified
          const addedChanges = snapshot.docChanges().filter(change => 
            change.type === 'added' && change.doc.data()?.isVerified === false
          );
          
          if (addedChanges.length > 0) {
            console.log('👨‍⚕️ Nuevos profesionales detectados:', addedChanges.length);
            
            const newNotifications = addedChanges.map(change => {
              try {
                const data = change.doc.data();
                if (!data) return null;
                
                const notificationId = `professional-${change.doc.id}`;
                
                // Verificar si ya fue leída o descartada
                if (this.readNotifications.has(notificationId) || this.dismissedNotifications.has(notificationId)) {
                  return null; // No agregar notificaciones ya leídas o descartadas
                }
                
                return {
                  id: notificationId,
                  type: 'new_professional',
                  data: data,
                  timestamp: data.createdAt,
                  isRead: false
                };
              } catch (err) {
                console.error('❌ Error procesando cambio de profesional:', err);
                return null;
              }
            }).filter(n => n !== null);

            // Agregar solo notificaciones nuevas
            this.addNotifications(newNotifications);
          }
        } catch (error) {
          console.error('❌ Error procesando snapshot de profesionales:', error);
        }
      },
      (error) => {
        // Filtrar errores de extensiones del navegador
        if (
          error?.message?.includes('message channel closed') ||
          error?.message?.includes('asynchronous response') ||
          error?.message?.includes('Extension context invalidated')
        ) {
          return; // Ignorar errores de extensiones
        }
        console.error('❌ Error en listener de profesionales:', error);
      }
    );

    this.listeners.set('professionals', unsubscribe);
  }

  // Agregar notificaciones de manera segura
  addNotifications(newNotifications) {
    const existingIds = new Set(this.notifications.map(n => n.id));
    const uniqueNotifications = newNotifications
      .filter(n => !existingIds.has(n.id))
      .filter(n => !this.dismissedNotifications.has(n.id)); // No reintroducir las ya limpiadas
  
    if (uniqueNotifications.length > 0) {
      console.log('✅ Agregando', uniqueNotifications.length, 'notificaciones nuevas');
      
      this.notifications = [...uniqueNotifications, ...this.notifications];
      this.unreadCount = this.notifications.filter(n => !n.isRead).length;
      
      // Actualizar tiempo de procesamiento
      this.lastProcessedTime = new Date();
      this.savePersistedData();
      
      this.notifyCallbacks();
    } else {
      console.log('⚠️ No hay notificaciones nuevas para agregar');
    }
  }

  // Detener todos los listeners
  stopListening() {
    console.log('🛑 Deteniendo listeners de notificaciones...');
    this.isListening = false;
    this.cleanup();
  }

  // Reset completo del servicio
  reset() {
    console.log('🔄 Reseteando servicio de notificaciones...');
    this.stopListening();
    this.notifications = [];
    this.unreadCount = 0;
    this.readNotifications.clear();
    this.lastProcessedTime = null;
    this.savePersistedData();
    this.notifyCallbacks();
  }

  // Obtener notificaciones actuales
  getNotifications() {
    return this.notifications;
  }

  // Obtener contador de no leídas
  getUnreadCount() {
    return this.unreadCount;
  }

  // Marcar notificación como leída
  markAsRead(notificationId) {
    this.notifications = this.notifications.map(notif => 
      notif.id === notificationId ? { ...notif, isRead: true } : notif
    );
    this.unreadCount = Math.max(0, this.unreadCount - 1);
    
    // Persistir el estado
    this.readNotifications.add(notificationId);
    this.savePersistedData();
    
    this.notifyCallbacks();
  }

  // Marcar todas como leídas
  markAllAsRead() {
    this.notifications = this.notifications.map(notif => ({ ...notif, isRead: true }));
    this.unreadCount = 0;
    
    // Persistir el estado de todas las notificaciones
    this.notifications.forEach(notif => {
      this.readNotifications.add(notif.id);
    });
    this.savePersistedData();
    
    this.notifyCallbacks();
  }

  // Limpiar todas las notificaciones
  clearAll() {
    // Marcar todas las actuales como descartadas para no volver a mostrarlas
    this.notifications.forEach(notif => {
      this.readNotifications.add(notif.id);
      this.dismissedNotifications.add(notif.id);
    });
    this.notifications = [];
    this.unreadCount = 0;
    this.lastProcessedTime = new Date();
    this.savePersistedData();
    this.notifyCallbacks();
  }

  // Suscribirse a cambios en el estado
  onStateChange(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  // Notificar a todos los callbacks
  notifyCallbacks() {
    this.callbacks.forEach(callback => {
      callback({
        notifications: this.notifications,
        unreadCount: this.unreadCount
      });
    });
  }

  // Obtener estado actual
  getState() {
    return {
      notifications: this.notifications,
      unreadCount: this.unreadCount
    };
  }
}

// Crear instancia singleton
const notificationService = new NotificationService();

export default notificationService;
