import React from 'react';

/**
 * Componente de Skeleton Loader genérico
 * Útil para mostrar estados de carga mientras se obtienen datos
 */
const SkeletonLoader = ({
    variant = 'text',
    width = '100%',
    height,
    className = '',
    count = 1
}) => {
    // Determinar altura según variante si no se especifica
    const getHeight = () => {
        if (height) return height;

        switch (variant) {
            case 'title':
                return '1.5rem';
            case 'text':
                return '1rem';
            case 'avatar':
                return '3rem';
            case 'button':
                return '2.5rem';
            case 'card':
                return '200px';
            default:
                return '1rem';
        }
    };

    // Determinar width según variante si no se especifica
    const getWidth = () => {
        if (width !== '100%') return width;

        switch (variant) {
            case 'title':
                return '60%';
            case 'avatar':
                return '3rem';
            case 'button':
                return '120px';
            default:
                return '100%';
        }
    };

    // Determinar border radius según variante
    const getBorderRadius = () => {
        switch (variant) {
            case 'avatar':
                return 'var(--radius-full)';
            case 'button':
            case 'card':
                return 'var(--radius-md)';
            default:
                return 'var(--radius-sm)';
        }
    };

    const styles = {
        width: getWidth(),
        height: getHeight(),
        borderRadius: getBorderRadius(),
    };

    // Renderizar múltiples skeletons si count > 1
    if (count > 1) {
        return (
            <div className={`space-y-2 ${className}`}>
                {[...Array(count)].map((_, index) => (
                    <div
                        key={index}
                        className="skeleton"
                        style={styles}
                        aria-label="Cargando..."
                        role="status"
                    />
                ))}
            </div>
        );
    }

    return (
        <div
            className={`skeleton ${className}`}
            style={styles}
            aria-label="Cargando..."
            role="status"
        />
    );
};

/**
 * Skeleton para tarjetas de perfil profesional
 */
export const SkeletonProfessionalCard = () => (
    <div className="card p-6 space-y-4">
        <div className="flex items-center space-x-4">
            <SkeletonLoader variant="avatar" />
            <div className="flex-1 space-y-2">
                <SkeletonLoader variant="title" width="70%" />
                <SkeletonLoader variant="text" width="50%" />
            </div>
        </div>
        <SkeletonLoader variant="text" count={3} />
        <div className="flex gap-2">
            <SkeletonLoader variant="button" />
            <SkeletonLoader variant="button" />
        </div>
    </div>
);

/**
 * Skeleton para lista de usuarios en admin
 */
export const SkeletonUserList = ({ count = 5 }) => (
    <div className="space-y-3">
        {[...Array(count)].map((_, index) => (
            <div key={index} className="card p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                    <SkeletonLoader variant="avatar" width="2.5rem" height="2.5rem" />
                    <div className="flex-1 space-y-2">
                        <SkeletonLoader variant="text" width="40%" />
                        <SkeletonLoader variant="text" width="30%" />
                    </div>
                </div>
                <SkeletonLoader variant="button" width="80px" />
            </div>
        ))}
    </div>
);

/**
 * Skeleton para dashboard stats
 */
export const SkeletonStats = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
            <div key={index} className="card p-6 space-y-3">
                <div className="flex justify-between items-start">
                    <SkeletonLoader variant="text" width="60%" />
                    <SkeletonLoader variant="avatar" width="2rem" height="2rem" />
                </div>
                <SkeletonLoader variant="title" width="50%" />
                <SkeletonLoader variant="text" width="40%" />
            </div>
        ))}
    </div>
);

/**
 * Skeleton para tabla
 */
export const SkeletonTable = ({ rows = 5, columns = 4 }) => (
    <div className="card overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                {[...Array(columns)].map((_, index) => (
                    <SkeletonLoader key={index} variant="text" width="60%" />
                ))}
            </div>
        </div>
        {/* Rows */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {[...Array(rows)].map((_, rowIndex) => (
                <div key={rowIndex} className="p-4">
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
                        {[...Array(columns)].map((_, colIndex) => (
                            <SkeletonLoader key={colIndex} variant="text" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default SkeletonLoader;
