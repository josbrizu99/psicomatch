import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  getActiveTestsBySpecialty, 
  calculateTestScore, 
  interpretTestResult 
} from '../services/evaluationTestService';

const EvaluationTest = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tests, setTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentStep, setCurrentStep] = useState('categorization'); // 'categorization', 'test', 'results'
  const [categorizationAnswers, setCategorizationAnswers] = useState({});
  const [testAnswers, setTestAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    loadAvailableTests();
  }, [currentUser, navigate]);

  const loadAvailableTests = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Por ahora cargamos todos los tests activos
      // En el futuro, esto se basará en las respuestas de categorización
      const result = await getActiveTestsBySpecialty('Ansiedad'); // Temporal
      
      if (result.success) {
        setTests(result.tests);
      } else {
        setError('No hay tests de evaluación disponibles');
      }
    } catch (error) {
      console.error('Error al cargar tests:', error);
      setError('Error al cargar los tests de evaluación');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorizationAnswer = (questionId, answer) => {
    setCategorizationAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleTestAnswer = (questionId, answer) => {
    setTestAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const startTest = (test) => {
    setSelectedTest(test);
    setCurrentStep('categorization');
    setCurrentQuestionIndex(0);
    setCategorizationAnswers({});
    setTestAnswers({});
  };

  const nextCategorizationQuestion = () => {
    if (currentQuestionIndex < selectedTest.categorizationQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Determinar qué test mostrar basado en las respuestas de categorización
      // Por ahora, simplemente procedemos al test seleccionado
      setCurrentStep('test');
      setCurrentQuestionIndex(0);
    }
  };

  const prevCategorizationQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const nextTestQuestion = () => {
    if (currentQuestionIndex < selectedTest.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Calcular resultados
      // const score = calculateTestScore(selectedTest, testAnswers);
      // const interpretation = interpretTestResult(selectedTest, score);
      
      setCurrentStep('results');
      // Aquí podrías guardar los resultados en Firestore
    }
  };

  const prevTestQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const restartTest = () => {
    setSelectedTest(null);
    setCurrentStep('categorization');
    setCurrentQuestionIndex(0);
    setCategorizationAnswers({});
    setTestAnswers({});
  };

  const goToDashboard = async () => {
    try {
      // Marcar que el usuario ha completado la evaluación
      if (currentUser) {
        const { updateDoc, doc, serverTimestamp, increment } = await import('firebase/firestore');
        const { db } = await import('../firebase/firebase');
        
        await updateDoc(doc(db, 'users', currentUser.uid), {
          testProgress: 'completed',
          testsCompleted: increment(1),
          lastTestCompletedAt: serverTimestamp(),
          evaluationsCompleted: increment(1),
          status: 'evaluated',
          matchedProfessional: 'searching',
          updatedAt: serverTimestamp()
        });
      }
      
      // Redirigir al dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error al actualizar progreso del test:', error);
      // Redirigir de todas formas
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando tests de evaluación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
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
    );
  }

  // Selección de test
  if (!selectedTest) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Tests de Evaluación Psicológica
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Realiza nuestros tests validados científicamente para obtener una evaluación profesional 
              y encontrar el profesional más adecuado para tus necesidades.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tests.map((test) => (
              <div key={test.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{test.title}</h3>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                    Activo
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">{test.description}</p>
                
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Tiempo estimado: {test.estimatedTime} minutos
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {test.questions.length} preguntas
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {test.specialties.join(', ')}
                  </div>
                </div>

                <button
                  onClick={() => startTest(test)}
                  className="w-full bg-gradient-to-r from-primary-500 to-secondary-500 text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg transition-all duration-200"
                >
                  Comenzar Test
                </button>
              </div>
            ))}
          </div>

          {tests.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay tests disponibles</h3>
              <p className="text-gray-600 mb-4">Por el momento no hay tests de evaluación disponibles.</p>
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
          )}
        </div>
      </div>
    );
  }

  // Preguntas de categorización
  if (currentStep === 'categorization') {
    const question = selectedTest.categorizationQuestions[currentQuestionIndex];
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">{selectedTest.title}</h1>
                <button
                  onClick={restartTest}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Pregunta de categorización {currentQuestionIndex + 1} de {selectedTest.categorizationQuestions.length}</span>
                <span>{selectedTest.description}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / selectedTest.categorizationQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Pregunta */}
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6">{question.text}</h2>
              
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <label key={option.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name={`categorization-${question.id}`}
                      value={option.id}
                      checked={categorizationAnswers[question.id] === option.id}
                      onChange={() => handleCategorizationAnswer(question.id, option.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-3 text-gray-900">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navegación */}
            <div className="flex justify-between">
              <button
                onClick={prevCategorizationQuestion}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              <button
                onClick={nextCategorizationQuestion}
                disabled={!categorizationAnswers[question.id]}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestionIndex < selectedTest.categorizationQuestions.length - 1 ? 'Siguiente' : 'Continuar al Test'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Test principal
  if (currentStep === 'test') {
    const question = selectedTest.questions[currentQuestionIndex];
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">{selectedTest.title}</h1>
                <button
                  onClick={restartTest}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Pregunta {currentQuestionIndex + 1} de {selectedTest.questions.length}</span>
                <span>Tiempo estimado: {selectedTest.estimatedTime} min</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / selectedTest.questions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Instrucciones */}
            {selectedTest.instructions && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">{selectedTest.instructions}</p>
              </div>
            )}

            {/* Pregunta */}
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6">
                {question.text}
                {question.required && <span className="text-red-500 ml-1">*</span>}
              </h2>
              
              <div className="space-y-3">
                {question.options.map((option, index) => (
                  <label key={option.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option.id}
                      checked={testAnswers[question.id] === option.id}
                      onChange={() => handleTestAnswer(question.id, option.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-3 text-gray-900">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Navegación */}
            <div className="flex justify-between">
              <button
                onClick={prevTestQuestion}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              
              <button
                onClick={nextTestQuestion}
                disabled={question.required && !testAnswers[question.id]}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestionIndex < selectedTest.questions.length - 1 ? 'Siguiente' : 'Ver Resultados'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Resultados
  if (currentStep === 'results') {
    const score = calculateTestScore(selectedTest, testAnswers);
    const interpretation = interpretTestResult(selectedTest, score);
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">¡Test Completado!</h1>
              <p className="text-gray-600">Aquí están tus resultados del {selectedTest.title}</p>
            </div>

            {/* Puntuación */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tu Puntuación</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600">{score.totalScore}</div>
                  <div className="text-sm text-gray-600">Puntuación Total</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary-600">{score.maxScore}</div>
                  <div className="text-sm text-gray-600">Puntuación Máxima</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{score.percentage}%</div>
                  <div className="text-sm text-gray-600">Porcentaje</div>
                </div>
              </div>
            </div>

            {/* Interpretación */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
              <h2 className="text-xl font-bold text-blue-900 mb-4">Interpretación</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-blue-900">Nivel: {interpretation.level}</h3>
                  <p className="text-blue-800 mt-1">{interpretation.description}</p>
                </div>
                <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Recomendación:</h4>
                  <p className="text-blue-800">{interpretation.recommendation}</p>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={goToDashboard}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Buscar Profesionales
              </button>
              <button
                onClick={restartTest}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Realizar Otro Test
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default EvaluationTest;
