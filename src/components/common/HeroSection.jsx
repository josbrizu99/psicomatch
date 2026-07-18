import React from 'react';
import { Link } from 'react-router-dom';
import ScrollReveal from '../common/ScrollReveal';

const HeroSection = () => {
  return (
    <div className="relative bg-surface-off">
      
      {/* Top Banner Area */}
      <div className="relative bg-primary-900 pt-32 pb-56 lg:pb-72 overflow-hidden">
        {/* Background Image / Overlay */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&q=80" 
            alt="Psicomatch Background" 
            className="w-full h-full object-cover opacity-20"
          />
          {/* Capas de color para el tono Teal/Sage sofisticado */}
          <div className="absolute inset-0 bg-[#0a3835]/80 mix-blend-multiply z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#051c1a] to-transparent z-10 opacity-90"></div>
        </div>

        {/* Main Content Area */}
        <div className="container mx-auto px-6 relative z-20">
          <ScrollReveal direction="up" className="max-w-2xl">
            <p className="text-primary-200 font-bold tracking-wider mb-3 uppercase text-sm flex items-center gap-2">
              <span className="w-8 h-0.5 bg-primary-400"></span>
              Bienvenidos a Psicomatch
            </p>
            <h1 className="text-5xl lg:text-7xl font-extrabold mb-6 text-white leading-[1.1] tracking-tight">
              Atención Psicológica <br/>
              <span className="text-primary-400">en tu Idioma</span>
            </h1>
            <p className="text-lg text-gray-300 mb-10 max-w-lg leading-relaxed font-light">
              Conectamos a personas con profesionales de la salud mental certificados. 
              Recibe atención personalizada y de calidad desde donde estés.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link
                to="/crear-cuenta"
                className="inline-block border-2 border-white text-white px-8 py-3.5 rounded-xl font-medium text-lg hover:bg-white hover:text-primary-900 transition-all duration-300 shadow-lg"
              >
                Empieza ahora
              </Link>
              <Link
                to="/login"
                className="inline-block bg-white/10 backdrop-blur-sm border-2 border-transparent text-white px-8 py-3.5 rounded-xl font-medium text-lg hover:bg-white/20 transition-all duration-300"
              >
                ¿Ya tienes una cuenta? Inicia sesión
              </Link>
            </div>
            
            <div className="mt-8 flex justify-start">
              <Link 
                to="/professional-login" 
                className="text-white/80 hover:text-white text-sm font-medium transition-colors duration-200 flex items-center gap-2 group"
              >
                 <span>¿Eres profesional? Únete como especialista o inicia sesión</span>
                 <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                 </svg>
              </Link>
            </div>
          </ScrollReveal>
        </div>
        
        {/* Bottom Wave Divider */}
        <div className="absolute bottom-0 w-full z-20 leading-none pointer-events-none">
          <svg viewBox="0 0 1440 320" className="w-full h-auto text-surface-off fill-current" preserveAspectRatio="none">
            <path d="M0,160L48,176C96,192,192,224,288,218.7C384,213,480,171,576,149.3C672,128,768,128,864,154.7C960,181,1056,235,1152,240C1248,245,1344,203,1392,181.3L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>
      </div>

      {/* Cards Section (Overlapping the wave) */}
      <div className="relative z-30 -mt-24 md:-mt-40 pb-20">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            
            {/* Highlighted Card 1 */}
            <ScrollReveal direction="left" delay={0.1} className="bg-gradient-to-br from-primary-500 to-primary-700 p-8 lg:p-10 rounded-3xl shadow-[0_20px_40px_-15px_rgba(20,184,166,0.5)] transform hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-6 text-white backdrop-blur-sm group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Evaluaciones</h3>
              <p className="text-primary-50 mb-8 text-sm leading-relaxed opacity-90">
                Asegura un diagnóstico certero con nuestro sistema inteligente. Encuentra exactamente el especialista que entiende y puede manejar tu caso particular.
              </p>
              <Link to="/evaluacion-emocional" className="inline-block bg-white text-primary-700 font-semibold px-6 py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors shadow-sm">
                Ver más
              </Link>
            </ScrollReveal>

            {/* White Card 2 */}
            <ScrollReveal direction="up" delay={0.3} className="bg-white p-8 lg:p-10 rounded-3xl shadow-xl border border-gray-100 transform hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary-100 transition-all">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Sesiones Online</h3>
              <p className="text-gray-600 mb-8 text-sm leading-relaxed">
                Toma terapia desde tu entorno seguro. Conéctate con profesionales calificados de manera remota con total privacidad y flexibilidad horaria.
              </p>
              <Link to="/sesiones" className="inline-block bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm">
                Ver más
              </Link>
            </ScrollReveal>

            {/* White Card 3 */}
            <ScrollReveal direction="right" delay={0.5} className="bg-white p-8 lg:p-10 rounded-3xl shadow-xl border border-gray-100 transform hover:-translate-y-2 transition-all duration-300 group">
              <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-primary-100 transition-all">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Mide tu Avance</h3>
              <p className="text-gray-600 mb-8 text-sm leading-relaxed">
                Visualiza tu evolución emocional. Mide tu progreso mediante gráficas intuitivas para asegurar que estás alcanzando tus metas personales.
              </p>
              <Link to="/mis-resultados" className="inline-block bg-primary-600 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-primary-700 transition-colors shadow-sm">
                Ver más
              </Link>
            </ScrollReveal>

          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
