import React, { useEffect, useState } from 'react';
import analyticsService from '../../services/analyticsService';
import SkeletonLoader, { SkeletonStats } from '../common/SkeletonLoader';

/**
 * Tarjeta de métrica individual
 */
const MetricCard = ({ title, value, subtitle, icon, trend, color = 'indigo' }) => {
    const colorClasses = {
        indigo: 'bg-indigo-500',
        green: 'bg-green-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500',
        red: 'bg-red-500'
    };

    return (
        <div className="card p-6">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {title}
                    </p>
                    <p className="text-3xl font-bold mt-2">{value}</p>
                    {subtitle && (
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    )}
                    {trend && (
                        <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {trend.isPositive ? '↑' : '↓'} {trend.value}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center text-white`}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Dashboard de Analytics para Admin
 */
const AnalyticsDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [profStats, setProfStats] = useState(null);
    const [sessionStats, setSessionStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllMetrics = async () => {
            try {
                setLoading(true);
                const [metricsData, users, profs, sessions] = await Promise.all([
                    analyticsService.getSystemMetrics(),
                    analyticsService.getUserStats(),
                    analyticsService.getProfessionalStats(),
                    analyticsService.getSessionStats()
                ]);

                setMetrics(metricsData);
                setUserStats(users);
                setProfStats(profs);
                setSessionStats(sessions);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAllMetrics();
    }, []);

    if (loading) {
        return <SkeletonStats />;
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                Error cargando métricas: {error}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold mb-6">Métricas Generales</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard
                        title="Total Usuarios"
                        value={metrics.totalUsers}
                        subtitle={`${userStats.active} activos`}
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        }
                        color="indigo"
                    />

                    <MetricCard
                        title="Profesionales Activos"
                        value={profStats.active}
                        subtitle={`${profStats.total} total`}
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        }
                        color="green"
                    />

                    <MetricCard
                        title="Total Sesiones"
                        value={metrics.totalSessions}
                        subtitle={`${sessionStats.completionRate}% completadas`}
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        }
                        color="blue"
                    />

                    <MetricCard
                        title="Rating Promedio"
                        value={metrics.averageRating}
                        subtitle={` ${metrics.totalReviews} reseñas`}
                        icon={
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        }
                        color="purple"
                    />
                </div>
            </div>

            {/* Detalles de Usuarios */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Estadísticas de Usuarios</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="text-2xl font-bold">{userStats.total}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Activos</p>
                        <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Inactivos</p>
                        <p className="text-2xl font-bold text-gray-400">{userStats.inactive}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Nuevos (30 días)</p>
                        <p className="text-2xl font-bold text-blue-600">{userStats.newThisMonth}</p>
                    </div>
                </div>
            </div>

            {/* Detalles de Profesionales */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Estadísticas de Profesionales</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="text-2xl font-bold">{profStats.total}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Aprobados</p>
                        <p className="text-2xl font-bold text-green-600">{profStats.approved}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Pendientes</p>
                        <p className="text-2xl font-bold text-orange-600">{profStats.pending}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Activos</p>
                        <p className="text-2xl font-bold text-blue-600">{profStats.active}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Aceptando Pacientes</p>
                        <p className="text-2xl font-bold text-indigo-600">{profStats.acceptingNew}</p>
                    </div>
                </div>
            </div>

            {/* Estado de Sesiones */}
            <div className="card p-6">
                <h3 className="text-lg font-semibold mb-4">Estado de Sesiones</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="text-2xl font-bold">{sessionStats.total}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Programadas</p>
                        <p className="text-2xl font-bold text-blue-600">{sessionStats.byStatus.scheduled}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Completadas</p>
                        <p className="text-2xl font-bold text-green-600">{sessionStats.byStatus.completed}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Canceladas</p>
                        <p className="text-2xl font-bold text-red-600">{sessionStats.byStatus.cancelled}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Este Mes</p>
                        <p className="text-2xl font-bold text-purple-600">{sessionStats.thisMonth}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
export { MetricCard };
