import React from 'react';
import { resetOnboarding } from '../../utils/onboarding';
import {
    userOnboardingTour,
    professionalOnboardingTour,
    featureTour
} from '../../utils/onboarding';

/**
 * Botón de ayuda flotante que permite relanzar tours o ver ayuda específica
 */
const HelpButton = ({ userType = 'user' }) => {
    const [showMenu, setShowMenu] = React.useState(false);
    const [isVisible, setIsVisible] = React.useState(true);

    // Ocultar botón al hacer scroll hacia abajo (inverso al ScrollToTopButton)
    React.useEffect(() => {
        const toggleVisibility = () => {
            if (window.pageYOffset > 300) {
                setIsVisible(false);
                setShowMenu(false); // También cerrar el menú si se oculta
            } else {
                setIsVisible(true);
            }
        };

        window.addEventListener('scroll', toggleVisibility);
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const handleRestartTour = () => {
        resetOnboarding(userType);
        if (userType === 'professional') {
            professionalOnboardingTour();
        } else {
            userOnboardingTour();
        }
        setShowMenu(false);
    };

    const handleFeatureTour = (feature) => {
        featureTour(feature);
        setShowMenu(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-[150px] right-4 sm:bottom-28 sm:right-8 z-50">
            {/* Menú desplegable */}
            {showMenu && (
                <div className="absolute bottom-16 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 p-2 min-w-[200px]">
                    <button
                        onClick={handleRestartTour}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-sm"
                    >
                        🎯 Ver Tour Completo
                    </button>

                    <div className="border-t dark:border-gray-700 my-2"></div>

                    <p className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400">
                        Ayuda Rápida:
                    </p>

                    <button
                        onClick={() => handleFeatureTour('chat')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-sm"
                    >
                        💬 Cómo usar el Chat
                    </button>

                    <button
                        onClick={() => handleFeatureTour('reviews')}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-sm"
                    >
                        ⭐ Cómo dejar Reviews
                    </button>

                    <div className="border-t dark:border-gray-700 my-2"></div>

                    <a
                        href="/faq"
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-sm"
                        onClick={() => setShowMenu(false)}
                    >
                        ❓ FAQ
                    </a>

                    <a
                        href="/contact"
                        className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-sm"
                        onClick={() => setShowMenu(false)}
                    >
                        📧 Contactar Soporte
                    </a>
                </div>
            )}

            {/* Botón principal */}
            <button
                onClick={() => setShowMenu(!showMenu)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-all hover:scale-110"
                aria-label="Ayuda"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </button>
        </div>
    );
};

export default HelpButton;
