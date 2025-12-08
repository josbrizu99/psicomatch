import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center px-4">
            <div className="text-center">
                <motion.h1
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-9xl font-bold text-emerald-500 mb-4"
                >
                    404
                </motion.h1>
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl md:text-4xl font-bold text-white mb-8"
                >
                    Página no encontrada
                </motion.h2>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-neutral-400 mb-8 max-w-md mx-auto"
                >
                    Lo sentimos, la página que buscas no existe o ha sido movida.
                </motion.p>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <Link
                        to="/"
                        className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-full transition-colors duration-300"
                    >
                        Volver al Inicio
                    </Link>
                </motion.div>
            </div>
        </div>
    );
};

export default NotFound;
