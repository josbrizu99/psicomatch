import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Obtener tests iniciales
export const getInitialTests = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'initialTest'));
    const tests = [];
    
    querySnapshot.forEach((doc) => {
      tests.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, tests };
  } catch (error) {
    console.error('Error al obtener tests iniciales:', error);
    return { success: false, error: error.message };
  }
};

// Obtener tests de evaluación
export const getEvaluationTests = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'evaluationTest'));
    const tests = [];
    
    querySnapshot.forEach((doc) => {
      tests.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, tests };
  } catch (error) {
    console.error('Error al obtener tests de evaluación:', error);
    return { success: false, error: error.message };
  }
};

// Obtener test inicial específico
export const getInitialTest = async (testId) => {
  try {
    const testDoc = await getDoc(doc(db, 'initialTest', testId));
    if (testDoc.exists()) {
      return { success: true, test: { id: testDoc.id, ...testDoc.data() } };
    } else {
      return { success: false, error: 'Test inicial no encontrado' };
    }
  } catch (error) {
    console.error('Error al obtener test inicial:', error);
    return { success: false, error: error.message };
  }
};

// Obtener test de evaluación específico
export const getEvaluationTest = async (testId) => {
  try {
    const testDoc = await getDoc(doc(db, 'evaluationTest', testId));
    if (testDoc.exists()) {
      return { success: true, test: { id: testDoc.id, ...testDoc.data() } };
    } else {
      return { success: false, error: 'Test de evaluación no encontrado' };
    }
  } catch (error) {
    console.error('Error al obtener test de evaluación:', error);
    return { success: false, error: error.message };
  }
};

// Agregar test inicial
export const addInitialTest = async (testData) => {
  try {
    const testToAdd = {
      ...testData,
      createdAt: serverTimestamp(),
      createdBy: "adminUID" // Esto debería ser el UID del admin actual
    };
    
    const docRef = await addDoc(collection(db, 'initialTest'), testToAdd);
    return { success: true, testId: docRef.id };
  } catch (error) {
    console.error('Error al agregar test inicial:', error);
    return { success: false, error: error.message };
  }
};

// Agregar test de evaluación
export const addEvaluationTest = async (testData) => {
  try {
    const testToAdd = {
      ...testData,
      createdAt: serverTimestamp(),
      createdBy: "adminUID" // Esto debería ser el UID del admin actual
    };
    
    const docRef = await addDoc(collection(db, 'evaluationTest'), testToAdd);
    return { success: true, testId: docRef.id };
  } catch (error) {
    console.error('Error al agregar test de evaluación:', error);
    return { success: false, error: error.message };
  }
};

// Actualizar test inicial
export const updateInitialTest = async (testId, updateData) => {
  try {
    await updateDoc(doc(db, 'initialTest', testId), updateData);
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar test inicial:', error);
    return { success: false, error: error.message };
  }
};

// Actualizar test de evaluación
export const updateEvaluationTest = async (testId, updateData) => {
  try {
    await updateDoc(doc(db, 'evaluationTest', testId), updateData);
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar test de evaluación:', error);
    return { success: false, error: error.message };
  }
};

// Eliminar test inicial
export const deleteInitialTest = async (testId) => {
  try {
    await deleteDoc(doc(db, 'initialTest', testId));
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar test inicial:', error);
    return { success: false, error: error.message };
  }
};

// Eliminar test de evaluación
export const deleteEvaluationTest = async (testId) => {
  try {
    await deleteDoc(doc(db, 'evaluationTest', testId));
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar test de evaluación:', error);
    return { success: false, error: error.message };
  }
};

// Guardar resultado de test
export const saveTestResult = async (resultData) => {
  try {
    const resultToSave = {
      ...resultData,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'userResults'), resultToSave);
    return { success: true, resultId: docRef.id };
  } catch (error) {
    console.error('Error al guardar resultado de test:', error);
    return { success: false, error: error.message };
  }
};

// Obtener resultados de un usuario
export const getUserResults = async (userId) => {
  try {
    const q = query(
      collection(db, 'userResults'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const results = [];
    
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, results };
  } catch (error) {
    console.error('Error al obtener resultados del usuario:', error);
    return { success: false, error: error.message };
  }
};

// Obtener resultado específico
export const getTestResult = async (resultId) => {
  try {
    const resultDoc = await getDoc(doc(db, 'userResults', resultId));
    if (resultDoc.exists()) {
      return { success: true, result: { id: resultDoc.id, ...resultDoc.data() } };
    } else {
      return { success: false, error: 'Resultado no encontrado' };
    }
  } catch (error) {
    console.error('Error al obtener resultado:', error);
    return { success: false, error: error.message };
  }
};

// Actualizar resultado
export const updateTestResult = async (resultId, updateData) => {
  try {
    await updateDoc(doc(db, 'userResults', resultId), updateData);
    return { success: true };
  } catch (error) {
    console.error('Error al actualizar resultado:', error);
    return { success: false, error: error.message };
  }
};

// Eliminar resultado
export const deleteTestResult = async (resultId) => {
  try {
    await deleteDoc(doc(db, 'userResults', resultId));
    return { success: true };
  } catch (error) {
    console.error('Error al eliminar resultado:', error);
    return { success: false, error: error.message };
  }
};
