import React from 'react';
import ScrollReveal from '../common/ScrollReveal';

const Testimonials = () => {
    const testimonials = [
        {
            name: 'María González',
            role: 'Usuario',
            text: 'PsicoMatch me ayudó a encontrar el terapeuta perfecto para mí. El proceso fue fácil y rápido. Después de 3 meses de terapia, me siento mucho mejor.',
            rating: 5,
            avatar: 'MG',
            color: 'bg-pink-500'
        },
        {
            name: 'Carlos Rodríguez',
            role: 'Usuario',
            text: 'La plataforma es muy intuitiva y el sistema de matching realmente funciona. Mi psicólogo entiende perfectamente mis necesidades.',
            rating: 5,
            avatar: 'CR',
            color: 'bg-blue-500'
        },
        {
            name: 'Ana Martínez',
            role: 'Profesional',
            text: 'Como psicóloga, PsicoMatch me ha permitido conectar con pacientes que realmente necesitan mi especialidad. La plataforma es excelente.',
            rating: 5,
            avatar: 'AM',
            color: 'bg-purple-500'
        },
        {
            name: 'Luis Fernández',
            role: 'Usuario',
            text: 'Estaba escéptico al principio, pero la calidad de los profesionales y la facilidad de uso me convencieron. 100% recomendado.',
            rating: 5,
            avatar: 'LF',
            color: 'bg-green-500'
        },
        {
            name: 'Sofía López',
            role: 'Usuario',
            text: 'El chat en tiempo real es muy útil para consultas rápidas entre sesiones. Me siento muy apoyada por mi terapeuta.',
            rating: 5,
            avatar: 'SL',
            color: 'bg-yellow-500'
        },
        {
            name: 'Dr. Miguel Torres',
            role: 'Profesional',
            text: 'PsicoMatch ha revolucionado mi práctica. Puedo gestionar mis sesiones de forma eficiente y llegar a más personas que necesitan ayuda.',
            rating: 5,
            avatar: 'MT',
            color: 'bg-indigo-500'
        }
    ];

    return (
        <section className="py-20 bg-gray-50">
            <div className="container mx-auto px-6">
                {/* Header */}
                <ScrollReveal direction="up" className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Lo Que Dicen Nuestros Usuarios
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Miles de personas han transformado su bienestar mental con PsicoMatch
                    </p>
                </ScrollReveal>

                {/* Testimonials Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                        <ScrollReveal
                            key={index}
                            direction={index % 2 === 0 ? "left" : "right"}
                            delay={index * 0.15}
                            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300"
                        >
                            {/* Stars */}
                            <div className="flex space-x-1 mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <svg
                                        key={i}
                                        className="w-5 h-5 text-yellow-400"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>

                            {/* Quote */}
                            <p className="text-gray-700 mb-6 leading-relaxed italic">
                                "{testimonial.text}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center space-x-4">
                                <div className={`${testimonial.color} w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg`}>
                                    {testimonial.avatar}
                                </div>
                                <div>
                                    <div className="font-semibold text-gray-900">
                                        {testimonial.name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        {testimonial.role}
                                    </div>
                                </div>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                {/* Trust Indicators */}
                <ScrollReveal direction="up" delay={0.4} className="mt-16 grid md:grid-cols-3 gap-8 text-center">
                    <div>
                        <div className="text-3xl font-bold text-primary-600 mb-2">4.9/5</div>
                        <div className="text-gray-600">Calificación Promedio</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary-600 mb-2">2,500+</div>
                        <div className="text-gray-600">Reseñas Verificadas</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-primary-600 mb-2">98%</div>
                        <div className="text-gray-600">Recomendarían PsicoMatch</div>
                    </div>
                </ScrollReveal>
            </div>
        </section>
    );
};

export default Testimonials;
