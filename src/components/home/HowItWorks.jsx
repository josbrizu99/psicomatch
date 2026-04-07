import React from 'react';
import { Link } from 'react-router-dom';
import ScrollReveal from '../common/ScrollReveal';

const HowItWorks = () => {
    const steps = [
        {
            number: '01',
            title: 'Completa tu Evaluación',
            description: 'Responde un breve cuestionario sobre tu estado emocional y necesidades. Solo toma 5 minutos.',
            icon: (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
        },
        {
            number: '02',
            title: 'Recibe Recomendaciones',
            description: 'Nuestro algoritmo inteligente te conecta con los profesionales más compatibles con tu perfil personal.',
            icon: (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
            ),
        },
        {
            number: '03',
            title: 'Comienza tu Terapia',
            description: 'Agenda sesiones online o presenciales según tu preferencia. Chatea y recibe seguimiento continuo y constante.',
            icon: (
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            ),
        }
    ];

    return (
        <section className="relative py-28 overflow-hidden bg-surface-off">
            {/* Background Liquid blobs */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-[-10%] w-[40rem] h-[40rem] bg-primary-200/40 rounded-full mix-blend-multiply filter blur-[80px] animate-float-slow"></div>
                <div className="absolute bottom-[-10%] left-[-5%] w-[35rem] h-[35rem] bg-secondary-200/40 rounded-full mix-blend-multiply filter blur-[80px] animate-float-slow" style={{ animationDelay: '2s' }}></div>
                <div className="absolute top-[40%] left-[20%] w-[25rem] h-[25rem] bg-primary-300/20 rounded-full mix-blend-multiply filter blur-[60px] animate-pulse-soft"></div>
            </div>

            <div className="container mx-auto px-6 relative z-10">
                {/* Header */}
                <ScrollReveal direction="up" className="text-center mb-20">
                    <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
                        ¿Cómo Funciona?
                    </h2>
                    <p className="text-xl text-gray-800 max-w-2xl mx-auto font-medium leading-relaxed">
                        Es sumamente fluido y orgánico. Encontrar el apoyo psicológico ideal nunca había sido tan simple y certero.
                    </p>
                </ScrollReveal>

                {/* Steps */}
                <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative max-w-6xl mx-auto">
                    {/* Connector Line (hidden on mobile, uses a subtle gradient inside the grid logic, but improved visually below) */}
                    <div className="hidden md:block absolute top-[4.5rem] left-[15%] right-[15%] h-px bg-gradient-to-r from-transparent via-primary-300/50 to-transparent z-0" />

                    {steps.map((step, index) => (
                        <ScrollReveal 
                            key={index}
                            direction={['left', 'scale', 'right'][index % 3]}
                            delay={index * 0.15}
                            className="relative"
                        >
                            {/* Glass Card */}
                            <div className="relative bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-8 lg:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(20,184,166,0.15)] transition-all duration-300 z-10 h-full flex flex-col group hover:-translate-y-2">
                                
                                {/* Number Badge Floating */}
                                <div className="absolute -top-5 -right-5 w-14 h-14 bg-gradient-to-br from-primary-100 to-white rounded-full flex items-center justify-center text-primary-600 font-extrabold text-xl shadow-sm border border-white/80 z-20 group-hover:scale-110 transition-transform">
                                    {step.number}
                                </div>

                                {/* Icon Sphere Glass */}
                                <div className="w-24 h-24 bg-gradient-to-br from-primary-50 to-white/60 backdrop-blur-md rounded-[2rem] flex items-center justify-center text-primary-600 mb-8 border border-white/80 shadow-inner group-hover:scale-105 transition-transform duration-300 mx-auto md:mx-0">
                                    {step.icon}
                                </div>

                                {/* Content */}
                                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center md:text-left">
                                    {step.title}
                                </h3>
                                <p className="text-gray-800 leading-relaxed font-medium text-center md:text-left text-[1.05rem]">
                                    {step.description}
                                </p>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                {/* CTA */}
                <ScrollReveal direction="up" delay={0.6} className="text-center mt-20">
                    <Link
                        to="/crear-cuenta"
                        className="inline-block bg-primary-600 text-white px-10 py-4 rounded-xl font-medium text-lg hover:bg-primary-700 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_20px_0_rgba(20,184,166,0.3)] shadow-primary-500/30"
                    >
                        Comenzar Ahora - Es Gratis
                    </Link>
                </ScrollReveal>
            </div>
        </section>
    );
};

export default HowItWorks;
