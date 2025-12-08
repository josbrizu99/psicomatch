import React, { useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useProfessionalAuth } from '../../contexts/ProfessionalAuthContext';
import {
    userOnboardingTour,
    professionalOnboardingTour,
    shouldShowOnboarding
} from '../../utils/onboarding';

/**
 * Componente que controla cuándo mostrar el tour de onboarding
 */
const OnboardingTrigger = ({ children }) => {
    const { currentUser } = useAuth();
    const { isUserProfessional } = useProfessionalAuth();

    useEffect(() => {
        // Esperar un poco para que la UI cargue completamente
        const timer = setTimeout(() => {
            if (!currentUser) return;

            if (isUserProfessional) {
                // Tour para profesionales
                if (shouldShowOnboarding('professional')) {
                    professionalOnboardingTour();
                }
            } else {
                // Tour para usuarios regulares
                if (shouldShowOnboarding('user')) {
                    userOnboardingTour();
                }
            }
        }, 1500); // Esperar 1.5 segundos

        return () => clearTimeout(timer);
    }, [currentUser, isUserProfessional]);

    return <>{children}</>;
};

export default OnboardingTrigger;
