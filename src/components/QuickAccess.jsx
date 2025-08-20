import React from 'react';
import { Link } from 'react-router-dom';

const QuickAccess = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            ¿Ya tienes una cuenta?
          </h2>
          <p className="text-xl text-gray-600">
            Accede rápidamente a tu perfil o crea una nueva cuenta para comenzar
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Botón Iniciar Sesión */}
          <Link
            to="/login"
            className="group relative overflow-hidden bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl p-8 text-center text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Iniciar Sesión</h3>
              <p className="text-primary-100">
                Accede a tu cuenta existente
              </p>
            </div>
          </Link>

          {/* Botón Crear Cuenta */}
          <Link
            to="/crear-cuenta"
            className="group relative overflow-hidden bg-gradient-to-r from-secondary-500 to-secondary-600 rounded-2xl p-8 text-center text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-secondary-600 to-secondary-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative z-10">
              <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-2">Crear Cuenta</h3>
              <p className="text-secondary-100">
                Regístrate y comienza tu viaje
              </p>
            </div>
          </Link>
        </div>

        {/* Información adicional */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-6 text-gray-600">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Registro gratuito</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Sin compromiso</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Datos seguros</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default QuickAccess;
