import React, { useState, useRef, useCallback } from 'react';
import { validateImageFile } from '../../services/storageService';

/**
 * Componente reutilizable para carga de imágenes con drag & drop, preview y progreso.
 *
 * Props:
 *   onFileSelected(file)   - Se llama cuando el usuario selecciona un archivo válido
 *   currentPhotoURL        - URL de foto existente para mostrar como preview inicial
 *   uploadProgress         - Número 0-100 para mostrar barra de progreso
 *   isUploading            - Boolean que indica si está subiendo
 *   label                  - Texto del label (default: "Foto de perfil")
 *   hint                   - Texto de ayuda debajo del uploader
 *   className              - Clases CSS adicionales
 */
const ImageUploader = ({
  onFileSelected,
  currentPhotoURL = null,
  uploadProgress = 0,
  isUploading = false,
  label = 'Foto de perfil',
  hint = null,
  className = '',
}) => {
  const [preview, setPreview] = useState(currentPhotoURL);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = useCallback(
    (file) => {
      setError('');
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error);
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onFileSelected(file);
    },
    [onFileSelected]
  );

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClick = () => {
    if (!isUploading) fileInputRef.current?.click();
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}

      <div
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer
          ${dragOver ? 'border-primary-400 bg-primary-50 scale-[1.01]' : 'border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-gray-100'}
          ${isUploading ? 'pointer-events-none opacity-75' : ''}
        `}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleInputChange}
          disabled={isUploading}
        />

        {preview ? (
          /* Preview de la imagen seleccionada */
          <div className="flex flex-col items-center p-4">
            <div className="relative">
              <img
                src={preview}
                alt="Preview"
                className="w-28 h-28 sm:w-32 sm:h-32 rounded-full object-cover shadow-md border-4 border-white ring-2 ring-primary-200"
              />
              {!isUploading && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClick(); }}
                  className="absolute -bottom-1 -right-1 bg-primary-600 text-white rounded-full p-1.5 shadow-lg hover:bg-primary-700 transition-colors"
                  title="Cambiar foto"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {isUploading ? 'Subiendo...' : 'Tocá para cambiar la foto'}
            </p>
          </div>
        ) : (
          /* Estado vacío */
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-colors ${dragOver ? 'bg-primary-100' : 'bg-gray-200'}`}>
              <svg className={`w-8 h-8 transition-colors ${dragOver ? 'text-primary-500' : 'text-gray-400'}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700 text-center">
              {dragOver ? 'Soltá aquí la imagen' : 'Arrastrá o hacé clic para seleccionar'}
            </p>
            <p className="text-xs text-gray-400 mt-1">JPG, PNG o WEBP · Máx. 5MB</p>
          </div>
        )}

        {/* Barra de progreso */}
        {isUploading && (
          <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-primary-600 font-medium">Subiendo...</span>
              <span className="text-xs text-primary-600 font-medium">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-primary-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mensaje de error */}
      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}

      {/* Hint */}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-gray-500 flex items-start gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          {hint}
        </p>
      )}
    </div>
  );
};

export default ImageUploader;
