import React from 'react';
import { motion } from 'framer-motion';

const ScrollReveal = ({ children, direction = 'up', delay = 0, className = '' }) => {
  const directions = {
    up: { y: 30, x: 0, scale: 1 },
    down: { y: -30, x: 0, scale: 1 },
    left: { x: 40, y: 0, scale: 1 },
    right: { x: -40, y: 0, scale: 1 },
    scale: { x: 0, y: 0, scale: 0.9 },
    none: { x: 0, y: 0, scale: 1 }
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once: false, margin: "-30px" }}
      transition={{ 
        duration: 0.4, 
        delay: delay, 
        type: "spring", 
        stiffness: 70, 
        damping: 15, 
        mass: 0.8 
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollReveal;
