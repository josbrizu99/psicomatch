import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import {
  getActiveEvaluationTests,
  determineTestFromCategorization,
  calculateTestScore,
  interpretTestResults,
  getTestSpecialties
} from '../services/evaluationTestService';
import { findMatchingProfessional } from '../services/professionalMatchingService';
import { saveUserTestResults } from '../services/userTestResultsService';
import { createUserSession, endUserSession } from '../services/userSessionsService';
import bgDesktop from '../img/error404desktop.jpg';
import bgMobile from '../img/error404mobile.jpg';

const EvaluacionEmocionalPage = () => {
  console.log('🎯 EvaluacionEmocionalPage - Componente cargándose');
  const { currentUser, userData, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState('welcome'); // 'welcome', 'categorization', 'test', 'searching', 'completed'
  const [availableTests, setAvailableTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [categorizationAnswers, setCategorizationAnswers] = useState({});
  const [testAnswers, setTestAnswers] = useState({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [allCategorizationQuestions, setAllCategorizationQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showSuicidalAlert, setShowSuicidalAlert] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [assignedProfessional, setAssignedProfessional] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    console.log('🔄 useEffect ejecutándose - cargando tests disponibles...');
    loadAvailableTests();
  }, [currentUser, navigate]);

  // Log del estado cuando cambia
  useEffect(() => {
    console.log('🔄 Estado actualizado:', {
      currentStep,
      availableTestsLength: availableTests.length,
      allCategorizationQuestionsLength: allCategorizationQuestions.length,
      loading
    });
  }, [currentStep, availableTests.length, allCategorizationQuestions.length, loading]);

  const loadAvailableTests = async () => {
    try {
      console.log('🔄 Cargando tests disponibles...');
      setLoading(true);
      const result = await getActiveEvaluationTests();

      console.log('📊 Resultado de carga de tests:', result);

      if (result.success) {
        setAvailableTests(result.tests);

        // Recopilar todas las preguntas de categorización de todos los tests
        const allQuestions = [];
        result.tests.forEach(test => {
          console.log('🔍 Procesando test:', {
            id: test.id,
            title: test.title,
            hasCategorizationQuestions: !!test.categorizationQuestions,
            categorizationQuestionsCount: test.categorizationQuestions?.length || 0
          });

          if (test.categorizationQuestions && test.categorizationQuestions.length > 0) {
            test.categorizationQuestions.forEach(question => {
              console.log('❓ Agregando pregunta de categorización:', question.text);
              // Agregar referencia al test de origen para poder determinar cuál usar después
              allQuestions.push({
                ...question,
                sourceTestId: test.id,
                sourceTestTitle: test.title
              });
            });
          } else {
            console.log('⚠️ Test sin preguntas de categorización:', test.title);
          }
        });

        // Eliminar preguntas duplicadas (mismo texto)
        const uniqueQuestions = allQuestions.filter((question, index, self) =>
          index === self.findIndex(q => q.text === question.text)
        );

        console.log('📊 Preguntas antes de eliminar duplicados:', allQuestions.length);
        console.log('📊 Preguntas después de eliminar duplicados:', uniqueQuestions.length);
        console.log('❓ Preguntas únicas:', uniqueQuestions.map(q => ({ text: q.text, sourceTest: q.sourceTestTitle })));

        setAllCategorizationQuestions(uniqueQuestions);

        console.log('✅ Tests cargados exitosamente:', result.tests.length);
        console.log('📋 Tests disponibles:', result.tests.map(t => ({ id: t.id, title: t.title, state: t.state })));
        console.log('❓ Preguntas de categorización recopiladas:', uniqueQuestions.length);
      } else {
        console.error('❌ Error al cargar tests:', result.error);
        console.error('🔍 Debug info:', result.debug);
      }
    } catch (error) {
      console.error('❌ Error al cargar tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEvaluation = async () => {
    console.log('🎯 FUNCIÓN handleStartEvaluation EJECUTÁNDOSE');
    console.log('🔄 Iniciando evaluación...');
    console.log('📊 Tests disponibles:', availableTests.length);
    console.log('❓ Preguntas de categorización:', allCategorizationQuestions.length);
    console.log('👤 Usuario:', currentUser?.uid);
    console.log('🔍 Profesional asignado:', userData?.matchedProfessional);

    // Si el usuario ya tiene un profesional asignado, mostrar modal de confirmación
    if (userData?.matchedProfessional &&
      userData.matchedProfessional !== 'null' &&
      userData.matchedProfessional !== 'searching') {
      console.log('⚠️ Usuario tiene profesional, mostrando modal de confirmación');
      setShowConfirmModal(true);
      return;
    }

    console.log('✅ Procediendo con la evaluación...');

    // Crear sesión de evaluación
    const sessionResult = await createUserSession(
      currentUser.uid,
      userData?.matchedProfessional || 'none',
      'evaluation'
    );

    if (sessionResult.success) {
      setCurrentSessionId(sessionResult.sessionId);
      console.log('✅ Sesión de evaluación creada:', sessionResult.sessionId);
    } else {
      console.error('❌ Error al crear sesión:', sessionResult.error);
    }

    // Ir directamente a las preguntas de categorización (sin seleccionar test aún)
    console.log('📝 Iniciando preguntas de categorización');
    setSelectedTest(null); // No seleccionar test aún
    setCurrentStep('categorization');
    setCurrentQuestionIndex(0);
    setCategorizationAnswers({});

    console.log('🎯 Evaluación iniciada, paso actual:', 'categorization');
  };

  const handleConfirmNewEvaluation = async () => {
    console.log('🎯 FUNCIÓN handleConfirmNewEvaluation EJECUTÁNDOSE');
    setShowConfirmModal(false);

    // Crear sesión de evaluación
    const sessionResult = await createUserSession(
      currentUser.uid,
      userData?.matchedProfessional || 'none',
      'evaluation'
    );

    if (sessionResult.success) {
      setCurrentSessionId(sessionResult.sessionId);
      console.log('✅ Sesión de evaluación creada:', sessionResult.sessionId);
    } else {
      console.error('❌ Error al crear sesión:', sessionResult.error);
    }

    // Ir directamente a las preguntas de categorización (sin seleccionar test aún)
    setSelectedTest(null); // No seleccionar test aún
    setCurrentStep('categorization');
    setCurrentQuestionIndex(0);
    setCategorizationAnswers({});
  };

  const handleCancelNewEvaluation = () => {
    setShowConfirmModal(false);
  };

  const handleCategorizationAnswer = (questionId, answerId) => {
    const newAnswers = { ...categorizationAnswers, [questionId]: answerId };
    setCategorizationAnswers(newAnswers);
  };

  const nextCategorizationQuestion = () => {
    const currentQuestion = allCategorizationQuestions[currentQuestionIndex];
    const answerId = categorizationAnswers[currentQuestion.id];
    const selectedOption = currentQuestion?.options?.find(opt => opt.id === answerId);

    if (selectedOption?.text?.toLowerCase().includes('suicid') ||
      selectedOption?.text?.toLowerCase().includes('daño') ||
      selectedOption?.text?.toLowerCase().includes('morir')) {
      setShowSuicidalAlert(true);
      setCurrentStep('suicidal-risk');
      return;
    }

    const isLastQuestion = currentQuestionIndex === (allCategorizationQuestions.length - 1);

    if (isLastQuestion) {
      console.log('🎯 Última pregunta de categorización completada, determinando test...');
      const determinedTest = determineTestFromCategorization(categorizationAnswers, availableTests);
      if (determinedTest) {
        console.log('✅ Test determinado:', determinedTest.title);
        setSelectedTest(determinedTest);
        setCurrentStep('test');
        setCurrentQuestionIndex(0);
        setTestAnswers({});
      } else {
        console.log('⚠️ No se pudo determinar test específico, usando primer test disponible');
        setSelectedTest(availableTests[0]);
        setCurrentStep('test');
        setCurrentQuestionIndex(0);
        setTestAnswers({});
      }
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevCategorizationQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleTestAnswer = (questionId, answerId) => {
    setTestAnswers({ ...testAnswers, [questionId]: answerId });
  };

  const nextTestQuestion = () => {
    if (currentQuestionIndex < selectedTest.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      completeTest();
    }
  };

  const prevTestQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const completeTest = async () => {
    if (!selectedTest) return;

    setLoading(true);
    try {
      const score = calculateTestScore(selectedTest, testAnswers);
      const interpretation = interpretTestResults(selectedTest, score);
      const specialties = getTestSpecialties(selectedTest);

      const results = {
        testId: selectedTest.id,
        testTitle: selectedTest.title,
        score: score,
        interpretation: interpretation,
        specialties: specialties,
        completedAt: serverTimestamp()
      };

      setTestResults(results);

      // Guardar resultados del test en la colección userTestResults
      const saveResults = await saveUserTestResults(
        currentUser.uid,
        selectedTest,
        testAnswers,
        score,
        interpretation
      );

      if (saveResults.success) {
        console.log('✅ Resultados del test guardados:', saveResults.resultId);
      } else {
        console.error('❌ Error al guardar resultados:', saveResults.error);
      }

      // Finalizar sesión de evaluación
      if (currentSessionId) {
        const resultText = `Evaluación completada. Puntaje: ${score}. Interpretación: ${interpretation.level} - ${interpretation.description}. Especialidades recomendadas: ${specialties.join(', ')}`;
        const endSessionResult = await endUserSession(currentSessionId, 0, resultText);
        if (endSessionResult.success) {
          console.log('✅ Sesión de evaluación finalizada:', endSessionResult.duration, 'minutos');
        } else {
          console.error('❌ Error al finalizar sesión:', endSessionResult.error);
        }
      }

      // Actualizar datos del usuario
      await updateDoc(doc(db, 'users', currentUser.uid), {
        testProgress: 'completed',
        testsCompleted: increment(1),
        lastTestCompletedAt: serverTimestamp(),
        evaluationsCompleted: increment(1),
        status: 'evaluated',
        matchedProfessional: 'searching',
        lastTestResults: results,
        updatedAt: serverTimestamp()
      });

      // Refrescar los datos del usuario en el contexto
      console.log('🔄 Refrescando datos del usuario después de completar evaluación...');
      await refreshUserData();

      // Mostrar pantalla de búsqueda por 5 segundos
      setCurrentStep('searching');

      // Buscar profesional automáticamente
      const matchingResult = await findMatchingProfessional(
        currentUser.uid,
        specialties,
        results
      );

      // Esperar 5 segundos para dar mejor impresión al usuario
      setTimeout(async () => {
        if (matchingResult.success) {
          console.log('✅ Profesional encontrado:', matchingResult.professional);
          setAssignedProfessional(matchingResult.professional);
          setCurrentStep('completed');

          // Refrescar los datos del usuario después de asignar profesional
          console.log('🔄 Refrescando datos del usuario después de asignar profesional...');
          await refreshUserData();
        } else {
          console.log('⚠️ No se encontró profesional, usuario en búsqueda');
          setCurrentStep('searching');
        }
      }, 5000);
    } catch (error) {
      console.error('Error al completar test:', error);
      setCurrentStep('searching');
    } finally {
      setLoading(false);
    }
  };

  const goToDashboard = async () => {
    // Si hay una sesión activa, finalizarla
    if (currentSessionId) {
      const reason = testResults 
        ? `Evaluación completada. Puntaje: ${testResults.score}. Interpretación: ${testResults.interpretation?.level || testResults.interpretation}`
        : 'Evaluación incompleta (Navegación al dashboard)';
      const endSessionResult = await endUserSession(currentSessionId, 0, reason);
      if (endSessionResult.success) {
        console.log('✅ Sesión finalizada al navegar al dashboard');
      }
    }

    // Refrescar los datos del usuario antes de navegar al dashboard
    console.log('🔄 Refrescando datos del usuario antes de ir al dashboard...');
    await refreshUserData();

    navigate('/dashboard');
  };

  const continueAfterSuicidalAlert = () => {
    setShowSuicidalAlert(false);
    // Continuar con la evaluación pero con orientación especial
    console.log('🎯 Continuando después de alerta suicida, determinando test...');
    const determinedTest = determineTestFromCategorization(categorizationAnswers, availableTests);
    if (determinedTest) {
      console.log('✅ Test determinado después de alerta:', determinedTest.title);
      setSelectedTest(determinedTest);
      setCurrentStep('test');
      setCurrentQuestionIndex(0);
      setTestAnswers({});
    } else {
      console.log('⚠️ No se pudo determinar test específico, usando primer test disponible');
      setSelectedTest(availableTests[0]);
      setCurrentStep('test');
      setCurrentQuestionIndex(0);
      setTestAnswers({});
    }
  };

  const goBackToWelcome = () => {
    setCurrentStep('welcome');
    setCategorizationAnswers({});
    setTestAnswers({});
    setCurrentQuestionIndex(0);
    setSelectedTest(null);
    setTestResults(null);
    setAllCategorizationQuestions([]);
  };

  if (loading && currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando evaluación emocional...</p>
        </div>
      </div>
    );
  }

  if (currentStep === 'welcome') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center relative z-10 animate-fade-in-up">
          <div className="glass-panel p-8 sm:p-12 rounded-[2rem] shadow-2xl relative overflow-hidden">
            <div className="mb-8 relative z-10">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 mb-4">
                <svg className="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Evaluación Emocional
              </h1>
              <p className="text-lg text-gray-600 mb-6">
                Realiza nuestra evaluación personalizada para encontrar el profesional
                más adecuado para tus necesidades específicas.
              </p>
            </div>

            <div className="space-y-4 mb-8">
              <p className="text-gray-500">
                La evaluación incluye:
              </p>
              <ul className="text-left text-gray-600 space-y-2 max-w-md mx-auto">
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Preguntas de categorización personalizadas
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Test específico según tus respuestas
                </li>
                <li className="flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Emparejamiento automático con profesionales
                </li>
              </ul>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => {
                  console.log('🎯 BOTÓN CLICKEADO - Empezar Evaluación Emocional');
                  handleStartEvaluation();
                }}
                className="group relative w-full inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-300 shadow-[0_4px_14px_0_rgba(20,184,166,0.39)]"
              >
                <svg className="h-6 w-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Empezar Evaluación Emocional
              </button>

              <button
                onClick={() => navigate('/dashboard')}
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-gray-200 text-base font-medium rounded-xl text-gray-700 bg-white/60 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition-all duration-200 shadow-sm"
              >
                <svg className="h-5 w-5 mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Ir a mi Panel Principal
              </button>

            </div>
          </div>
        </div>

        {/* Modal de confirmación para nueva evaluación */}
        {showConfirmModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-[1.5rem] shadow-2xl max-w-md w-full animate-fade-in-up relative overflow-hidden">
              <div className="mb-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  ¿Estás seguro?
                </h3>
                <p className="text-gray-600 text-center">
                  ¿Estás seguro de que deseas abandonar tu progreso con el profesional e iniciar una nueva evaluación?
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleCancelNewEvaluation}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition-all duration-200 bg-white/60"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmNewEvaluation}
                  className="flex-1 px-4 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 shadow-[0_4px_14px_0_rgba(20,184,166,0.39)]"
                >
                  Sí, continuar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (currentStep === 'suicidal-risk') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-xl shadow-lg p-8 border-l-4 border-red-500">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-red-800 mb-4">
                Tu vida es valiosa
              </h1>
              <p className="text-lg text-red-700 mb-6">
                Si necesitas ayuda urgente, comunícate al <strong>155</strong>, línea gratuita de apoyo emocional del Estado.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-800">
                  <strong>Recuerda:</strong> No estás solo/a. Hay personas que pueden ayudarte y recursos disponibles las 24 horas.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={continueAfterSuicidalAlert}
                className="w-full bg-red-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Continuar con orientación guiada
              </button>
              <button
                onClick={goToDashboard}
                className="w-full bg-gray-300 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-400 transition-colors"
              >
                Ir a mi Panel principal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'categorization') {
    console.log('🎯 Renderizando preguntas de categorización...');
    console.log('📊 Estado actual:', {
      currentStep,
      allCategorizationQuestionsLength: allCategorizationQuestions.length,
      currentQuestionIndex,
      availableTestsLength: availableTests.length
    });

    const currentQuestion = allCategorizationQuestions[currentQuestionIndex];

    if (!currentQuestion) {
      console.log('⚠️ No hay pregunta actual, redirigiendo al test...');
      // Si no hay preguntas de categorización, ir directamente al test
      setCurrentStep('test');
      setCurrentQuestionIndex(0);
      setTestAnswers({});
      return null;
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-6 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Evaluación Emocional</h1>
                <button
                  onClick={goBackToWelcome}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>Pregunta {currentQuestionIndex + 1} de {allCategorizationQuestions.length}</span>
                <span>Preguntas de categorización</span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestionIndex + 1) / allCategorizationQuestions.length) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Pregunta */}
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6">
                {currentQuestion.text}
              </h2>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <label key={option.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name={`categorization-${currentQuestion.id}`}
                      value={option.id}
                      checked={categorizationAnswers[currentQuestion.id] === option.id}
                      onChange={() => handleCategorizationAnswer(currentQuestion.id, option.id)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-3 text-gray-900">{option.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    <strong>Confidencialidad:</strong> Tus respuestas son completamente privadas y se utilizan únicamente para brindarte la mejor atención posible.
                  </p>
                </div>
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
                disabled={!categorizationAnswers[currentQuestion.id]}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentQuestionIndex === allCategorizationQuestions.length - 1 ? 'Siguiente fase' : 'Siguiente'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'test' && selectedTest) {
    const currentQuestion = selectedTest.questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === selectedTest.questions.length - 1;

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 py-6 sm:py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-8">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Complete el siguiente cuestionario</h1>
                <button
                  onClick={goBackToWelcome}
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

            {/* Descripción del test - solo se muestra después de completar las preguntas de categorización */}
            {selectedTest.description && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">{selectedTest.description}</p>
              </div>
            )}

            {/* Instrucciones */}
            {selectedTest.instructions && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">{selectedTest.instructions}</p>
              </div>
            )}

            {/* Pregunta */}
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-6">
                {currentQuestion.text}
                {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
              </h2>

              <div className="space-y-3">
                {currentQuestion.options.map((option) => (
                  <label key={option.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option.id}
                      checked={testAnswers[currentQuestion.id] === option.id}
                      onChange={() => handleTestAnswer(currentQuestion.id, option.id)}
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
                disabled={currentQuestion.required && !testAnswers[currentQuestion.id] || loading}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Completando...
                  </div>
                ) : (
                  isLastQuestion ? 'Completar Test' : 'Siguiente'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'searching') {
    return (
      <div className="min-h-screen relative flex items-center justify-center">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={bgDesktop} 
            alt="Background" 
            className="w-full h-full object-cover hidden md:block opacity-40"
          />
          <img 
            src={bgMobile} 
            alt="Background" 
            className="w-full h-full object-cover md:hidden opacity-40"
          />
          <div className="absolute inset-0 bg-black/60"></div>
        </div>

        <div className="relative z-10 text-center text-white px-4 flex flex-col items-center">
          <div className="mb-8 relative">
            <div className="w-32 h-32 rounded-full border-4 border-white/20 border-t-white animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-12 h-12 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 animate-pulse">
            Analizando tu perfil...
          </h2>
          <p className="text-xl opacity-90">
            Encontrando al profesional ideal para ti
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === 'completed') {
    return (
      <div className="min-h-screen relative flex flex-col items-center justify-center py-12 px-4">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src={bgDesktop} 
            alt="Background" 
            className="w-full h-full object-cover hidden md:block opacity-40"
          />
          <img 
            src={bgMobile} 
            alt="Background" 
            className="w-full h-full object-cover md:hidden opacity-40"
          />
          <div className="absolute inset-0 bg-gray-900/50"></div>
        </div>

        <div className="relative z-10 max-w-3xl w-full mx-auto mt-16">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white text-primary-600 mb-6 shadow-lg">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-3 drop-shadow-md">
              ¡Hemos encontrado a tu profesional!
            </h1>
            <p className="text-gray-200 text-lg drop-shadow">
              Basado en tus respuestas, este es el especialista más adecuado para ti.
            </p>
          </div>

          {/* Match Card */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 overflow-hidden mb-8">
            {assignedProfessional && (
              <div className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                  
                  {/* Left Column: Avatar & Rating */}
                  <div className="flex-shrink-0 flex flex-col items-center w-full md:w-40">
                    <div className="w-32 h-32 rounded-full bg-primary-50 text-primary-600 flex items-center justify-center text-5xl font-bold mb-4 border-4 border-white shadow-md">
                      {(assignedProfessional?.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    {assignedProfessional.rating > 0 && (
                      <div className="flex items-center bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">
                        <span className="text-yellow-400 mr-1.5 text-sm">★</span>
                        <span className="text-gray-900 font-semibold text-sm mr-1.5">{assignedProfessional.rating.toFixed(1)}</span>
                        <span className="text-gray-500 text-xs">({assignedProfessional.ratingCount})</span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Details */}
                  <div className="flex-1 space-y-6 w-full">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">{assignedProfessional.name}</h2>
                      {assignedProfessional.exprecienceYears && (
                        <p className="text-gray-500 font-medium">{assignedProfessional.exprecienceYears} años de experiencia</p>
                      )}
                    </div>

                    {/* Contact Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {assignedProfessional.contact?.email && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</p>
                          <p className="text-gray-900">{assignedProfessional.contact.email}</p>
                        </div>
                      )}
                      {assignedProfessional.contact?.phone && (
                        <div>
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Teléfono</p>
                          <p className="text-gray-900">{assignedProfessional.contact.phone}</p>
                        </div>
                      )}
                    </div>

                    {/* Specialities */}
                    {assignedProfessional.specialities && assignedProfessional.specialities.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Especialidades</p>
                        <div className="flex flex-wrap gap-2">
                          {assignedProfessional.specialities.map((specialty, index) => (
                            <span key={index} className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-lg font-medium">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Modalities */}
                    {assignedProfessional.modalities && (
                      <div>
                         <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Modalidades de atención</p>
                         <div className="flex flex-wrap gap-2">
                            {assignedProfessional.modalities.online && (
                              <span className="border border-gray-200 text-gray-600 text-sm px-3 py-1 rounded-lg bg-white shadow-sm">Online</span>
                            )}
                            {assignedProfessional.modalities.inPerson && (
                              <span className="border border-gray-200 text-gray-600 text-sm px-3 py-1 rounded-lg bg-white shadow-sm">Presencial</span>
                            )}
                            {assignedProfessional.modalities.hybrid && (
                              <span className="border border-gray-200 text-gray-600 text-sm px-3 py-1 rounded-lg bg-white shadow-sm">Híbrido</span>
                            )}
                         </div>
                      </div>
                    )}

                    {/* Social Links */}
                    {(assignedProfessional.contact?.whatsapp || assignedProfessional.contact?.instagram || assignedProfessional.contact?.linkedin) && (
                      <div className="pt-5 border-t border-gray-100 flex gap-4">
                        {assignedProfessional.contact?.whatsapp && (
                          <a href={`https://wa.me/${assignedProfessional.contact.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-green-50 hover:text-green-600 transition-colors">
                            <span className="sr-only">WhatsApp</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" /></svg>
                          </a>
                        )}
                        {assignedProfessional.contact?.instagram && (
                          <a href={`https://instagram.com/${assignedProfessional.contact.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-pink-50 hover:text-pink-600 transition-colors">
                            <span className="sr-only">Instagram</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
                          </a>
                        )}
                        {assignedProfessional.contact?.linkedin && (
                          <a href={`https://linkedin.com/in/${assignedProfessional.contact.linkedin.replace(/^.*linkedin\.com\/in\//, '').replace(/\/$/, '')}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                            <span className="sr-only">LinkedIn</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={goToDashboard}
              className="px-8 py-3.5 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors focus:ring-4 focus:ring-primary-100 shadow-sm"
            >
              Ir a mi panel principal
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal de confirmación para nueva evaluación */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="glass-panel p-6 sm:p-8 rounded-[1.5rem] shadow-2xl max-w-md w-full animate-fade-in-up relative overflow-hidden">
            <div className="mb-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                ¿Estás seguro?
              </h3>
              <p className="text-gray-600 text-center">
                ¿Estás seguro de que deseas abandonar tu progreso con el profesional e iniciar una nueva evaluación?
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancelNewEvaluation}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition-all duration-200 bg-white/60"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmNewEvaluation}
                className="flex-1 px-4 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 shadow-[0_4px_14px_0_rgba(20,184,166,0.39)]"
              >
                Sí, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EvaluacionEmocionalPage;
