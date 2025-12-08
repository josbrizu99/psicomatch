import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { useAuth } from '../../contexts/AuthContext';

const AdminRoleFixer = () => {
  const { currentUser, userData } = useAuth();
  const [userDoc, setUserDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (currentUser) {
      loadUserDocument();
    }
  }, [currentUser]);

  const loadUserDocument = async () => {
    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        setUserDoc({ id: userDocSnap.id, ...userDocSnap.data() });
      } else {
        setMessage('❌ No se encontró el documento del usuario en Firestore');
      }
    } catch (error) {
      console.error('Error al cargar documento del usuario:', error);
      setMessage('❌ Error al cargar documento del usuario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fixAdminRole = async () => {
    if (!currentUser || !userDoc) return;

    try {
      setLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      
      await updateDoc(userDocRef, {
        role: 'admin',
        updatedAt: new Date(),
        updatedBy: currentUser.uid
      });

      setMessage('✅ Rol de administrador establecido correctamente. Recarga la página.');
      
      // Recargar la página después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      setMessage('❌ Error al actualizar rol: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">🔧 Admin Role Fixer</h3>
        <p className="text-yellow-700">No hay usuario autenticado</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-blue-800 mb-4">🔧 Admin Role Fixer</h3>
      
      <div className="space-y-4">
        <div>
          <h4 className="font-medium text-blue-700 mb-2">Información del Usuario:</h4>
          <div className="bg-white p-3 rounded border text-sm space-y-1">
            <div><strong>UID:</strong> {currentUser.uid}</div>
            <div><strong>Email:</strong> {currentUser.email}</div>
            <div><strong>Rol actual:</strong> {userDoc?.role || 'No definido'}</div>
            <div><strong>Nombre:</strong> {userDoc?.name || 'No definido'}</div>
            <div><strong>Estado:</strong> {userDoc?.status || 'No definido'}</div>
          </div>
        </div>

        {userDoc && (
          <div>
            <h4 className="font-medium text-blue-700 mb-2">Acciones:</h4>
            <div className="space-y-2">
              {userDoc.role !== 'admin' && (
                <button
                  onClick={fixAdminRole}
                  disabled={loading}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Procesando...' : '🔧 Establecer como Administrador'}
                </button>
              )}
              
              {userDoc.role === 'admin' && (
                <div className="bg-green-100 text-green-800 p-3 rounded">
                  ✅ El usuario ya tiene rol de administrador
                </div>
              )}
            </div>
          </div>
        )}

        <button
          onClick={loadUserDocument}
          disabled={loading}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Cargando...' : '🔄 Recargar Información'}
        </button>

        {message && (
          <div className={`p-3 rounded ${
            message.includes('✅') ? 'bg-green-100 text-green-800' : 
            message.includes('❌') ? 'bg-red-100 text-red-800' : 
            'bg-blue-100 text-blue-800'
          }`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRoleFixer;



