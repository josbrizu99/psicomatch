import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';

// Datos de ejemplo para tests iniciales
const initialTests = [
  {
    title: "Test de Entrada General",
    descriptions: "Preguntas iniciales para determinar el tipo de evaluación", // Usando 'descriptions' como en tu estructura
    questions: [
      {
        id: "q1",
        text: "Me siento muy estresado últimamente",
        nextTest: "stressTest",
        alert: null
      },
      {
        id: "q2",
        text: "Últimamente siento que mi vida ya no tiene sentido",
        nextTest: "depressionTest",
        alert: {
          message: "Tu vida es valiosa 💙. Si necesitas ayuda inmediata llama al 155.",
          type: "suicidal"
        }
      },
      {
        id: "q3",
        text: "Me siento ansioso la mayor parte del tiempo",
        nextTest: "anxietyTest",
        alert: null
      },
      {
        id: "q4",
        text: "Tengo dificultad para dormir por las noches",
        nextTest: "moodTest",
        alert: null
      },
      {
        id: "q5",
        text: "Me siento bien con mi vida actual",
        nextTest: "generalTest",
        alert: null
      }
    ],
    createdBy: "adminUID",
    createdAt: new Date()
  }
];

// Datos de ejemplo para tests de evaluación
const evaluationTests = [
  {
    title: "Test de Ansiedad",
    description: "Escala breve de ansiedad",
    questions: [
      {
        id: "q1",
        text: "Me siento nervioso con frecuencia.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      },
      {
        id: "q2",
        text: "Tengo dificultad para relajarme.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      },
      {
        id: "q3",
        text: "Me preocupo demasiado por las cosas.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      }
    ],
    createdBy: "adminUID",
    createdAt: new Date()
  },
  {
    title: "Test de Depresión",
    description: "Escala breve de depresión",
    questions: [
      {
        id: "q1",
        text: "Me siento triste la mayor parte del tiempo.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      },
      {
        id: "q2",
        text: "He perdido interés en actividades que antes disfrutaba.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      },
      {
        id: "q3",
        text: "Me siento sin energía.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      }
    ],
    createdBy: "adminUID",
    createdAt: new Date()
  },
  {
    title: "Test de Estrés",
    description: "Escala de estrés percibido",
    questions: [
      {
        id: "q1",
        text: "Me siento abrumado por las responsabilidades.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      },
      {
        id: "q2",
        text: "Tengo dificultad para concentrarme.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      },
      {
        id: "q3",
        text: "Me siento irritable con facilidad.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      }
    ],
    createdBy: "adminUID",
    createdAt: new Date()
  },
  {
    title: "Test de Estado de Ánimo",
    description: "Evaluación del estado de ánimo general",
    questions: [
      {
        id: "q1",
        text: "Me siento optimista sobre el futuro.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      },
      {
        id: "q2",
        text: "Disfruto de las actividades diarias.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      },
      {
        id: "q3",
        text: "Me siento satisfecho con mi vida.",
        type: "likert",
        options: ["Nunca", "A veces", "Frecuentemente", "Siempre"]
      }
    ],
    createdBy: "adminUID",
    createdAt: new Date()
  }
];

// Datos de ejemplo para profesionales (sin profId ya que es el ID del documento)
const professionals = [
  {
    name: "Dra. María López",
    email: "maria.psico@gmail.com",
    photoURL: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150&h=150&fit=crop&crop=face",
    speciality: "Ansiedad", // Usando 'speciality' como en tu estructura
    exprecienceYears: 8, // Usando 'exprecienceYears' como en tu estructura
    bio: "Psicóloga clínica especializada en trastornos de ansiedad y terapia cognitivo-conductual. Con amplia experiencia en el tratamiento de fobias, ataques de pánico y estrés postraumático.",
    contact: {
      phone: "+595981234567",
      email: "maria.psico@gmail.com",
      whatsapp: "https://wa.me/595981234567",
      instagram: "https://instagram.com/maria.psico",
      linkedin: "https://linkedin.com/in/maria-psico"
    },
    rating: 4.8,
    ratingCount: 15,
    status: "active"
  },
  {
    name: "Dr. Carlos Rodríguez",
    email: "carlos.psico@gmail.com",
    photoURL: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face",
    speciality: "Depresión",
    exprecienceYears: 12,
    bio: "Psicólogo especializado en depresión y trastornos del estado de ánimo. Utilizo un enfoque integrativo combinando terapia cognitivo-conductual y mindfulness.",
    contact: {
      phone: "+595982345678",
      email: "carlos.psico@gmail.com",
      whatsapp: "https://wa.me/595982345678",
      instagram: "https://instagram.com/carlos.psico",
      linkedin: "https://linkedin.com/in/carlos-psico"
    },
    rating: 4.9,
    ratingCount: 23,
    status: "active"
  },
  {
    name: "Lic. Ana Martínez",
    email: "ana.psico@gmail.com",
    photoURL: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=150&h=150&fit=crop&crop=face",
    speciality: "Estrés",
    exprecienceYears: 6,
    bio: "Psicóloga especializada en manejo del estrés y técnicas de relajación. Experta en terapia de aceptación y compromiso (ACT) para el manejo del estrés laboral.",
    contact: {
      phone: "+595983456789",
      email: "ana.psico@gmail.com",
      whatsapp: "https://wa.me/595983456789",
      instagram: "https://instagram.com/ana.psico",
      linkedin: "https://linkedin.com/in/ana-psico"
    },
    rating: 4.7,
    ratingCount: 18,
    status: "active"
  },
  {
    name: "Dr. Roberto Silva",
    email: "roberto.psico@gmail.com",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    speciality: "Estado de Ánimo",
    exprecienceYears: 10,
    bio: "Psicólogo especializado en trastornos del estado de ánimo y terapia interpersonal. Con experiencia en el tratamiento de trastornos bipolares y depresión resistente.",
    contact: {
      phone: "+595984567890",
      email: "roberto.psico@gmail.com",
      whatsapp: "https://wa.me/595984567890",
      instagram: "https://instagram.com/roberto.psico",
      linkedin: "https://linkedin.com/in/roberto-psico"
    },
    rating: 4.6,
    ratingCount: 12,
    status: "active"
  },
  {
    name: "Lic. Patricia González",
    email: "patricia.psico@gmail.com",
    photoURL: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
    speciality: "General",
    exprecienceYears: 15,
    bio: "Psicóloga general con amplia experiencia en diferentes enfoques terapéuticos. Especializada en terapia familiar y de pareja, así como en problemas de autoestima.",
    contact: {
      phone: "+595985678901",
      email: "patricia.psico@gmail.com",
      whatsapp: "https://wa.me/595985678901",
      instagram: "https://instagram.com/patricia.psico",
      linkedin: "https://linkedin.com/in/patricia-psico"
    },
    rating: 4.9,
    ratingCount: 31,
    status: "active"
  }
];

// Función para verificar si ya existen datos
const checkExistingData = async () => {
  try {
    const [initialTestsSnapshot, evaluationTestsSnapshot, professionalsSnapshot] = await Promise.all([
      getDocs(collection(db, 'initialTest')), // Usando 'initialTest'
      getDocs(collection(db, 'evaluationTest')), // Usando 'evaluationTest' singular
      getDocs(collection(db, 'professionals'))
    ]);

    return {
      hasInitialTests: !initialTestsSnapshot.empty,
      hasEvaluationTests: !evaluationTestsSnapshot.empty,
      hasProfessionals: !professionalsSnapshot.empty
    };
  } catch (error) {
    console.error('Error al verificar datos existentes:', error);
    return {
      hasInitialTests: false,
      hasEvaluationTests: false,
      hasProfessionals: false
    };
  }
};

// Función principal para poblar datos
export const populateSampleData = async () => {
  try {
    // Verificar datos existentes
    const existingData = await checkExistingData();
    
    let addedCount = 0;
    const results = [];

    // Agregar tests iniciales si no existen
    if (!existingData.hasInitialTests) {
      for (const test of initialTests) {
        try {
          await addDoc(collection(db, 'initialTest'), test); // Usando 'initialTest' singular
          addedCount++;
          results.push(`✅ Test inicial agregado: ${test.title}`);
        } catch (error) {
          results.push(`❌ Error al agregar test inicial: ${error.message}`);
        }
      }
    } else {
      results.push('ℹ️ Tests iniciales ya existen');
    }

    // Agregar tests de evaluación si no existen
    if (!existingData.hasEvaluationTests) {
      for (const test of evaluationTests) {
        try {
          await addDoc(collection(db, 'evaluationTest'), test); // Usando 'evaluationTest' singular
          addedCount++;
          results.push(`✅ Test de evaluación agregado: ${test.title}`);
        } catch (error) {
          results.push(`❌ Error al agregar test de evaluación: ${error.message}`);
        }
      }
    } else {
      results.push('ℹ️ Tests de evaluación ya existen');
    }

    // Agregar profesionales si no existen
    if (!existingData.hasProfessionals) {
      for (const professional of professionals) {
        try {
          // El ID del documento será el profId automáticamente
          await addDoc(collection(db, 'professionals'), professional);
          addedCount++;
          results.push(`✅ Profesional agregado: ${professional.name}`);
        } catch (error) {
          results.push(`❌ Error al agregar profesional: ${error.message}`);
        }
      }
    } else {
      results.push('ℹ️ Profesionales ya existen');
    }

    return {
      success: true,
      message: `Se agregaron ${addedCount} elementos a la base de datos`,
      results: results
    };

  } catch (error) {
    console.error('Error al poblar datos de ejemplo:', error);
    return {
      success: false,
      error: error.message
    };
  }
};
