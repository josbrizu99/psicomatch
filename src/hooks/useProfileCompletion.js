import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase/firebase";
import { useAuth } from "../contexts/AuthContext";

const useProfileCompletion = (isUserProfessional = false) => {
  const { currentUser } = useAuth();
  const [needsCompletion, setNeedsCompletion] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProfileCompletion = async () => {
      if (!currentUser) {
        console.log("🔍 No hay usuario autenticado");
        setLoading(false);
        return;
      }

      // Verificar si el usuario es un profesional consultando la colección de profesionales
      try {
        const professionalsRef = collection(db, "professionals");
        const q = query(
          professionalsRef,
          where("email", "==", currentUser.email.toLowerCase()),
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const profDoc = querySnapshot.docs[0];
          const profData = profDoc.data();

          // Si es profesional y está aprobado, pero no tiene género (indicador de que no pasó por ProfileWizard)
          if (profData.isApproved === true && !profData.gender) {
            console.log(
              "Profesional aprobado pero sin datos demográficos, necesita ProfileWizard",
            );
            setNeedsCompletion(true);
            setLoading(false);
            return;
          }

          console.log(
            "Profesional detectado (no aprobado o ya completado) - NO se mostrará ProfileWizard",
          );
          setNeedsCompletion(false);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error("Error al verificar si es profesional:", error);
      }

      // Si se pasa por parámetro (por ejemplo, desde un contexto que ya lo determinó)
      // y no fue atrapado por la consulta anterior (algo raro, pero por si acaso)
      if (isUserProfessional) {
        // En este punto, no sabemos si está aprobado porque no tenemos el doc,
        // pero preferimos no mostrarlo por defecto a menos que lo atrape la consulta arriba.
        setNeedsCompletion(false);
        setLoading(false);
        return;
      }

      console.log(
        "Verificando completitud del perfil para usuario:",
        currentUser.uid,
      );

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("🔍 Verificando completitud del perfil:", {
            name: userData.name,
            email: userData.email,
            gender: userData.gender,
            dateOfBirth: userData.dateOfBirth,
            phone: userData.phone,
            location: userData.location,
            language: userData.language,
            theme: userData.theme,
            timezone: userData.timezone,
          });
          console.log(
            "🔍 Todos los campos del usuario:",
            Object.keys(userData),
          );

          // Verificar campos requeridos
          const requiredFields = [
            "name",
            "email",
            "gender",
            "dateOfBirth",
            "phone",
            "location",
            "language",
            "theme",
            "timezone",
          ];
          const missingFields = requiredFields.filter((field) => {
            const value = userData[field];
            return (
              !value ||
              value === "none" ||
              value === null ||
              value === undefined
            );
          });

          console.log("Campos faltantes:", missingFields);
          console.log("Número de campos faltantes:", missingFields.length);

          if (missingFields.length > 0) {
            console.log("Perfil verificado - Necesita completarse: true");
            console.log("Razón: Campos faltantes:", missingFields);
            setNeedsCompletion(true);
          } else {
            console.log("Perfil verificado - Necesita completarse: false");
            console.log(" Razón: Todos los campos requeridos están presentes");
            setNeedsCompletion(false);
          }
        } else {
          console.log("Usuario no encontrado en Firestore");
          setNeedsCompletion(true);
        }
      } catch (error) {
        console.error("Error al verificar completitud del perfil:", error);
        setNeedsCompletion(true);
      } finally {
        setLoading(false);
        console.log("useProfileCompletion - Estado final:", {
          needsCompletion,
          loading: false,
        });
      }
    };

    checkProfileCompletion();
  }, [currentUser, isUserProfessional]);

  console.log("useProfileCompletion - Retornando:", {
    needsCompletion,
    loading,
  });
  return { needsCompletion, loading };
};

export default useProfileCompletion;
