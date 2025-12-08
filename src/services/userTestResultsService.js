import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Guardar resultados del test del usuario en la colección Userresults
export const saveUserTestResults = async (userId, testData, answers, score, interpretation) => {
  try {
    console.log('🔄 Guardando resultados del test para usuario:', userId);
    
    // Generar ID único para el resultado
    const resultId = `${userId}_${testData.id}_${Date.now()}`;
    
    // Convertir respuestas al formato requerido
    const formattedAnswers = Object.entries(answers).map(([questionId, answerId]) => {
      const question = testData.questions.find(q => q.id === questionId);
      const option = question?.options.find(opt => opt.id === answerId);
      
      return {
        questionId: questionId,
        answer: option?.text || 'No respondido',
        createdAt: new Date() // Usar Date() en lugar de serverTimestamp() para arrays
      };
    });
    
    const testResults = {
      resultId: resultId,
      userId: userId,
      testId: testData.id,
      testType: 'initial', // Tipo de evaluación inicial
      score: score,
      answers: formattedAnswers,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'Userresults'), testResults);
    
    console.log('✅ Resultados del test guardados con ID:', docRef.id);
    return { success: true, resultId: docRef.id };
    
  } catch (error) {
    console.error('❌ Error al guardar resultados del test:', error);
    return { success: false, error: error.message };
  }
};

// Obtener historial de tests del usuario
export const getUserTestHistory = async (userId) => {
  try {
    console.log('🔄 Obteniendo historial de tests para usuario:', userId);
    
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    
    const testResultsRef = collection(db, 'Userresults');
    
    // Intentar primero sin orderBy para evitar problemas de índice
    let q = query(testResultsRef, where('userId', '==', userId));
    let querySnapshot = await getDocs(q);
    
    // Si no hay resultados, intentar obtener todos los resultados para debug
    if (querySnapshot.empty) {
      console.log('⚠️ No se encontraron resultados para el usuario, obteniendo todos los resultados para debug...');
      const allResultsQuery = query(testResultsRef);
      const allResultsSnapshot = await getDocs(allResultsQuery);
      
      if (allResultsSnapshot.empty) {
        console.log('❌ No hay resultados en la colección Userresults');
        return { 
          success: false, 
          error: 'No hay resultados de evaluación disponibles',
          debug: { totalResults: 0, userResults: 0 }
        };
      }
      
      const allResults = allResultsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      const userResults = allResults.filter(result => result.userId === userId);
      
      console.log('📊 Debug - Total resultados:', allResults.length, 'Resultados del usuario:', userResults.length);
      
      if (userResults.length > 0) {
        // Ordenar por fecha en el cliente
        userResults.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        
        console.log('✅ Resultados del usuario encontrados (filtrado en cliente):', userResults.length);
        return { success: true, results: userResults };
      }
      
      return { 
        success: false, 
        error: `No hay resultados para este usuario. Total: ${allResults.length}, Usuario: ${userResults.length}`,
        debug: { 
          totalResults: allResults.length, 
          userResults: userResults.length,
          allResults: allResults
        }
      };
    }
    
    const results = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Ordenar por fecha en el cliente
    results.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    });
    
    console.log('✅ Historial de tests obtenido:', results.length, 'resultados');
    return { success: true, results };
    
  } catch (error) {
    console.error('❌ Error al obtener historial de tests:', error);
    
    // Fallback: obtener todos los resultados y filtrar en el cliente
    try {
      console.log('🔄 Intentando fallback: obtener todos los resultados...');
      const { collection, query, getDocs } = await import('firebase/firestore');
      
      const testResultsRef = collection(db, 'Userresults');
      const q = query(testResultsRef);
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const allResults = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const userResults = allResults.filter(result => result.userId === userId);
        
        // Ordenar por fecha en el cliente
        userResults.sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        });
        
        console.log('✅ Historial de tests obtenido (fallback):', userResults.length);
        return { success: true, results: userResults };
      }
      
      return { success: false, error: 'No hay resultados de evaluación disponibles' };
      
    } catch (fallbackError) {
      console.error('❌ Error en fallback:', fallbackError);
      return { success: false, error: fallbackError.message };
    }
  }
};
