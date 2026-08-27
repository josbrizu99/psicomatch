import React, { useState } from 'react';
import { 
  createEvaluationTest, 
  updateEvaluationTest,
  validateTestStructure,
  QUESTION_TYPES,
  QUESTION_IMPORTANCE,
  TEST_STATES 
} from '../../services/evaluationTestService';
import { useAuth } from '../../contexts/AuthContext';

const CreateEvaluationTest = ({ testToEdit = null, onClose }) => {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const totalSteps = 5;

  // Especialidades disponibles
  const specialities = [
    'Ansiedad',
    'Depresión', 
    'Estrés',
    'Trauma',
    'Parejas',
    'Familiar',
    'Infantil',
    'Adolescentes',
    'Adultos',
    'TOC',
    'Fobias',
    'Duelo',
    'Adicciones',
    'Autoestima',
    'Desarrollo personal',
    'Crisis existencial',
    'Problemas laborales',
    'Problemas académicos',
    'Trastornos alimentarios',
    'Trastornos del sueño',
    'Otros'
  ];

  // Estado del formulario
  const [formData, setFormData] = useState({
    title: testToEdit?.title || '',
    description: testToEdit?.description || '',
    specialties: testToEdit?.specialties || [],
    estimatedTime: testToEdit?.estimatedTime || 10,
    instructions: testToEdit?.instructions || '',
    categorizationQuestions: testToEdit?.categorizationQuestions || [],
    questions: testToEdit?.questions || [],
    scoreRanges: testToEdit?.scoreRanges || [],
    state: testToEdit?.state || TEST_STATES.DRAFT
  });

  // Estado para preguntas temporales
  const [currentCategorizationQuestion, setCurrentCategorizationQuestion] = useState({
    text: '',
    options: []
  });

  const [currentQuestion, setCurrentQuestion] = useState({
    text: '',
    type: QUESTION_TYPES.MULTIPLE_CHOICE,
    importance: QUESTION_IMPORTANCE.HIGH,
    options: [],
    required: true
  });

  const [editingQuestionIndex, setEditingQuestionIndex] = useState(null);

  const [currentScoreRange, setCurrentScoreRange] = useState({
    minScore: 0,
    maxScore: null,
    level: '',
    description: '',
    recommendation: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSpecialtyChange = (specialty) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialty)
        ? prev.specialties.filter(s => s !== specialty)
        : [...prev.specialties, specialty]
    }));
  };

  // Funciones para preguntas de categorización
  const addCategorizationOption = () => {
    setCurrentCategorizationQuestion(prev => ({
      ...prev,
      options: [...prev.options, { text: '', id: Date.now().toString() }]
    }));
  };

  const updateCategorizationOption = (index, text) => {
    setCurrentCategorizationQuestion(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, text } : option
      )
    }));
  };

  const removeCategorizationOption = (index) => {
    setCurrentCategorizationQuestion(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const addCategorizationQuestion = () => {
    if (currentCategorizationQuestion.text.trim() && currentCategorizationQuestion.options.length >= 2) {
      const newQuestion = {
        id: Date.now().toString(),
        text: currentCategorizationQuestion.text.trim(),
        options: currentCategorizationQuestion.options.filter(opt => opt.text.trim())
      };

      setFormData(prev => ({
        ...prev,
        categorizationQuestions: [...prev.categorizationQuestions, newQuestion]
      }));

      setCurrentCategorizationQuestion({
        text: '',
        options: []
      });
    }
  };

  const removeCategorizationQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      categorizationQuestions: prev.categorizationQuestions.filter((_, i) => i !== index)
    }));
  };

  // Funciones para preguntas del test
  const addQuestionOption = () => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: [...prev.options, { 
        text: '', 
        score: 0, 
        id: Date.now().toString() 
      }]
    }));
  };

  const updateQuestionOption = (index, field, value) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, [field]: value } : option
      )
    }));
  };

  const removeQuestionOption = (index) => {
    setCurrentQuestion(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const addQuestion = () => {
    if (currentQuestion.text.trim() && currentQuestion.options.length >= 2) {
      const newQuestion = {
        id: currentQuestion.id || Date.now().toString(),
        text: currentQuestion.text.trim(),
        type: currentQuestion.type,
        importance: currentQuestion.importance,
        required: currentQuestion.required,
        options: currentQuestion.options.filter(opt => opt.text.trim())
      };

      if (editingQuestionIndex !== null) {
        setFormData(prev => ({
          ...prev,
          questions: prev.questions.map((q, i) => i === editingQuestionIndex ? newQuestion : q)
        }));
        setEditingQuestionIndex(null);
      } else {
        setFormData(prev => ({
          ...prev,
          questions: [...prev.questions, newQuestion]
        }));
      }

      setCurrentQuestion({
        text: '',
        type: QUESTION_TYPES.MULTIPLE_CHOICE,
        importance: QUESTION_IMPORTANCE.HIGH,
        options: [],
        required: true
      });
    }
  };

  const cancelEditQuestion = () => {
    setEditingQuestionIndex(null);
    setCurrentQuestion({
      text: '',
      type: QUESTION_TYPES.MULTIPLE_CHOICE,
      importance: QUESTION_IMPORTANCE.HIGH,
      options: [],
      required: true
    });
  };

  const handleEditQuestion = (index) => {
    setCurrentQuestion(formData.questions[index]);
    setEditingQuestionIndex(index);
  };

  const moveQuestionUp = (index) => {
    if (index === 0) return;
    setFormData(prev => {
      const newQuestions = [...prev.questions];
      const temp = newQuestions[index];
      newQuestions[index] = newQuestions[index - 1];
      newQuestions[index - 1] = temp;
      return { ...prev, questions: newQuestions };
    });
  };

  const moveQuestionDown = (index) => {
    if (index === formData.questions.length - 1) return;
    setFormData(prev => {
      const newQuestions = [...prev.questions];
      const temp = newQuestions[index];
      newQuestions[index] = newQuestions[index + 1];
      newQuestions[index + 1] = temp;
      return { ...prev, questions: newQuestions };
    });
  };

  const removeQuestion = (index) => {
    if (editingQuestionIndex === index) {
      cancelEditQuestion();
    } else if (editingQuestionIndex !== null && index < editingQuestionIndex) {
      setEditingQuestionIndex(editingQuestionIndex - 1);
    }
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  };

  // Funciones para rangos de puntuación
  const addScoreRange = () => {
    if (currentScoreRange.level.trim() && currentScoreRange.description.trim()) {
      const newRange = {
        id: Date.now().toString(),
        minScore: currentScoreRange.minScore,
        maxScore: currentScoreRange.maxScore,
        level: currentScoreRange.level.trim(),
        description: currentScoreRange.description.trim(),
        recommendation: currentScoreRange.recommendation.trim()
      };

      setFormData(prev => ({
        ...prev,
        scoreRanges: [...prev.scoreRanges, newRange]
      }));

      setCurrentScoreRange({
        minScore: 0,
        maxScore: null,
        level: '',
        description: '',
        recommendation: ''
      });
    }
  };

  const removeScoreRange = (index) => {
    setFormData(prev => ({
      ...prev,
      scoreRanges: prev.scoreRanges.filter((_, i) => i !== index)
    }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Validar estructura del test
      const validation = validateTestStructure(formData);
      if (!validation.isValid) {
        setError(`Errores de validación: ${validation.errors.join(', ')}`);
        setLoading(false);
        return;
      }

      // Agregar información del creador
      const testData = {
        ...formData,
        createdBy: currentUser?.uid || 'unknown'
      };

      let result;
      if (testToEdit) {
        result = await updateEvaluationTest(testToEdit.id, testData);
      } else {
        result = await createEvaluationTest(testData);
      }

      if (result.success) {
        setMessage(testToEdit ? 'Test actualizado exitosamente' : 'Test creado exitosamente');
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('Error al guardar test:', error);
      setError('Error al guardar el test');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Información Básica del Test</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título del Test <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ej: Test de Ansiedad de Beck"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Describe brevemente qué evalúa este test"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Especialidades <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-3 bg-gray-50">
                {specialities.map((specialty) => (
                  <div key={specialty} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`specialty-${specialty}`}
                      checked={formData.specialties.includes(specialty)}
                      onChange={() => handleSpecialtyChange(specialty)}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`specialty-${specialty}`} className="ml-2 block text-sm text-gray-900">
                      {specialty}
                    </label>
                  </div>
                ))}
              </div>
              {formData.specialties.length > 0 && (
                <div className="mt-2 text-sm text-gray-600">
                  Seleccionadas: {formData.specialties.join(', ')}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tiempo estimado (minutos)
                </label>
                <input
                  type="number"
                  value={formData.estimatedTime}
                  onChange={(e) => handleInputChange('estimatedTime', parseInt(e.target.value) || 10)}
                  min="1"
                  max="120"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value={TEST_STATES.DRAFT}>Borrador</option>
                  <option value={TEST_STATES.ACTIVE}>Activo</option>
                  <option value={TEST_STATES.INACTIVE}>Inactivo</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instrucciones para el usuario
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Instrucciones que verá el usuario antes de comenzar el test"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preguntas de Categorización</h3>
            <p className="text-sm text-gray-600 mb-4">
              Estas preguntas ayudarán a determinar qué tipo de test mostrar al usuario.
            </p>

            {/* Preguntas existentes */}
            {formData.categorizationQuestions.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Preguntas agregadas:</h4>
                {formData.categorizationQuestions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-gray-900">{index + 1}. {question.text}</h5>
                      <button
                        onClick={() => removeCategorizationQuestion(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-1">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="text-sm text-gray-600">
                          • {option.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario para nueva pregunta */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Agregar nueva pregunta:</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texto de la pregunta
                  </label>
                  <input
                    type="text"
                    value={currentCategorizationQuestion.text}
                    onChange={(e) => setCurrentCategorizationQuestion(prev => ({
                      ...prev,
                      text: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ej: ¿Cómo te has sentido últimamente?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opciones de respuesta
                  </label>
                  <div className="space-y-2">
                    {currentCategorizationQuestion.options.map((option, index) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateCategorizationOption(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder={`Opción ${index + 1}`}
                        />
                        <button
                          onClick={() => removeCategorizationOption(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={addCategorizationOption}
                    className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    + Agregar opción
                  </button>
                </div>

                <button
                  onClick={addCategorizationQuestion}
                  disabled={!currentCategorizationQuestion.text.trim() || currentCategorizationQuestion.options.length < 2}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Agregar Pregunta de Categorización
                </button>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Preguntas del Test</h3>
            <p className="text-sm text-gray-600 mb-4">
              Agrega las preguntas que conformarán el test de evaluación.
            </p>

            {/* Preguntas existentes */}
            {formData.questions.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Preguntas agregadas:</h4>
                {formData.questions.map((question, index) => (
                  <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{index + 1}. {question.text}</h5>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                          <span>Tipo: {question.type === QUESTION_TYPES.MULTIPLE_CHOICE ? 'Opciones múltiples' : 
                                       question.type === QUESTION_TYPES.LIKERT ? 'Escala Likert' : 'Verdadero/Falso'}</span>
                          <span>Importancia: {question.importance === QUESTION_IMPORTANCE.HIGH ? 'Alta' :
                                           question.importance === QUESTION_IMPORTANCE.MEDIUM ? 'Media' : 'Baja'}</span>
                          <span>Obligatoria: {question.required ? 'Sí' : 'No'}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => moveQuestionUp(index)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Mover arriba"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => moveQuestionDown(index)}
                          disabled={index === formData.questions.length - 1}
                          className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="Mover abajo"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditQuestion(index)}
                          className="text-blue-600 hover:text-blue-800 transition-colors ml-2"
                          title="Editar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-800 transition-colors ml-2"
                          title="Eliminar"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      {question.options.map((option, optIndex) => (
                        <div key={optIndex} className="text-sm text-gray-600">
                          • {option.text} (Puntuación: {option.score})
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario para nueva pregunta */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Agregar nueva pregunta:</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Texto de la pregunta
                  </label>
                  <input
                    type="text"
                    value={currentQuestion.text}
                    onChange={(e) => setCurrentQuestion(prev => ({
                      ...prev,
                      text: e.target.value
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Ej: Me siento nervioso con frecuencia"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de pregunta
                    </label>
                    <select
                      value={currentQuestion.type}
                      onChange={(e) => setCurrentQuestion(prev => ({
                        ...prev,
                        type: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={QUESTION_TYPES.MULTIPLE_CHOICE}>Opciones múltiples</option>
                      <option value={QUESTION_TYPES.LIKERT}>Escala Likert</option>
                      <option value={QUESTION_TYPES.TRUE_FALSE}>Verdadero/Falso</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Importancia
                    </label>
                    <select
                      value={currentQuestion.importance}
                      onChange={(e) => setCurrentQuestion(prev => ({
                        ...prev,
                        importance: e.target.value
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={QUESTION_IMPORTANCE.HIGH}>Alta</option>
                      <option value={QUESTION_IMPORTANCE.MEDIUM}>Media</option>
                      <option value={QUESTION_IMPORTANCE.LOW}>Baja</option>
                    </select>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="required"
                      checked={currentQuestion.required}
                      onChange={(e) => setCurrentQuestion(prev => ({
                        ...prev,
                        required: e.target.checked
                      }))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="required" className="ml-2 block text-sm text-gray-900">
                      Pregunta obligatoria
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opciones de respuesta
                  </label>
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, index) => (
                      <div key={option.id} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateQuestionOption(index, 'text', e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder={`Opción ${index + 1}`}
                        />
                        <input
                          type="number"
                          value={option.score}
                          onChange={(e) => updateQuestionOption(index, 'score', parseInt(e.target.value) || 0)}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Pts"
                        />
                        <button
                          onClick={() => removeQuestionOption(index)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <button
                    onClick={addQuestionOption}
                    className="mt-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    + Agregar opción
                  </button>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={addQuestion}
                    disabled={!currentQuestion.text.trim() || currentQuestion.options.length < 2}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editingQuestionIndex !== null ? 'Guardar Cambios' : 'Agregar Pregunta'}
                  </button>
                  {editingQuestionIndex !== null && (
                    <button
                      onClick={cancelEditQuestion}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rangos de Puntuación</h3>
            <p className="text-sm text-gray-600 mb-4">
              Define los rangos de puntuación y su interpretación para el test.
            </p>

            {/* Rangos existentes */}
            {formData.scoreRanges.length > 0 && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Rangos definidos:</h4>
                {formData.scoreRanges.map((range, index) => (
                  <div key={range.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">
                          {range.level} ({range.minScore}-{range.maxScore || '∞'})
                        </h5>
                        <p className="text-sm text-gray-600 mt-1">{range.description}</p>
                        {range.recommendation && (
                          <p className="text-sm text-blue-600 mt-1">
                            <strong>Recomendación:</strong> {range.recommendation}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeScoreRange(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario para nuevo rango */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Agregar nuevo rango:</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Puntuación mínima
                  </label>
                  <input
                    type="number"
                    value={currentScoreRange.minScore}
                    onChange={(e) => setCurrentScoreRange(prev => ({
                      ...prev,
                      minScore: parseInt(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Puntuación máxima (opcional)
                  </label>
                  <input
                    type="number"
                    value={currentScoreRange.maxScore || ''}
                    onChange={(e) => setCurrentScoreRange(prev => ({
                      ...prev,
                      maxScore: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={currentScoreRange.level}
                  onChange={(e) => setCurrentScoreRange(prev => ({
                    ...prev,
                    level: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ej: Ansiedad baja"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={currentScoreRange.description}
                  onChange={(e) => setCurrentScoreRange(prev => ({
                    ...prev,
                    description: e.target.value
                  }))}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Describe qué significa este nivel de puntuación"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recomendación
                </label>
                <textarea
                  value={currentScoreRange.recommendation}
                  onChange={(e) => setCurrentScoreRange(prev => ({
                    ...prev,
                    recommendation: e.target.value
                  }))}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Recomendación para el usuario"
                />
              </div>

              <button
                onClick={addScoreRange}
                disabled={!currentScoreRange.level.trim() || !currentScoreRange.description.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar Rango
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Vista Previa y Confirmación</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Resumen del Test</h4>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>Título:</strong> {formData.title}</p>
                <p><strong>Descripción:</strong> {formData.description}</p>
                <p><strong>Especialidades:</strong> {formData.specialties.join(', ')}</p>
                <p><strong>Tiempo estimado:</strong> {formData.estimatedTime} minutos</p>
                <p><strong>Preguntas de categorización:</strong> {formData.categorizationQuestions.length}</p>
                <p><strong>Preguntas del test:</strong> {formData.questions.length}</p>
                <p><strong>Rangos de puntuación:</strong> {formData.scoreRanges.length}</p>
                <p><strong>Estado:</strong> {formData.state === TEST_STATES.ACTIVE ? 'Activo' : 
                                          formData.state === TEST_STATES.DRAFT ? 'Borrador' : 'Inactivo'}</p>
              </div>
            </div>

            {formData.instructions && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Instrucciones para el usuario</h4>
                <p className="text-sm text-gray-700">{formData.instructions}</p>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <h4 className="font-medium text-green-900">Test listo para guardar</h4>
              </div>
              <p className="text-sm text-green-800">
                El test cumple con todos los requisitos y está listo para ser guardado.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-2xl rounded-xl bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {testToEdit ? 'Editar Test de Evaluación' : 'Crear Nuevo Test de Evaluación'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Indicador de progreso */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center">
                  <button
                    onClick={() => setCurrentStep(step)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 ${
                      currentStep >= step
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                  >
                    {step}
                  </button>
                  {step < 5 && (
                    <div className={`w-16 h-1 mx-2 transition-all duration-200 ${
                      currentStep > step ? 'bg-primary-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Paso {currentStep} de {totalSteps}: {
                  currentStep === 1 ? 'Información Básica' :
                  currentStep === 2 ? 'Preguntas de Categorización' :
                  currentStep === 3 ? 'Preguntas del Test' :
                  currentStep === 4 ? 'Rangos de Puntuación' :
                  'Vista Previa'
                }
              </p>
            </div>
          </div>

          {/* Mensajes */}
          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{message}</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Contenido del paso actual */}
          {renderStep()}

          {/* Navegación */}
          <div className="flex justify-between pt-6 border-t border-gray-200 mt-8">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            
            <div className="flex space-x-3">
              {currentStep < totalSteps ? (
                <button
                  onClick={nextStep}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Siguiente
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Test'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateEvaluationTest;

