import React, { useState } from 'react';
import { collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

const FirestoreRulesFixer = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResults, setTestResults] = useState({});

  const testProfessionalsCollection = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    setTestResults({});

    try {
      console.log('🧪 Probando acceso a la colección professionals...');
      
      // Intentar leer la colección professionals
      const professionalsRef = collection(db, 'professionals');
      const q = query(professionalsRef, limit(1));
      const querySnapshot = await getDocs(q);
      
      setTestResults({
        canRead: true,
        documentCount: querySnapshot.docs.length,
        error: null
      });
      
      setSuccess('✅ Acceso a la colección professionals exitoso');
      console.log('✅ Test exitoso:', querySnapshot.docs.length, 'documentos encontrados');
      
    } catch (error) {
      console.error('❌ Error en test:', error);
      setTestResults({
        canRead: false,
        documentCount: 0,
        error: error.message
      });
      setError(`❌ Error de permisos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testProfessionalQuery = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🧪 Probando consulta específica de profesional...');
      
      // Intentar hacer una consulta como la que hace el login
      const professionalsRef = collection(db, 'professionals');
      const q = query(
        professionalsRef,
        where('email', '==', 'test@example.com')
      );
      const querySnapshot = await getDocs(q);
      
      setSuccess('✅ Consulta de profesional exitosa');
      console.log('✅ Query test exitoso');
      
    } catch (error) {
      console.error('❌ Error en query test:', error);
      setError(`❌ Error en consulta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getRecommendedRules = () => {
    return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas para usuarios normales
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Reglas para profesionales - PERMITE LECTURA PÚBLICA PARA LOGIN
    match /professionals/{professionalId} {
      // Permitir lectura a cualquier usuario autenticado para verificar credenciales
      allow read: if request.auth != null;
      // Solo permitir escritura al propio profesional o administradores
      allow write: if request.auth != null && (
        request.auth.uid == professionalId || 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
    }
    
    // Reglas para tests
    match /initialTest/{testId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /evaluationTest/{testId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Reglas para resultados de usuarios
    match /userResults/{resultId} {
      allow read, write: if request.auth != null && 
        resource.data.userId == request.auth.uid;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}`;
  };

  const getAlternativeRules = () => {
    return `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Reglas más permisivas para desarrollo
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Corrector de Reglas Firestore</h1>
        <p className="text-gray-600">Diagnostica y corrige problemas de permisos en Firestore</p>
      </div>

      {/* Test de acceso */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">🧪 Pruebas de Acceso</h2>
        
        <div className="space-y-4">
          <button
            onClick={testProfessionalsCollection}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Probando...' : 'Probar Acceso a Professionals'}
          </button>
          
          <button
            onClick={testProfessionalQuery}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
          >
            {loading ? 'Probando...' : 'Probar Consulta de Profesional'}
          </button>
        </div>

        {/* Resultados del test */}
        {Object.keys(testResults).length > 0 && (
          <div className={`mt-4 p-4 rounded-lg ${
            testResults.canRead ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className={`font-medium ${
              testResults.canRead ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResults.canRead ? '✅ Acceso Permitido' : '❌ Acceso Denegado'}
            </h3>
            <div className={`text-sm mt-2 ${
              testResults.canRead ? 'text-green-700' : 'text-red-700'
            }`}>
              <p>Documentos encontrados: {testResults.documentCount}</p>
              {testResults.error && <p>Error: {testResults.error}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Reglas recomendadas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">📋 Reglas Recomendadas</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-md font-medium text-gray-800 mb-2">Reglas Seguras (Recomendadas)</h3>
            <p className="text-sm text-gray-600 mb-3">
              Estas reglas permiten que los profesionales lean sus datos para el login, pero mantienen la seguridad.
            </p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <pre className="text-xs text-gray-800 overflow-x-auto">
                <code>{getRecommendedRules()}</code>
              </pre>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Copia estas reglas y pégalas en la consola de Firebase → Firestore → Rules
            </p>
          </div>

          <div>
            <h3 className="text-md font-medium text-gray-800 mb-2">Reglas de Desarrollo (Temporales)</h3>
            <p className="text-sm text-gray-600 mb-3">
              ⚠️ Solo para desarrollo - NO usar en producción
            </p>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <pre className="text-xs text-gray-800 overflow-x-auto">
                <code>{getAlternativeRules()}</code>
              </pre>
            </div>
            <p className="text-xs text-yellow-600 mt-2">
              ⚠️ Estas reglas son muy permisivas - solo para pruebas
            </p>
          </div>
        </div>
      </div>

      {/* Instrucciones paso a paso */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-blue-900 mb-2">📝 Cómo Aplicar las Reglas</h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li>Ve a la <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Consola de Firebase</a></li>
          <li>Selecciona tu proyecto</li>
          <li>Ve a "Firestore Database" → "Rules"</li>
          <li>Reemplaza las reglas actuales con las reglas recomendadas</li>
          <li>Haz clic en "Publish"</li>
          <li>Vuelve aquí y prueba el acceso nuevamente</li>
        </ol>
      </div>

      {/* Mensajes de estado */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{success}</p>
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-lg font-medium text-yellow-900 mb-2">⚠️ Información Importante</h3>
        <ul className="text-sm text-yellow-800 space-y-1">
          <li>• Las reglas de Firestore controlan quién puede leer y escribir datos</li>
          <li>• El error "Missing or insufficient permissions" significa que las reglas actuales no permiten el acceso</li>
          <li>• Después de cambiar las reglas, puede tomar unos minutos en aplicarse</li>
          <li>• Siempre prueba las reglas en un entorno de desarrollo primero</li>
          <li>• Las reglas recomendadas son seguras y permiten el login profesional</li>
        </ul>
      </div>
    </div>
  );
};

export default FirestoreRulesFixer;

