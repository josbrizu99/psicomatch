import React, { useState } from 'react';

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null);

    const faqs = [
        {
            question: '¿Cómo funciona PsicoMatch?',
            answer: 'PsicoMatch utiliza un algoritmo inteligente que analiza tu perfil y necesidades para conectarte con los profesionales más compatibles. Primero completas una evaluación breve, luego recibes recomendaciones personalizadas de profesionales verificados, y finalmente puedes agendar sesiones según tu preferencia.'
        },
        {
            question: '¿Los profesionales están verificados?',
            answer: 'Sí, todos nuestros profesionales pasan por un riguroso proceso de verificación. Revisamos sus credenciales académicas, licencias profesionales y experiencia. Solo aceptamos psicólogos certificados con al menos 2 años de experiencia clínica.'
        },
        {
            question: '¿Cuánto cuesta una sesión?',
            answer: 'Los precios varían según el profesional y su especialidad, generalmente entre $30 y $80 USD por sesión de 50 minutos. Cada profesional establece sus propias tarifas, que puedes ver claramente en su perfil antes de agendar.'
        },
        {
            question: '¿Las sesiones son confidenciales?',
            answer: 'Absolutamente. Todas las sesiones y comunicaciones están protegidas por secreto profesional y encriptación de nivel bancario. Cumplimos con todas las normativas de privacidad y protección de datos de salud mental (HIPAA, GDPR).'
        },
        {
            question: '¿Puedo cambiar de profesional?',
            answer: 'Sí, puedes cambiar de profesional en cualquier momento sin costo adicional. Entendemos que la conexión terapéutica es fundamental, por lo que facilitamos el proceso de encontrar al profesional adecuado para ti.'
        },
        {
            question: '¿Qué modalidades de sesión ofrecen?',
            answer: 'Ofrecemos sesiones online por videollamada (la mayoría de profesionales) y sesiones presenciales (según disponibilidad del profesional). Puedes filtrar por modalidad al buscar profesionales y elegir la que mejor se adapte a tus necesidades.'
        },
        {
            question: '¿Necesito un diagnóstico previo?',
            answer: 'No, no necesitas un diagnóstico previo. Nuestros profesionales pueden realizar evaluaciones y diagnósticos como parte del proceso terapéutico. La evaluación inicial en la plataforma es solo para ayudarnos a hacer mejores recomendaciones.'
        },
        {
            question: '¿Cómo cancelo o reprogramo una sesión?',
            answer: 'Puedes cancelar o reprogramar sesiones desde tu panel de usuario hasta 24 horas antes de la cita sin penalización. Las cancelaciones con menos de 24 horas de anticipación pueden estar sujetas a cargos según la política del profesional.'
        }
    ];

    const toggleFAQ = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-20 pb-100 bg-white">{/* Increased to pb-40 (10rem) for ChatButton space */}
            <div className="container mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Preguntas Frecuentes
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Resolvemos tus dudas sobre PsicoMatch
                    </p>
                </div>

                {/* FAQ List */}
                <div className="max-w-3xl mx-auto">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="mb-4 border-2 border-gray-100 rounded-xl overflow-hidden hover:border-primary-200 transition-colors duration-300"
                        >
                            {/* Question */}
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full px-6 py-5 text-left flex items-center justify-between bg-white hover:bg-gray-50 transition-colors duration-200"
                            >
                                <span className="text-lg font-semibold text-gray-900 pr-8">
                                    {faq.question}
                                </span>
                                <svg
                                    className={`w-6 h-6 text-primary-600 flex-shrink-0 transition-transform duration-300 ${openIndex === index ? 'transform rotate-180' : ''
                                        }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                            </button>

                            {/* Answer */}
                            <div
                                className={`overflow-hidden transition-all duration-300 ${openIndex === index ? 'max-h-96' : 'max-h-0'
                                    }`}
                            >
                                <div className="px-6 py-5 bg-gray-50 border-t border-gray-100">
                                    <p className="text-gray-700 leading-relaxed">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Contact CTA */}
                <div className="mt-16 text-center bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8">
                    <h3 className="text-2xl font-bold text-gray-900 mb-4">
                        ¿Tienes Más Preguntas?
                    </h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                        Nuestro equipo de soporte está disponible para ayudarte. Contáctanos por email o chat en vivo.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="mailto:soporte@psicomatch.com"
                            className="inline-flex items-center justify-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-300"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>Enviar Email</span>
                        </a>
                        <button className="inline-flex items-center justify-center space-x-2 border-2 border-primary-600 text-primary-600 px-6 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors duration-300">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span>Chat en Vivo</span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FAQ;
