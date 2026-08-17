import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { getUserSessions, rateSession, rateProfessional } from '../services/userSessionsService';

const UserSessionHistory = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [ratingSession, setRatingSession] = useState(null);
  const [sessionRating, setSessionRating] = useState(0);
  const [professionalRating, setProfessionalRating] = useState(0);
  const [ratingSessionId, setRatingSessionId] = useState(null);
  const [ratingProfessional, setRatingProfessional] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    loadSessions();
  }, [currentUser, navigate]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const sessionsResult = await getUserSessions(currentUser.uid);
      if (sessionsResult.success) {
        setSessions(sessionsResult.sessions);
      }
    } catch (error) {
      console.error('Error al cargar sesiones:', error);
      toast.error('Error al cargar el historial de sesiones');
    } finally {
      setLoading(false);
    }
  };

  const handleRateSession = async () => {
    if (!ratingSession || !sessionRating || !ratingSessionId) return;

    try {
      const result = await rateSession(ratingSessionId, sessionRating, currentUser.uid);
      if (result.success) {
        toast.success('Sesión calificada exitosamente. El profesional ha sido notificado.');
        await loadSessions();
        setRatingSession(null);
        setSessionRating(0);
        setRatingSessionId(null);
      } else {
        toast.error(result.error || 'Error al calificar la sesión');
      }
    } catch (error) {
      console.error('Error al calificar sesión:', error);
      toast.error('Error al calificar la sesión');
    }
  };

  const handleRateProfessional = async () => {
    if (!ratingSession || !professionalRating || !ratingSessionId) return;

    try {
      const result = await rateProfessional(ratingSessionId, professionalRating, ratingSession.professionalId, currentUser.uid);
      if (result.success) {
        toast.success('Profesional calificado exitosamente. El profesional ha sido notificado.');
        await loadSessions();
        setRatingSession(null);
        setProfessionalRating(0);
        setRatingSessionId(null);
        setRatingProfessional(null);
      } else {
        toast.error(result.error || 'Error al calificar al profesional');
      }
    } catch (error) {
      console.error('Error al calificar profesional:', error);
      toast.error('Error al calificar al profesional');
    }
  };

  const sessionTypeMap = {
    'consultation': 'Consulta',
    'evaluation': 'Evaluación',
    'follow-up': 'Seguimiento',
    'therapy': 'Terapia'
  };

  const getSessionTypeLabel = (type) => {
    return sessionTypeMap[type] || type || 'Sesión';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando historial de sesiones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            to="/user-dashboard" 
            className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Historial de Sesiones con tu Profesional</h1>
          <p className="text-gray-600 mt-1">Todas tus sesiones y su estado</p>
        </div>

        {/* Sessions List */}
        {sessions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 text-lg">No hay sesiones registradas</p>
            <p className="text-gray-400 text-sm mt-2">Las sesiones con tu profesional aparecerán aquí</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => {
              const startTime = session.startTime?.toDate 
                ? session.startTime.toDate() 
                : (session.startTime?.seconds 
                    ? new Date(session.startTime.seconds * 1000) 
                    : new Date(session.startTime || new Date()));
              const endTime = session.endTime?.toDate 
                ? session.endTime.toDate() 
                : (session.endTime?.seconds 
                    ? new Date(session.endTime.seconds * 1000) 
                    : null);
              
              return (
                <div key={session.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {getSessionTypeLabel(session.sessionType)}
                        </h3>
                        <span className={`px-3 py-1 text-sm rounded-full ${
                          session.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : session.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {session.status === 'completed' 
                            ? 'Completada' 
                            : session.status === 'in_progress' 
                            ? 'En Progreso' 
                            : 'Activa'}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Fecha de inicio:</span>{' '}
                          {startTime.toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {endTime && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Fecha de finalización:</span>{' '}
                            {endTime.toLocaleDateString('es-ES', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      {session.duration ? (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Duración</p>
                          <p className="text-lg font-semibold text-gray-900">{session.duration} min</p>
                        </div>
                      ) : session.progress !== undefined ? (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <p className="text-xs text-gray-500 mb-1">Progreso</p>
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden mb-1">
                            <div 
                              className="h-full bg-blue-600 transition-all"
                              style={{ width: `${session.progress}%` }}
                            ></div>
                          </div>
                          <p className="text-sm font-medium text-gray-700">{session.progress}%</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  {session.notes && session.notes !== 'none' && session.notes.trim() !== '' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-800 mb-2">Observaciones del Profesional:</p>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{session.notes}</p>
                    </div>
                  )}
                  
                  {session.endReason && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        <strong>Motivo de finalización:</strong> {session.endReason}
                      </p>
                    </div>
                  )}

                  {/* Calificaciones: Sesión y Profesional */}
                  {session.status === 'completed' && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      {/* Calificación de la sesión */}
                      <div>
                        <p className="text-sm font-medium text-gray-800 mb-2">Califica esta sesión:</p>
                        {session.sessionRating && session.sessionRating > 0 ? (
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-5 h-5 ${star <= session.sessionRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-sm text-gray-600 ml-2">({session.sessionRating}/5)</span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-1 mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => {
                                    setRatingSession(session);
                                    setSessionRating(star);
                                    setRatingSessionId(session.id);
                                  }}
                                  className={`w-8 h-8 ${
                                    ratingSessionId === session.id && sessionRating >= star
                                      ? 'text-yellow-400'
                                      : 'text-gray-300 hover:text-yellow-300'
                                  } transition-colors`}
                                >
                                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                            {ratingSessionId === session.id && sessionRating > 0 && (
                              <button
                                onClick={handleRateSession}
                                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors"
                              >
                                Calificar Sesión
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Calificación del profesional */}
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-800 mb-2">Califica a tu profesional:</p>
                        {session.professionalRating && session.professionalRating > 0 ? (
                          <div className="flex items-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg
                                key={star}
                                className={`w-5 h-5 ${star <= session.professionalRating ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                            <span className="text-sm text-gray-600 ml-2">({session.professionalRating}/5)</span>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center space-x-1 mb-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => {
                                    setRatingSession(session);
                                    setProfessionalRating(star);
                                    setRatingSessionId(session.id);
                                  }}
                                  className={`w-8 h-8 ${
                                    ratingSessionId === session.id && professionalRating >= star
                                      ? 'text-yellow-400'
                                      : 'text-gray-300 hover:text-yellow-300'
                                  } transition-colors`}
                                >
                                  <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                </button>
                              ))}
                            </div>
                            {ratingSessionId === session.id && professionalRating > 0 && (
                              <button
                                onClick={handleRateProfessional}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
                              >
                                Calificar Profesional
                              </button>
                            )}
                          </div>
                        )}
                      </div>
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

export default UserSessionHistory;

