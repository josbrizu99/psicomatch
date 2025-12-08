import React, { useState } from 'react';
import { useReviews } from '../../hooks/useReviews';
import SkeletonLoader from '../common/SkeletonLoader';

/**
 * Star Rating Display Component
 */
const StarRating = ({ rating, size = 'md' }) => {
    const sizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-6 h-6'
    };

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    className={`${sizes[size]} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
};

/**
 * Review Card Component
 */
const ReviewCard = ({ review }) => {
    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <div className="card p-4 mb-3">
            <div className="flex items-start justify-between mb-2">
                <div>
                    <StarRating rating={review.rating} size="sm" />
                    <p className="text-sm text-gray-500 mt-1">
                        {formatDate(review.createdAt)}
                    </p>
                </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300">{review.comment}</p>
            {review.helpful > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                    {review.helpful} personas encontraron esto útil
                </p>
            )}
        </div>
    );
};

/**
 * Reviews Section Component
 */
const ReviewsSection = ({ professionalId }) => {
    const { reviews, stats, loading, error } = useReviews(professionalId);
    const [showAll, setShowAll] = useState(false);

    if (loading) {
        return (
            <div className="space-y-3">
                <SkeletonLoader variant="title" />
                <SkeletonLoader variant="text" count={3} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                Error cargando reseñas: {error}
            </div>
        );
    }

    if (reviews.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p>Aún no hay reseñas para este profesional.</p>
                <p className="text-sm mt-2">¡Sé el primero en dejar una reseña!</p>
            </div>
        );
    }

    const displayedReviews = showAll ? reviews : reviews.slice(0, 3);

    return (
        <div>
            {/* Estadísticas */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <p className="text-4xl font-bold text-gray-900 dark:text-white">
                            {stats.averageRating}
                        </p>
                        <StarRating rating={Math.round(parseFloat(stats.averageRating))} />
                        <p className="text-sm text-gray-600 mt-1">
                            {stats.totalReviews} reseñas
                        </p>
                    </div>

                    {/* Distribución de estrellas */}
                    <div className="flex-1">
                        {[5, 4, 3, 2, 1].map((star) => (
                            <div key={star} className="flex items-center gap-2 mb-1">
                                <span className="text-sm w-8">{star}★</span>
                                <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-yellow-400 h-2 rounded-full"
                                        style={{
                                            width: `${((stats.distribution[star] || 0) / stats.totalReviews) * 100
                                                }%`
                                        }}
                                    />
                                </div>
                                <span className="text-sm text-gray-600 w-8">
                                    {stats.distribution[star] || 0}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Lista de reviews */}
            <div>
                <h3 className="text-lg font-semibold mb-4">Reseñas de Pacientes</h3>
                {displayedReviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                ))}

                {reviews.length > 3 && !showAll && (
                    <button
                        onClick={() => setShowAll(true)}
                        className="btn btn-primary w-full mt-4"
                    >
                        Ver todas las reseñas ({reviews.length})
                    </button>
                )}

                {showAll && (
                    <button
                        onClick={() => setShowAll(false)}
                        className="btn w-full mt-4"
                    >
                        Ver menos
                    </button>
                )}
            </div>
        </div>
    );
};

export default ReviewsSection;
export { StarRating, ReviewCard };
