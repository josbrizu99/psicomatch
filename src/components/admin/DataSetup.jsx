import React, { useState } from 'react';
import { populateSampleData } from '../../utils/sampleData';
import { createAdminUser } from '../../utils/createAdmin';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const DataSetup = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Verificar conexión a Firestore
  const checkConnection = async () => {
    try {
      setConnectionStatus('checking');
      const testQuery = query(collection(db, 'users'), limit(1));
      await getDocs(testQuery);
      setConnectionStatus('connected');
      setMessage('✅ Conexión a Firestore establecida correctamente');
    } catch (error) {
      setConnectionStatus('error');
      setError(`❌ Error de conexión: ${error.message}`);
    }
  };

  // Poblar datos de ejemplo
  const handlePopulateData = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const result = await populateSampleData();
      if (result.success) {
        setMessage('✅ Datos de ejemplo cargados exitosamente');
      } else {
        setError(`❌ Error al cargar datos: ${result.error}`);
      }
    } catch (error) {
      setError(`❌ Error inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Crear usuario administrador
  const handleCreateAdmin = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const result = await createAdminUser();
      if (result.success) {
        setMessage('✅ Usuario administrador creado exitosamente');
      } else {
        setError(`❌ Error al crear administrador: ${result.error}`);
      }
    } catch (error) {
      setError(`❌ Error inesperado: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Verificar datos existentes
  const checkExistingData = async () => {
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const collections = ['users', 'professionals', 'initialTest', 'evaluationTest', 'userResults'];
      const results = {};

      for (const collectionName of collections) {
        try {
          const querySnapshot = await getDocs(collection(db, collectionName));
          results[collectionName] = querySnapshot.docs.length;
        } catch (error) {
          results[collectionName] = `Error: ${error.message}`;
        }
      }

      const summary = Object.entries(results)
        .map(([collection, count]) => `${collection}: ${count}`)
        .join(', ');

      setMessage(`📊 Datos existentes: ${summary}`);
    } catch (error) {
      setError(`❌ Error al verificar datos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de Datos</h1>
        <p className="text-gray-600">Configura los datos iniciales de la aplicación</p>
      </div>

      {/* Estado de conexión */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">🔗 Estado de Conexión</h2>
        
        <div className="flex items-center space-x-4 mb-4">
          <div className={`w-3 h-3 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' :
            connectionStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
          }`}></div>
          <span className="text-sm text-gray-600">
            {connectionStatus === 'connected' ? 'Conectado a Firestore' :
             connectionStatus === 'error' ? 'Error de conexión' : 'Verificando conexión...'}
          </span>
        </div>

        <button
          onClick={checkConnection}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🔄 Verificar Conexión
        </button>
      </div>

      {/* Verificar datos existentes */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">📊 Verificar Datos Existentes</h2>
        <p className="text-sm text-gray-600 mb-4">
          Revisa qué datos ya existen en las colecciones de Firestore
        </p>
        
        <button
          onClick={checkExistingData}
          disabled={loading}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:bg-gray-400"
        >
          🔍 Verificar Datos
        </button>
      </div>

      {/* Poblar datos de ejemplo */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">📝 Poblar Datos de Ejemplo</h2>
        <p className="text-sm text-gray-600 mb-4">
          Carga datos de ejemplo para probar la aplicación. Esto incluye:
        </p>
        <ul className="text-sm text-gray-600 mb-4 list-disc list-inside space-y-1">
          <li>Tests iniciales (preguntas de derivación)</li>
          <li>Tests de evaluación (ansiedad, depresión, estrés, etc.)</li>
          <li>Profesionales de ejemplo</li>
          <li>Datos de muestra para pruebas</li>
        </ul>
        
        <button
          onClick={handlePopulateData}
          disabled={loading || connectionStatus !== 'connected'}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
        >
          {loading ? '🔄 Cargando...' : '📝 Cargar Datos de Ejemplo'}
        </button>
      </div>

      {/* Crear usuario administrador */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">👤 Crear Usuario Administrador</h2>
        <p className="text-sm text-gray-600 mb-4">
          Crea un usuario administrador con las siguientes credenciales:
        </p>
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <p className="text-sm font-medium">Email: admin@psicomatch.com</p>
          <p className="text-sm font-medium">Contraseña: Admin123!</p>
          <p className="text-sm text-gray-600">Nombre: Administrador</p>
        </div>
        
        <button
          onClick={handleCreateAdmin}
          disabled={loading || connectionStatus !== 'connected'}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400"
        >
          {loading ? '🔄 Creando...' : '👤 Crear Administrador'}
        </button>
      </div>

      {/* Mensajes de estado */}
      {message && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{message}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Información adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">💡 Información Importante</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Asegúrate de que las reglas de Firestore permitan lectura y escritura</li>
          <li>• Verifica que las colecciones estén creadas en Firebase Console</li>
          <li>• Los datos de ejemplo se pueden cargar múltiples veces sin problemas</li>
          <li>• Después de cargar los datos, actualiza el dashboard para ver los cambios</li>
        </ul>
      </div>
    </div>
  );
};

export default DataSetup;
