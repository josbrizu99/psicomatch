import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy,
  limit,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Constantes para estados de tests
export const TEST_STATES = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived'
};

// Constantes para tipos de preguntas
export const QUESTION_TYPES = {
  MULTIPLE_CHOICE: 'multiple_choice',
  TEXT: 'text',
  SCALE: 'scale',
  YES_NO: 'yes_no'
};

// Constantes para importancia de preguntas
export const QUESTION_IMPORTANCE = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Cargar tests activos desde la colección evaluationTests
export const getActiveEvaluationTests = async () => {
  try {
    console.log('🔄 Cargando tests de evaluación activos...');
    
    const testsRef = collection(db, 'evaluationTests');
    
    // Intentar primero sin orderBy para evitar problemas de índice
    let q = query(testsRef, where('state', '==', 'active'));
    let querySnapshot = await getDocs(q);
    
    // Si no hay resultados, intentar obtener todos los tests para debug
    if (querySnapshot.empty) {
      console.log('⚠️ No se encontraron tests activos, obteniendo todos los tests para debug...');
      const allTestsQuery = query(testsRef);
      const allTestsSnapshot = await getDocs(allTestsQuery);
      
      if (allTestsSnapshot.empty) {
        console.log('❌ No hay tests en la colección evaluationTests');
        return { 
          success: false, 
          error: 'No hay tests de evaluación disponibles',
          debug: { totalTests: 0, activeTests: 0 }
        };
      }
      
      const allTests = allTestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const activeTests = allTests.filter(test => test.state === 'active');
      
      console.log('📊 Debug - Total tests:', allTests.length, 'Tests activos:', activeTests.length);
      console.log('📋 Estados encontrados:', [...new Set(allTests.map(t => t.state))]);
      
      if (activeTests.length > 0) {
        // Ordenar por fecha en el cliente
        activeTests.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        
        console.log('✅ Tests activos encontrados (filtrado en cliente):', activeTests.length);
        return { success: true, tests: activeTests };
      }
      
      return { 
        success: false, 
        error: `No hay tests activos. Total: ${allTests.length}, Activos: ${activeTests.length}`,
        debug: { 
          totalTests: allTests.length, 
          activeTests: activeTests.length,
          allTests: allTests,
          states: [...new Set(allTests.map(t => t.state))]
        }
      };
    }
    
    const tests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar por fecha en el cliente
    tests.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });
    
    console.log('✅ Tests activos cargados:', tests.length);
    return { success: true, tests };
    
  } catch (error) {
    console.error('❌ Error al cargar tests:', error);
    
    // Fallback: obtener todos los tests y filtrar en el cliente
    try {
      console.log('🔄 Intentando fallback: obtener todos los tests...');
      const testsRef = collection(db, 'evaluationTests');
      const q = query(testsRef);
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const allTests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const activeTests = allTests.filter(test => test.state === 'active');
        
        // Ordenar por fecha en el cliente
        activeTests.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        
        console.log('✅ Tests activos cargados (fallback):', activeTests.length);
        return { success: true, tests: activeTests };
      }
      
      return { success: false, error: 'No hay tests de evaluación disponibles' };
      
    } catch (fallbackError) {
      console.error('❌ Error en fallback:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

// Cargar un test específico por ID
export const getEvaluationTestById = async (testId) => {
  try {
    const testsRef = collection(db, 'evaluationTests');
    const q = query(testsRef, where('__name__', '==', testId));
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return { success: false, error: 'Test no encontrado' };
    }
    
    const test = querySnapshot.docs[0];
    return { 
      success: true, 
      test: { id: test.id, ...test.data() }
    };
    
  } catch (error) {
    console.error('Error al obtener test:', error);
    return { success: false, error: error.message };
  }
};

// Determinar qué test aplicar basado en las respuestas de categorización
export const determineTestFromCategorization = (categorizationAnswers, availableTests) => {
  try {
    console.log('🔍 Determinando test basado en respuestas:', categorizationAnswers);
    
    // Lógica para determinar el test más apropiado
    // Por ahora, usar el primer test disponible como fallback
    if (availableTests.length === 0) {
      return null;
    }
    
    // Analizar las respuestas para determinar el tipo de test
    let selectedTest = availableTests[0]; // fallback
    
    // Aquí puedes implementar lógica más sofisticada basada en las respuestas
    // Por ejemplo, si hay respuestas que indican ansiedad, buscar test de ansiedad
    // Si hay respuestas que indican depresión, buscar test de depresión
    // etc.
    
    // Buscar test por especialidad en el título o descripción
    const testKeywords = {
      'ansiedad': ['ansiedad', 'anxiety', 'preocupación'],
      'depresión': ['depresión', 'depression', 'tristeza'],
      'estrés': ['estrés', 'stress', 'tensión']
    };
    
    // Analizar respuestas para detectar patrones
    const answerTexts = Object.values(categorizationAnswers).join(' ').toLowerCase();
    
    for (const [keyword, synonyms] of Object.entries(testKeywords)) {
      if (synonyms.some(synonym => answerTexts.includes(synonym))) {
        const matchingTest = availableTests.find(test => 
          test.title.toLowerCase().includes(keyword) ||
          test.description.toLowerCase().includes(keyword) ||
          (test.specialties && test.specialties.some(specialty => 
            specialty.toLowerCase().includes(keyword)
          ))
        );
        
        if (matchingTest) {
          selectedTest = matchingTest;
          break;
        }
      }
    }
    
    console.log('✅ Test seleccionado:', selectedTest.title);
    return selectedTest;
    
  } catch (error) {
    console.error('Error al determinar test:', error);
    return availableTests[0] || null;
  }
};

// Calcular puntuación del test
export const calculateTestScore = (test, answers) => {
  try {
    let totalScore = 0;
    let maxScore = 0;
    
    test.questions.forEach(question => {
      // Calcular score máximo posible para esta pregunta
      let questionMaxScore = 0;
      if (question.options && question.options.length > 0) {
        questionMaxScore = Math.max(...question.options.map(opt => typeof opt.score === 'number' ? opt.score : 0));
      }
      maxScore += questionMaxScore;

      const answerId = answers[question.id];
      if (answerId) {
        const option = question.options.find(opt => opt.id === answerId);
        if (option && typeof option.score === 'number') {
          totalScore += option.score;
        }
      }
    });
    
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    return {
      totalScore,
      maxScore,
      percentage
    };
  } catch (error) {
    console.error('Error al calcular puntuación:', error);
    return { totalScore: 0, maxScore: 0, percentage: 0 };
  }
};

// Interpretar resultados del test
export const interpretTestResults = (test, scoreObj) => {
  try {
    const score = typeof scoreObj === 'object' && scoreObj !== null ? scoreObj.totalScore : (scoreObj || 0);
    
    if (!test.scoreRanges || test.scoreRanges.length === 0) {
      return {
        level: 'Sin interpretación',
        description: 'No hay rangos de puntuación definidos',
        recommendation: 'Consulta con un profesional'
      };
    }
    
    // Encontrar el rango de puntuación correspondiente
    const matchingRange = test.scoreRanges.find(range => 
      score >= range.minScore && score <= range.maxScore
    );
    
    if (matchingRange) {
      return {
        level: matchingRange.level,
        description: matchingRange.description,
        recommendation: matchingRange.recommendation || 'Consulta con un profesional para más información'
      };
    }
    
    // Si no hay coincidencia exacta, usar el rango más cercano
    const sortedRanges = test.scoreRanges.sort((a, b) => a.minScore - b.minScore);
    const closestRange = sortedRanges.reduce((closest, current) => {
      const currentDistance = Math.abs(score - current.minScore);
      const closestDistance = Math.abs(score - closest.minScore);
      return currentDistance < closestDistance ? current : closest;
    });
    
    return {
      level: closestRange.level,
      description: closestRange.description,
      recommendation: closestRange.recommendation || 'Consulta con un profesional para más información'
    };
    
  } catch (error) {
    console.error('Error al interpretar resultados:', error);
    return {
      level: 'Error',
      description: 'Error al interpretar los resultados',
      recommendation: 'Consulta con un profesional'
    };
  }
};

// Obtener especialidades de un test para emparejamiento
export const getTestSpecialties = (test) => {
  try {
    if (test.specialties && Array.isArray(test.specialties)) {
      return test.specialties;
    }
    
    // Fallback: extraer especialidades del título o descripción
    const text = `${test.title} ${test.description}`.toLowerCase();
    const specialties = [];
    
    if (text.includes('ansiedad') || text.includes('anxiety')) {
      specialties.push('ansiedad');
    }
    if (text.includes('depresión') || text.includes('depression')) {
      specialties.push('depresión');
    }
    if (text.includes('estrés') || text.includes('stress')) {
      specialties.push('estrés');
    }
    
    return specialties.length > 0 ? specialties : ['general'];
    
  } catch (error) {
    console.error('Error al obtener especialidades:', error);
    return ['general'];
  }
};

// Función para obtener todos los tests (incluyendo borradores)
export const getEvaluationTests = async () => {
  try {
    console.log('🔄 Cargando todos los tests de evaluación...');
    
    const testsRef = collection(db, 'evaluationTests');
    const q = query(testsRef, orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    
    const tests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log('✅ Tests cargados:', tests.length);
    return { success: true, tests };
    
  } catch (error) {
    console.error('❌ Error al cargar tests:', error);
    return { success: false, error: error.message };
  }
};

// Función para obtener tests activos por especialidad
export const getActiveTestsBySpecialty = async (specialty) => {
  try {
    console.log('🔄 Cargando tests por especialidad:', specialty);
    
    const testsRef = collection(db, 'evaluationTests');
    
    // Primero intentar con la consulta completa
    let q = query(
      testsRef,
      where('state', '==', 'active'),
      where('specialties', 'array-contains', specialty)
    );
    
    let querySnapshot = await getDocs(q);
    
    // Si no hay resultados, intentar solo con state
    if (querySnapshot.empty) {
      console.log('⚠️ No se encontraron tests con array-contains, intentando solo con state...');
      q = query(testsRef, where('state', '==', 'active'));
      querySnapshot = await getDocs(q);
    }
    
    let tests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Filtrar por especialidad en el cliente si es necesario
    if (specialty && tests.length > 0) {
      tests = tests.filter(test => 
        test.specialties && test.specialties.includes(specialty)
      );
    }
    
    // Ordenar por fecha de creación (más reciente primero)
    tests.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });
    
    console.log('✅ Tests por especialidad cargados:', tests.length);
    return { success: true, tests };
    
  } catch (error) {
    console.error('❌ Error al cargar tests por especialidad:', error);
    
    // Fallback: obtener todos los tests activos y filtrar en el cliente
    try {
      console.log('🔄 Intentando fallback: obtener todos los tests activos...');
      const testsRef = collection(db, 'evaluationTests');
      const q = query(testsRef, where('state', '==', 'active'));
      const querySnapshot = await getDocs(q);
      
      let tests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Filtrar por especialidad en el cliente
      if (specialty) {
        tests = tests.filter(test => 
          test.specialties && test.specialties.includes(specialty)
        );
      }
      
      // Ordenar por fecha
      tests.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });
      
      console.log('✅ Tests por especialidad cargados (fallback):', tests.length);
      return { success: true, tests };
      
    } catch (fallbackError) {
      console.error('❌ Error en fallback:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};

// Función para crear un nuevo test de evaluación
export const createEvaluationTest = async (testData, userId) => {
  try {
    console.log('🔄 Creando nuevo test de evaluación...');
    
    const testDataWithMetadata = {
      ...testData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userId,
      state: testData.state || TEST_STATES.DRAFT
    };
    
    const docRef = await addDoc(collection(db, 'evaluationTests'), testDataWithMetadata);
    
    console.log('✅ Test creado con ID:', docRef.id);
    return { success: true, testId: docRef.id };
    
  } catch (error) {
    console.error('❌ Error al crear test:', error);
    return { success: false, error: error.message };
  }
};

// Función para actualizar un test de evaluación
export const updateEvaluationTest = async (testId, updateData) => {
  try {
    console.log('🔄 Actualizando test:', testId);
    
    const testRef = doc(db, 'evaluationTests', testId);
    const updateDataWithTimestamp = {
      ...updateData,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(testRef, updateDataWithTimestamp);
    
    console.log('✅ Test actualizado:', testId);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error al actualizar test:', error);
    return { success: false, error: error.message };
  }
};

// Función para eliminar un test de evaluación
export const deleteEvaluationTest = async (testId) => {
  try {
    console.log('🔄 Eliminando test:', testId);
    
    await deleteDoc(doc(db, 'evaluationTests', testId));
    
    console.log('✅ Test eliminado:', testId);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error al eliminar test:', error);
    return { success: false, error: error.message };
  }
};

// Función para actualizar el estado de un test
export const updateTestState = async (testId, newState) => {
  try {
    console.log('🔄 Actualizando estado del test:', testId, 'a', newState);
    
    const testRef = doc(db, 'evaluationTests', testId);
    await updateDoc(testRef, {
      state: newState,
      updatedAt: serverTimestamp()
    });
    
    console.log('✅ Estado del test actualizado:', testId);
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error al actualizar estado del test:', error);
    return { success: false, error: error.message };
  }
};

// Función para validar la estructura de un test
export const validateTestStructure = (testData) => {
  try {
    const errors = [];
    
    // Validar campos requeridos
    if (!testData.title || testData.title.trim() === '') {
      errors.push('El título es requerido');
    }
    
    if (!testData.description || testData.description.trim() === '') {
      errors.push('La descripción es requerida');
    }
    
    if (!testData.estimatedTime || testData.estimatedTime <= 0) {
      errors.push('El tiempo estimado debe ser mayor a 0');
    }
    
    // Validar preguntas de categorización
    if (!testData.categorizationQuestions || testData.categorizationQuestions.length === 0) {
      errors.push('Debe tener al menos una pregunta de categorización');
    } else {
      testData.categorizationQuestions.forEach((question, index) => {
        if (!question.text || question.text.trim() === '') {
          errors.push(`Pregunta de categorización ${index + 1}: El texto es requerido`);
        }
        if (!question.options || question.options.length < 2) {
          errors.push(`Pregunta de categorización ${index + 1}: Debe tener al menos 2 opciones`);
        }
      });
    }
    
    // Validar preguntas principales
    if (!testData.questions || testData.questions.length === 0) {
      errors.push('Debe tener al menos una pregunta');
    } else {
      testData.questions.forEach((question, index) => {
        if (!question.text || question.text.trim() === '') {
          errors.push(`Pregunta ${index + 1}: El texto es requerido`);
        }
        if (!question.type || !Object.values(QUESTION_TYPES).includes(question.type)) {
          errors.push(`Pregunta ${index + 1}: Tipo de pregunta inválido`);
        }
        if (question.type === QUESTION_TYPES.MULTIPLE_CHOICE) {
          if (!question.options || question.options.length < 2) {
            errors.push(`Pregunta ${index + 1}: Debe tener al menos 2 opciones`);
          }
        }
      });
    }
    
    // Validar rangos de puntuación
    if (!testData.scoreRanges || testData.scoreRanges.length === 0) {
      errors.push('Debe tener al menos un rango de puntuación');
    } else {
      testData.scoreRanges.forEach((range, index) => {
        if (typeof range.minScore !== 'number' || typeof range.maxScore !== 'number') {
          errors.push(`Rango ${index + 1}: Los puntajes deben ser números`);
        }
        if (range.minScore >= range.maxScore) {
          errors.push(`Rango ${index + 1}: El puntaje mínimo debe ser menor al máximo`);
        }
        if (!range.level || range.level.trim() === '') {
          errors.push(`Rango ${index + 1}: El nivel es requerido`);
        }
      });
    }
    
    // Validar especialidades
    if (!testData.specialties || testData.specialties.length === 0) {
      errors.push('Debe tener al menos una especialidad');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
    
  } catch (error) {
    console.error('Error al validar estructura del test:', error);
    return {
      isValid: false,
      errors: ['Error al validar la estructura del test']
    };
  }
};

// Función para interpretar resultado de test (alias para compatibilidad)
export const interpretTestResult = interpretTestResults;