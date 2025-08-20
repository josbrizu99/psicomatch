import React from 'react';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  return (
    <section className="bg-gradient-to-br from-primary-50 to-secondary-50 py-20 px-4 overflow-hidden">
      <div className="max-w-4xl mx-auto text-center">
        {/* Título con animación de entrada */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight animate-fade-in-up">
          Conecta con el{' '}
          <span className="text-primary-600 animate-pulse-slow">psicólogo ideal</span>
          {' '}para ti
        </h1>
        
        {/* Subtítulo con animación de entrada */}
        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-up animation-delay-200">
          Encuentra el profesional de salud mental que mejor se adapte a tus necesidades 
          y comienza tu camino hacia el bienestar emocional.
        </p>
        
        {/* Botones con animaciones */}
        <div className="flex flex-col md:flex-row gap-6 justify-center items-center mb-12">
          <Link
            to="/login"
            className="w-full md:w-80 bg-primary-600 hover:bg-primary-700 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 text-center animate-fade-in-up animation-delay-400 group"
          >
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              <h3 className="text-xl font-bold mb-2 transition-colors duration-300">Iniciar Sesión</h3>
              <p className="text-primary-100 text-sm transition-colors duration-300">Accede a tu cuenta existente</p>
            </div>
          </Link>
          
          <Link
            to="/crear-cuenta"
            className="w-full md:w-80 bg-secondary-600 hover:bg-secondary-700 text-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-500 transform hover:-translate-y-2 hover:scale-105 text-center animate-fade-in-up animation-delay-600 group"
          >
            <div className="flex flex-col items-center">
              <svg className="w-12 h-12 mb-4 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              <h3 className="text-xl font-bold mb-2 transition-colors duration-300">Crear Cuenta</h3>
              <p className="text-secondary-100 text-sm transition-colors duration-300">Regístrate y comienza tu viaje</p>
            </div>
          </Link>
        </div>
        
        {/* Badge de confidencialidad con animación */}
        <div className="flex items-center justify-center space-x-2 text-gray-500 mb-12 animate-fade-in-up animation-delay-800">
          <svg className="w-5 h-5 animate-bounce-slow" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">100% Confidencial</span>
        </div>
        
        {/* Características con animaciones escalonadas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center animate-fade-in-up animation-delay-1000 group">
            <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-110">
              <svg className="w-8 h-8 text-primary-600 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 transition-colors duration-300">Evaluación Personalizada</h3>
            <p className="text-gray-600 transition-colors duration-300">Análisis detallado de tus necesidades específicas</p>
          </div>
          
          <div className="text-center animate-fade-in-up animation-delay-1200 group">
            <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-110">
              <svg className="w-8 h-8 text-primary-600 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 transition-colors duration-300">Psicólogos Verificados</h3>
            <p className="text-gray-600 transition-colors duration-300">Profesionales certificados y con experiencia</p>
          </div>
          
          <div className="text-center animate-fade-in-up animation-delay-1400 group">
            <div className="bg-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:scale-110">
              <svg className="w-8 h-8 text-primary-600 transition-transform duration-300 group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2 transition-colors duration-300">Sesiones Flexibles</h3>
            <p className="text-gray-600 transition-colors duration-300">Presenciales o virtuales según tu preferencia</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
