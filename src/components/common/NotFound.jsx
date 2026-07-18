import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import bgDesktop from '../../img/error404desktop.jpg';
import bgMobile from '../../img/error404mobile.jpg';

const NotFound = () => {
    return (
        <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
            {/* Fondo responsive */}
            <div className="absolute inset-0 -z-10">
                <picture>
                    <source media="(min-width: 768px)" srcSet={bgDesktop} />
                    <img 
                        src={bgMobile} 
                        alt="Fondo de error 404" 
                        className="w-full h-full object-cover"
                    />
                </picture>
                {/* Overlay oscuro para garantizar que el texto sea legible */}
                <div className="absolute inset-0 bg-black/50"></div>
            </div>

            <div className="text-center z-10 bg-white/10 backdrop-blur-sm p-8 md:p-12 rounded-3xl border border-white/20 shadow-2xl max-w-2xl">
                <motion.h1
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-8xl md:text-9xl font-extrabold text-white mb-2 drop-shadow-lg"
                >
                    404
                </motion.h1>
                <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-2xl md:text-4xl font-bold text-white mb-4 drop-shadow-md"
                >
                    ¡Ups! Parece que estás perdido
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-gray-200 mb-8 max-w-md mx-auto text-lg"
                >
                    La página que buscas no existe, ha cambiado de lugar o está temporalmente fuera de servicio. No te preocupes, el camino de regreso está justo aquí.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                >
                    <Link
                        to="/"
                        className="inline-flex items-center justify-center space-x-2 bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-primary-500/50"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span>Volver al Inicio</span>
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};

export default NotFound;
