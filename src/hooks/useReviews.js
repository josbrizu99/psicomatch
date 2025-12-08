import { useState, useEffect } from 'react';
import reviewService from '../services/reviewService';

/**
 * Hook para gestionar reviews de profesionales
 */
export const useReviews = (professionalId) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    distribution: {}
  });

  useEffect(() => {
    if (!professionalId) {
      setLoading(false);
      return;
    }

    const fetchReviews = async () => {
      try {
        setLoading(true);
        const reviewsData = await reviewService.getProfessionalReviews(professionalId);
        setReviews(reviewsData);

        // Calcular estadísticas
        if (reviewsData.length > 0) {
          const total = reviewsData.reduce((sum, r) => sum + r.rating, 0);
          const avg = total / reviewsData.length;
          const dist = reviewService.calculateRatingDistribution(reviewsData);

          setStats({
            averageRating: avg.toFixed(1),
            totalReviews: reviewsData.length,
            distribution: dist
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [professionalId]);

  const submitReview = async (userId, sessionId, rating, comment) => {
    try {
      await reviewService.createReview(professionalId, userId, sessionId, rating, comment);
      // Recargar reviews
      const updatedReviews = await reviewService.getProfessionalReviews(professionalId);
      setReviews(updatedReviews);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { reviews, stats, loading, error, submitReview };
};

/**
 * Hook para verificar si el usuario puede dejar review
 */
export const useCanReview = (userId, professionalId, sessionId) => {
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !professionalId || !sessionId) {
      setLoading(false);
      return;
    }

    const checkReview = async () => {
      try {
        const hasReviewed = await reviewService.hasUserReviewed(
          userId,
          professionalId,
          sessionId
        );
        setCanReview(!hasReviewed);
      } catch (error) {
        console.error('Error verificando review:', error);
      } finally {
        setLoading(false);
      }
    };

    checkReview();
  }, [userId, professionalId, sessionId]);

  return { canReview, loading };
};
