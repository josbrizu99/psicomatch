import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { homeContentService, defaultHomeContent } from '../../services/homeContentService';
import PageLoader from '../common/PageLoader';

const LIMITS = {
  stats: 4,
  testimonials: 6,
  faqs: 10
};

const ManageHomeContent = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const data = await homeContentService.getHomeContent();
      setContent(data);
    } catch (error) {
      toast.error('Error al cargar la configuración del Home');
      setContent(JSON.parse(JSON.stringify(defaultHomeContent)));
    } finally {
      setLoading(false);
    }
  };

  const validateContent = () => {
    // Revisar que no haya campos requeridos vacíos
    for (const stat of content.stats) {
      if (!stat.value?.trim() || !stat.label?.trim() || !stat.description?.trim()) return false;
    }
    for (const testi of content.testimonials) {
      const textVal = testi.text || testi.content || '';
      if (!testi.name?.trim() || !testi.role?.trim() || !textVal.trim()) return false;
    }
    for (const faq of content.faqs) {
      if (!faq.question?.trim() || !faq.answer?.trim()) return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateContent()) {
      toast.error('Por favor, no dejes campos vacíos antes de guardar.');
      return;
    }
    setSaving(true);
    try {
      await homeContentService.updateHomeContent(content);
      toast.success('Contenido guardado exitosamente');
    } catch (error) {
      toast.error('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (section, index, field, value) => {
    const newContent = { ...content };
    newContent[section][index][field] = value;
    setContent(newContent);
  };

  const handleAddItem = (section) => {
    if (content[section].length >= LIMITS[section]) {
      toast.error(`El límite de elementos para esta sección es ${LIMITS[section]}`);
      return;
    }

    const newContent = { ...content };
    const emptyItem = getEmptyItemForSection(section);
    newContent[section].unshift(emptyItem);
    setContent(newContent);
  };

  const handleDeleteItem = (section, index) => {
    const newContent = { ...content };
    newContent[section].splice(index, 1);
    setContent(newContent);
  };

  const getEmptyItemForSection = (section) => {
    switch (section) {
      case 'stats':
        return { value: '', label: '', description: '' };
      case 'testimonials':
        return { name: '', role: '', rating: 5, text: '' };
      case 'faqs':
        return { question: '', answer: '' };
      default:
        return {};
    }
  };

  const renderStatsEditor = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Estadísticas ({content.stats.length}/{LIMITS.stats})</h3>
        <button 
          onClick={() => handleAddItem('stats')}
          disabled={content.stats.length >= LIMITS.stats}
          className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 disabled:opacity-50 text-sm font-medium"
        >
          + Agregar Estadística
        </button>
      </div>
      {content.stats.map((stat, index) => (
        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
          <button 
            onClick={() => handleDeleteItem('stats', index)}
            className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md"
            title="Eliminar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor</label>
              <input
                type="text"
                value={stat.value || ''}
                onChange={(e) => handleChange('stats', index, 'value', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="Ej: 500+"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Etiqueta</label>
              <input
                type="text"
                value={stat.label || ''}
                onChange={(e) => handleChange('stats', index, 'label', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="Ej: Profesionales"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input
                type="text"
                value={stat.description || ''}
                onChange={(e) => handleChange('stats', index, 'description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
                placeholder="Descripción corta"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTestimonialsEditor = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Testimonios ({content.testimonials.length}/{LIMITS.testimonials})</h3>
        <button 
          onClick={() => handleAddItem('testimonials')}
          disabled={content.testimonials.length >= LIMITS.testimonials}
          className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 disabled:opacity-50 text-sm font-medium"
        >
          + Agregar Testimonio
        </button>
      </div>
      {content.testimonials.map((testi, index) => (
        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
          <button 
            onClick={() => handleDeleteItem('testimonials', index)}
            className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md"
            title="Eliminar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
              <input
                type="text"
                value={testi.name || ''}
                onChange={(e) => handleChange('testimonials', index, 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <input
                type="text"
                value={testi.role || ''}
                onChange={(e) => handleChange('testimonials', index, 'role', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calificación (1-5)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={testi.rating || 5}
                onChange={(e) => handleChange('testimonials', index, 'rating', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Texto</label>
              <textarea
                rows="3"
                value={testi.text || testi.content || ''}
                onChange={(e) => handleChange('testimonials', index, 'text', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFaqsEditor = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-gray-800">Preguntas Frecuentes ({content.faqs.length}/{LIMITS.faqs})</h3>
        <button 
          onClick={() => handleAddItem('faqs')}
          disabled={content.faqs.length >= LIMITS.faqs}
          className="px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 disabled:opacity-50 text-sm font-medium"
        >
          + Agregar Pregunta
        </button>
      </div>
      {content.faqs.map((faq, index) => (
        <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 relative">
          <button 
            onClick={() => handleDeleteItem('faqs', index)}
            className="absolute top-4 right-4 text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded-md"
            title="Eliminar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
          <div className="grid grid-cols-1 gap-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta</label>
              <input
                type="text"
                value={faq.question || ''}
                onChange={(e) => handleChange('faqs', index, 'question', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Respuesta</label>
              <textarea
                rows="4"
                value={faq.answer || ''}
                onChange={(e) => handleChange('faqs', index, 'answer', e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 bg-white text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return <PageLoader text="Cargando configuración..." />;
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración del Home</h1>
          <p className="text-gray-600 mt-1">Edita las secciones de la página principal</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors duration-200 disabled:opacity-50 font-medium"
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-6 py-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
              activeTab === 'stats'
                ? 'border-b-2 border-teal-600 text-teal-600 bg-teal-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Estadísticas
          </button>
          <button
            onClick={() => setActiveTab('testimonials')}
            className={`px-6 py-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
              activeTab === 'testimonials'
                ? 'border-b-2 border-teal-600 text-teal-600 bg-teal-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Testimonios
          </button>
          <button
            onClick={() => setActiveTab('faqs')}
            className={`px-6 py-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap ${
              activeTab === 'faqs'
                ? 'border-b-2 border-teal-600 text-teal-600 bg-teal-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Preguntas Frecuentes
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'stats' && renderStatsEditor()}
          {activeTab === 'testimonials' && renderTestimonialsEditor()}
          {activeTab === 'faqs' && renderFaqsEditor()}
        </div>
      </div>
    </div>
  );
};

export default ManageHomeContent;
