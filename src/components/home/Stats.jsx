import React from 'react';
import ScrollReveal from '../common/ScrollReveal';

const Stats = () => {
    const statistics = [
        {
            value: '500+',
            label: 'Profesionales Verificados',
            description: 'Psicólogos certificados listos para ayudarte',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
            color: 'from-blue-500 to-blue-600'
        },
        {
            value: '10,000+',
            label: 'Sesiones Completadas',
            description: 'Miles de personas han encontrado apoyo',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            color: 'from-green-500 to-green-600'
        },
        {
            value: '95%',
            label: 'Satisfacción de Usuarios',
            description: 'Calificación promedio de nuestros servicios',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
            ),
            color: 'from-yellow-500 to-yellow-600'
        },
        {
            value: '50+',
            label: 'Especialidades',
            description: 'Profesionales en diversas áreas de salud mental',
            icon: (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
            ),
            color: 'from-purple-500 to-purple-600'
        }
    ];

    return (
        <section className="py-20 bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                {/* Header */}
                <ScrollReveal direction="up" className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-white mb-4">
                        Números que Hablan por Nosotros
                    </h2>
                    <p className="text-xl text-primary-100 max-w-2xl mx-auto">
                        Miles de personas ya han encontrado el apoyo que necesitaban
                    </p>
                </ScrollReveal>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {statistics.map((stat, index) => (
                        <ScrollReveal
                            key={index}
                            direction={index % 2 === 0 ? "scale" : "up"}
                            delay={index * 0.1}
                            className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105"
                        >
                            {/* Icon */}
                            <div className={`w-16 h-16 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white mb-6`}>
                                {stat.icon}
                            </div>

                            {/* Value */}
                            <div className="text-5xl font-bold text-white mb-2">
                                {stat.value}
                            </div>

                            {/* Label */}
                            <div className="text-lg font-semibold text-primary-100 mb-2">
                                {stat.label}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-primary-200">
                                {stat.description}
                            </p>
                        </ScrollReveal>
                    ))}
                </div>

                {/* Additional Info */}
                <ScrollReveal direction="up" delay={0.4} className="mt-16 text-center">
                    <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-white font-medium">Actualizamos nuestras estadísticas mensualmente</span>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
};

export default Stats;
