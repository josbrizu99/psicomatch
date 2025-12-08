import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChange, 
  getUserData,
  isAdmin,
  processGoogleUser
} from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      console.log('🔄 AuthStateChanged:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
      setCurrentUser(user);
      
      if (user) {
        try {
          // Verificar si es un usuario de Google
          const isGoogleUser = user.providerData.some(provider => provider.providerId === 'google.com');
          
          if (isGoogleUser) {
            console.log('🔄 Usuario de Google detectado, procesando...');
            // Procesar usuario de Google (crear o actualizar en Firestore)
            await processGoogleUser(user);
          }
          
          // Obtener datos del usuario desde Firestore
          console.log('🔄 Obteniendo datos del usuario desde Firestore...');
          const userDataResult = await getUserData(user.uid);
          
          if (userDataResult.success) {
            console.log('📊 Datos del usuario obtenidos:', {
              name: userDataResult.data.name,
              email: userDataResult.data.email,
              photoURL: userDataResult.data.photoURL,
              role: userDataResult.data.role
            });
            
            setUserData(userDataResult.data);
            
            // Verificar si es administrador
            const adminCheck = await isAdmin(user.uid);
            setIsUserAdmin(adminCheck);
            
            console.log('✅ Usuario procesado correctamente:', {
              uid: user.uid,
              email: user.email,
              isAdmin: adminCheck,
              hasUserData: !!userDataResult.data,
              photoURL: userDataResult.data.photoURL
            });
          } else {
            console.log('⚠️ No se pudieron obtener datos del usuario:', userDataResult.error);
          }
        } catch (error) {
          console.error('❌ Error al procesar usuario autenticado:', error);
        }
      } else {
        setUserData(null);
        setIsUserAdmin(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const refreshUserData = async () => {
    if (!currentUser) return;
    
    try {
      console.log('🔄 Refrescando datos del usuario...');
      const userDataResult = await getUserData(currentUser.uid);
      
      if (userDataResult.success) {
        console.log('✅ Datos del usuario actualizados:', {
          name: userDataResult.data.name,
          email: userDataResult.data.email,
          testsCompleted: userDataResult.data.testsCompleted,
          matchedProfessional: userDataResult.data.matchedProfessional
        });
        setUserData(userDataResult.data);
      } else {
        console.error('❌ Error al refrescar datos del usuario:', userDataResult.error);
      }
    } catch (error) {
      console.error('❌ Error al refrescar datos del usuario:', error);
    }
  };

  const value = {
    currentUser,
    userData,
    loading,
    isUserAdmin,
    setUserData,
    refreshUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

