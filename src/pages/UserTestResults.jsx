import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserTestHistory } from '../services/userTestResultsService';
import { getEvaluationTests } from '../services/evaluationTestService';

const UserTestResults = () => {
  const { currentUser, userData } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [testDetails, setTestDetails] = useState({});

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    window.scrollTo(0, 0);
    loadUserResults();
  }, [currentUser, navigate]);

  const loadUserResults = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Obtener historial de tests del usuario
      const resultsResponse = await getUserTestHistory(currentUser.uid);
      
      if (resultsResponse.success && resultsResponse.results.length > 0) {
        setTestResults(resultsResponse.results);
        
        // Obtener detalles de los tests para mostrar información adicional
        const testsResponse = await getEvaluationTests();
        if (testsResponse.success) {
          const testsMap = {};
          testsResponse.tests.forEach(test => {
            testsMap[test.id] = test;
          });
          setTestDetails(testsMap);
        }
      } else {
        setError('No tienes resultados de evaluaciones disponibles');
      }
    } catch (error) {
      console.error('Error al cargar resultados:', error);
      setError('Error al cargar tus resultados');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Fecha no disponible';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Fecha no disponible';
    }
  };

  const getScoreLevel = (score, maxScore) => {
    if (!maxScore || maxScore === 0) return 'N/A';
    
    const percentage = (score / maxScore) * 100;
    
    if (percentage >= 80) return { level: 'Alto', color: 'text-red-600', bg: 'bg-red-50' };
    if (percentage >= 60) return { level: 'Moderado', color: 'text-orange-600', bg: 'bg-orange-50' };
    if (percentage >= 40) return { level: 'Leve', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    return { level: 'Mínimo', color: 'text-green-600', bg: 'bg-green-50' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tus resultados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Sin Resultados</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/evaluacion-emocional')}
              className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Realizar Evaluación
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mis Resultados de Evaluación</h1>
              <p className="text-gray-600 mt-1">Revisa tu historial de evaluaciones emocionales</p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al inicio
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {testResults.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay resultados disponibles</h3>
            <p className="text-gray-600 mb-6">Aún no has completado ninguna evaluación emocional.</p>
            <button
              onClick={() => navigate('/evaluacion-emocional')}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
            >
              Realizar Primera Evaluación
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {testResults.map((result, index) => {
              const testInfo = testDetails[result.testId];
              const scoreInfo = getScoreLevel(result.score, testInfo?.questions?.reduce((total, q) => {
                const maxScore = Math.max(...q.options.map(opt => opt.score || 0));
                return total + maxScore;
              }, 0));
              
              return (
                <div key={result.id || index} className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {testInfo?.title || result.testId}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        Completado el {formatDate(result.createdAt)}
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-600">
                      Completado
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Estado</h4>
                      <p className="text-green-600 font-medium">Completado</p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Información</h4>
                      <p className="text-gray-600">Los resultados son privados y solo los verá tu profesional asignado</p>
                    </div>
                  </div>

                  {/* Las respuestas detalladas son privadas y solo las verá el profesional */}
                  <div className="border-t pt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <p className="text-blue-800 text-sm">
                        <strong>Información privada:</strong> Las respuestas detalladas de tu evaluación son confidenciales y solo estarán disponibles para tu profesional asignado.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Botón para nueva evaluación */}
        {testResults.length > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={() => navigate('/evaluacion-emocional')}
              className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Realizar Nueva Evaluación
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserTestResults;
