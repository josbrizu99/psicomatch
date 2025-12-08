import React, { createContext, useContext, useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { 
  onProfessionalAuthStateChange, 
  getProfessionalData,
  isProfessional 
} from '../services/professionalAuthService';

const ProfessionalAuthContext = createContext();

export const useProfessionalAuth = () => {
  const context = useContext(ProfessionalAuthContext);
  if (!context) {
    throw new Error('useProfessionalAuth debe ser usado dentro de un ProfessionalAuthProvider');
  }
  return context;
};

export const ProfessionalAuthProvider = ({ children }) => {
  const [currentProfessional, setCurrentProfessional] = useState(null);
  const [professionalData, setProfessionalData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUserProfessional, setIsUserProfessional] = useState(false);

  useEffect(() => {
    const unsubscribe = onProfessionalAuthStateChange(async (user) => {
      setCurrentProfessional(user);
      
      if (user) {
        try {
          console.log('🔄 Verificando datos del profesional:', user.uid);
          // Obtener datos del profesional desde Firestore
          const professionalDataResult = await getProfessionalData(user.uid);
          if (professionalDataResult.success) {
            const data = professionalDataResult.data;
            console.log('📊 Datos del profesional obtenidos:', {
              status: data.status,
              isVerified: data.isVerified,
              email: data.email
            });
            
            setProfessionalData(data);
            
            // Verificar si es profesional activo y verificado
            const isActive = data.status === 'active';
            const isVerified = data.isVerified === true;
            
            console.log('🔍 Verificaciones:', {
              isActive,
              isVerified,
              canLogin: isActive && isVerified
            });
            
            if (!isActive) {
              console.log('❌ Profesional inactivo, no permitiendo acceso...');
              setProfessionalData(null);
              setIsUserProfessional(false);
              setLoading(false);
              return;
            }
            
            if (!isVerified) {
              console.log('❌ Profesional no verificado, no permitiendo acceso...');
              setProfessionalData(null);
              setIsUserProfessional(false);
              setLoading(false);
              return;
            }
            
            // Solo establecer como profesional si está activo y verificado
            setIsUserProfessional(isActive && isVerified);
          } else {
            console.log('❌ No se encontraron datos del profesional');
            setProfessionalData(null);
            setIsUserProfessional(false);
          }
        } catch (error) {
          console.error('❌ Error al obtener datos del profesional:', error);
          setProfessionalData(null);
          setIsUserProfessional(false);
        }
      } else {
        setProfessionalData(null);
        setIsUserProfessional(false);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentProfessional,
    professionalData,
    loading,
    isUserProfessional,
    setProfessionalData
  };

  return (
    <ProfessionalAuthContext.Provider value={value}>
      {children}
    </ProfessionalAuthContext.Provider>
  );
};

