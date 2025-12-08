import React, { useState } from 'react';
import matchingService from '../../services/matchingService';
import { StarRating } from '../user/ReviewsSection';
import SkeletonLoader, { SkeletonProfessionalCard } from '../common/SkeletonLoader';

/**
 * Tarjeta de profesional mejorada con score de matching
 */
const ProfessionalMatchCard = ({ professional, userProfile, onSelect }) => {
    const matchScore = professional.matchScore || 0;
    const reasons = matchingService.getMatchReasons(userProfile, professional, matchScore);

    const getScoreColor = (score) => {
        if (score >= 80) return 'text-green-600 bg-green-50';
        if (score >= 60) return 'text-blue-600 bg-blue-50';
        return 'text-gray-600 bg-gray-50';
    };

    return (
        <div className="card p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {professional.nombre?.charAt(0)}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold">{professional.nombre}</h3>
                        <p className="text-sm text-gray-600">{professional.especialidad}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={Math.round(parseFloat(professional.averageRating) || 0)} size="sm" />
                            <span className="text-sm text-gray-600">
                                ({professional.totalReviews || 0} reseñas)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Match Score */}
                <div className={`px-3 py-1 rounded-full ${getScoreColor(matchScore)}`}>
                    <span className="text-sm font-semibold">{matchScore}% Match</span>
                </div>
            </div>

            {/* Razones del Match */}
            {reasons.length > 0 && (
                <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Por qué es una buena opción:</p>
                    <ul className="space-y-1">
                        {reasons.slice(0, 3).map((reason, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-green-600 mt-0.5">✓</span>
                                {reason}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Información adicional */}
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                    <p className="text-gray-600">Experiencia</p>
                    <p className="font-medium">{professional.yearsOfExperience || 0} años</p>
                </div>
                <div>
                    <p className="text-gray-600">Precio por sesión</p>
                    <p className="font-medium">${professional.sessionPrice || 'N/A'}</p>
                </div>
                <div>
                    <p className="text-gray-600">Modalidad</p>
                    <p className="font-medium">
                        {professional.offersOnline && professional.offersInPerson
                            ? 'Online y Presencial'
                            : professional.offersOnline
                                ? 'Solo Online'
                                : 'Solo Presencial'}
                    </p>
                </div>
                <div>
                    <p className="text-gray-600">Disponibilidad</p>
                    <p className={`font-medium ${professional.acceptingNewPatients ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {professional.acceptingNewPatients ? 'Disponible' : 'No disponible'}
                    </p>
                </div>
            </div>

            <button
                onClick={() => onSelect(professional)}
                className="btn btn-primary w-full"
                disabled={!professional.acceptingNewPatients}
            >
                {professional.acceptingNewPatients ? 'Ver Perfil Completo' : 'No Disponible'}
            </button>
        </div>
    );
};

/**
 * Lista de profesionales recomendados
 */
const RecommendedProfessionals = ({ userId, userProfile, onSelectProfessional }) => {
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    React.useEffect(() => {
        const fetchRecommendations = async () => {
            try {
                setLoading(true);
                const recommended = await matchingService.getRecommendedProfessionals(
                    userId,
                    userProfile,
                    10
                );
                setProfessionals(recommended);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (userId && userProfile) {
            fetchRecommendations();
        }
    }, [userId, userProfile]);

    if (loading) {
        return (
            <div className="space-y-4">
                <SkeletonProfessionalCard />
                <SkeletonProfessionalCard />
                <SkeletonProfessionalCard />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                Error cargando profesionales: {error}
            </div>
        );
    }

    if (professionals.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No se encontraron profesionales disponibles.</p>
                <p className="text-sm mt-2">Intenta ajustar tus preferencias.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-6">Profesionales Recomendados para Ti</h2>
            {professionals.map((prof) => (
                <ProfessionalMatchCard
                    key={prof.id}
                    professional={prof}
                    userProfile={userProfile}
                    onSelect={onSelectProfessional}
                />
            ))}
        </div>
    );
};

export default RecommendedProfessionals;
export { ProfessionalMatchCard };
