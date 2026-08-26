import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebase';
import { toggle2FA, is2FAEnabled } from '../services/twoFactorService';
import toast from 'react-hot-toast';

const UserSettings = () => {
  const { currentUser, userData, updateUserData } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    emailUpdates: true,
    smsUpdates: true,
    notifications: true,
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        let data = userData;
        if (!data) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            data = userDoc.data();
          }
        }

        if (data) {
          setFormData({
            name: data.name || currentUser.displayName || '',
            email: data.email || currentUser.email || '',
            emailUpdates: data.preferences?.emailUpdates ?? true,
            smsUpdates: data.preferences?.smsUpdates ?? true,
            notifications: data.preferences?.notifications ?? true,
          });
          if (data.photoURL) setPhotoPreview(data.photoURL);
        }

        const is2FA = await is2FAEnabled(currentUser.uid);
        setTwoFactorEnabled(is2FA);
      } catch (error) {
        console.error('Error loading settings:', error);
        toast.error('Error al cargar la configuración');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [currentUser, navigate, userData]);

  const handleToggle2FA = async () => {
    const newValue = !twoFactorEnabled;
    const result = await toggle2FA(currentUser.uid, newValue);
    if (result.success) {
      setTwoFactorEnabled(newValue);
      toast.success(`Autenticacion de 2 Factores ${newValue ? 'activada' : 'desactivada'} correctamente.`);
    } else {
      toast.error(result.error);
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no puede superar 5 MB.'); return; }
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result);
    reader.readAsDataURL(file);
    try {
      setUploadingPhoto(true);
      const storageRef = ref(storage, `user_photos/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', currentUser.uid), { photoURL: downloadURL });
      if (updateUserData) updateUserData({ photoURL: downloadURL });
      toast.success('Foto de perfil actualizada correctamente.');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto.');
    } finally { setUploadingPhoto(false); }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        name: formData.name,
        preferences: {
          emailUpdates: formData.emailUpdates,
          smsUpdates: formData.smsUpdates,
          notifications: formData.notifications
        },
        updatedAt: serverTimestamp()
      });

      // Update local context if needed
      if (updateUserData) {
        updateUserData({
          name: formData.name,
          preferences: {
            emailUpdates: formData.emailUpdates,
            smsUpdates: formData.smsUpdates,
            notifications: formData.notifications
          }
        });
      }

      toast.success('Configuración actualizada correctamente');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Error al actualizar la configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pb-20 md:pb-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuracion de la Cuenta</h1>
          <p className="mt-2 text-sm text-gray-600">Administra tus datos personales, preferencias y ajustes de seguridad.</p>
        </div>

        {/* Foto de Perfil */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Foto de Perfil</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border-4 border-primary-100 shadow" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold border-4 border-primary-100 shadow">
                    {formData.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-3">Sube una imagen JPG, PNG o WEBP. Maximo 5 MB.</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-50 transition-colors disabled:opacity-50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {uploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Datos del Perfil</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm p-2 border text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico (Solo Lectura)</label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm p-2 border"
                  />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Preferencias de Notificación</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        id="notifications"
                        name="notifications"
                        type="checkbox"
                        checked={formData.notifications}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="notifications" className="font-medium text-gray-700">Notificaciones del Sistema</label>
                      <p className="text-gray-500">Recibe notificaciones sobre tus sesiones y emparejamientos.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        id="emailUpdates"
                        name="emailUpdates"
                        type="checkbox"
                        checked={formData.emailUpdates}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="emailUpdates" className="font-medium text-gray-700">Actualizaciones por Correo</label>
                      <p className="text-gray-500">Recibe noticias y actualizaciones importantes en tu correo.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-gray-200 pt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Seguridad</h2>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">Autenticación de Dos Factores (2FA)</p>
                <p className="text-sm text-gray-500 mt-1">Agrega una capa extra de seguridad recibiendo un código en tu correo al iniciar sesión.</p>
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={handleToggle2FA}
                  className={`relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 ${twoFactorEnabled ? 'bg-primary-600' : 'bg-gray-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${twoFactorEnabled ? 'translate-x-7' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UserSettings;
