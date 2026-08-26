import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase/firebase';

const UserSessionProgress = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessionProgress, setSessionProgress] = useState([]);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    loadSessionProgress();
  }, [currentUser, navigate]);

  const loadSessionProgress = async () => {
    try {
      setLoading(true);
      
      // Cargar progreso de sesiones desde userTestResults
      const progressQuery = query(
        collection(db, 'userTestResults'),
        where('userId', '==', currentUser.uid),
        orderBy('completedAt', 'desc')
      );
      
      try {
        const progressSnapshot = await getDocs(progressQuery);
        const progressData = progressSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSessionProgress(progressData);
      } catch (error) {
        // Si falla el orderBy, intentar sin ordenar
        console.warn('⚠️ Error con orderBy, obteniendo sin ordenar...');
        const fallbackQuery = query(
          collection(db, 'userTestResults'),
          where('userId', '==', currentUser.uid)
        );
        const progressSnapshot = await getDocs(fallbackQuery);
        const progressData = progressSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Ordenar client-side por fecha
        progressData.sort((a, b) => {
          const dateA = a.completedAt?.toDate ? a.completedAt.toDate() : new Date(a.completedAt || 0);
          const dateB = b.completedAt?.toDate ? b.completedAt.toDate() : new Date(b.completedAt || 0);
          return dateB - dateA;
        });
        setSessionProgress(progressData);
      }
    } catch (error) {
      console.error('❌ Error al cargar progreso de sesiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const sessionTypeMap = {
    'consultation': 'Consulta',
    'evaluation': 'Evaluación',
    'follow-up': 'Seguimiento',
    'therapy': 'Terapia',
    'none': 'Sesión'
  };

  const getSessionTypeLabel = (type) => {
    return sessionTypeMap[type] || type || 'Sesión';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando progreso de sesiones...</p>
        </div>
      </div>
    );
  }

  const filteredProgress = sessionProgress.filter(progress => progress.sessionData);

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link 
              to="/user-dashboard" 
              className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Volver al inicio
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Progreso de Sesiones</h1>
            <p className="text-gray-600 mt-1">Historial completo de todas tus sesiones</p>
          </div>
        </div>

        {/* Progress List */}
        {filteredProgress.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No hay progreso de sesiones registrado</p>
            <p className="text-gray-400 text-sm mt-2">Las sesiones completadas aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProgress.map((progress) => {
              const sessionData = progress.sessionData || {};
              const completedAt = progress.completedAt?.toDate 
                ? progress.completedAt.toDate() 
                : new Date(progress.completedAt || new Date());
              
              return (
                <div key={progress.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {getSessionTypeLabel(sessionData.sessionType || progress.testType)}
                        </h3>
                        {progress.percentage !== undefined && (
                          <span className={`px-3 py-1 text-sm rounded-full ${
                            progress.percentage >= 80 
                              ? 'bg-green-100 text-green-700'
                              : progress.percentage >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {progress.percentage}% completado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Fecha de finalización:</span>{' '}
                        {completedAt.toLocaleDateString('es-ES', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {sessionData.duration && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Duración</p>
                        <p className="text-sm font-medium text-gray-900">{sessionData.duration} minutos</p>
                      </div>
                    )}
                    
                    {progress.score > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Calificación</p>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-5 h-5 ${star <= progress.score ? 'text-yellow-400' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="text-sm font-medium text-gray-700 ml-2">({progress.score}/5)</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {progress.percentage !== undefined && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-700">Progreso de la sesión</p>
                        <p className="text-sm text-gray-600">{progress.percentage}%</p>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${progress.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {sessionData.notes && sessionData.notes !== 'none' && sessionData.notes.trim() !== '' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-800 mb-2">Observaciones del Profesional:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{sessionData.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserSessionProgress;






