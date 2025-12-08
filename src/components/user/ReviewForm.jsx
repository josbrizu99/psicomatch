import React, { useState } from 'react';
import { StarRating } from './ReviewsSection';
import reviewService from '../../services/reviewService';
import toast from 'react-hot-toast';

/**
 * Formulario para crear una review
 */
const ReviewForm = ({ professionalId, userId, sessionId, onSuccess, onCancel }) => {
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (rating === 0) {
            setError('Por favor selecciona una calificación');
            return;
        }

        if (comment.trim().length < 10) {
            setError('El comentario debe tener al menos 10 caracteres');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            await reviewService.createReview(
                professionalId,
                userId,
                sessionId,
                rating,
                comment.trim()
            );

            toast.success('¡Reseña enviada exitosamente!');

            if (onSuccess) onSuccess();
        } catch (err) {
            setError(err.message || 'Error al enviar la reseña');
            toast.error('Error al enviar la reseña');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="card p-6">
            <h3 className="text-xl font-semibold mb-4">Calificar Profesional</h3>

            <form onSubmit={handleSubmit}>
                {/* Rating Stars */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        Calificación *
                    </label>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                onMouseEnter={() => setHoveredRating(star)}
                                onMouseLeave={() => setHoveredRating(0)}
                                className="focus:outline-none transition-transform hover:scale-110"
                            >
                                <svg
                                    className={`w-10 h-10 ${star <= (hoveredRating || rating)
                                            ? 'text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <p className="text-sm text-gray-600 mt-2">
                            {rating === 5 && '¡Excelente!'}
                            {rating === 4 && 'Muy bueno'}
                            {rating === 3 && 'Bueno'}
                            {rating === 2 && 'Regular'}
                            {rating === 1 && 'Necesita mejorar'}
                        </p>
                    )}
                </div>

                {/* Comment */}
                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                        Comentario * (mínimo 10 caracteres)
                    </label>
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Cuéntanos sobre tu experiencia con este profesional..."
                        rows={4}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-600"
                        maxLength={500}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                        {comment.length}/500 caracteres
                    </p>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn btn-primary flex-1"
                    >
                        {submitting ? 'Enviando...' : 'Enviar Reseña'}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={submitting}
                            className="btn flex-1"
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default ReviewForm;
