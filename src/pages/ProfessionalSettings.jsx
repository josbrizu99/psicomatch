import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebase';
import { toggleProfessional2FA, isProfessional2FAEnabled } from '../services/twoFactorService';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const ProfessionalSettings = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', emailUpdates: true, notifications: true });

  useEffect(() => {
    if (!currentUser) { navigate('/professional-login'); return; }
    const loadData = async () => {
      try {
        setLoading(true);
        const profDoc = await getDoc(doc(db, 'professionals', currentUser.uid));
        if (profDoc.exists()) {
          const data = profDoc.data();
          setFormData({
            name: data.fullName || data.name || currentUser.displayName || '',
            email: data.email || currentUser.email || '',
            emailUpdates: data.preferences?.emailUpdates ?? true,
            notifications: data.preferences?.notifications ?? true,
          });
          if (data.photoURL) setPhotoPreview(data.photoURL);
        }
        const is2FA = await isProfessional2FAEnabled(currentUser.uid);
        setTwoFactorEnabled(is2FA);
      } catch (error) {
        console.error('Error loading professional settings:', error);
        toast.error('Error al cargar la configuracion');
      } finally { setLoading(false); }
    };
    loadData();
  }, [currentUser, navigate]);

  const handleToggle2FA = async () => {
    const newValue = !twoFactorEnabled;
    const result = await toggleProfessional2FA(currentUser.uid, newValue);
    if (result.success) {
      setTwoFactorEnabled(newValue);
      const msg = 'Autenticacion de 2 Factores ' + (newValue ? 'activada' : 'desactivada') + ' correctamente.';
      toast.success(msg);
    } else { toast.error(result.error); }
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
      const fileName = Date.now() + '_' + file.name;
      const storageRef = ref(storage, 'professional_photos/' + currentUser.uid + '/' + fileName);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'professionals', currentUser.uid), { photoURL: downloadURL });
      toast.success('Foto de perfil actualizada correctamente.');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Error al subir la foto.');
    } finally { setUploadingPhoto(false); }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'professionals', currentUser.uid), {
        fullName: formData.name,
        name: formData.name,
        preferences: { emailUpdates: formData.emailUpdates, notifications: formData.notifications },
        updatedAt: serverTimestamp(),
      });
      toast.success('Configuracion actualizada correctamente.');
    } catch (error) {
      console.error('Error updating professional settings:', error);
      toast.error('Error al actualizar la configuracion.');
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pb-24 md:pb-12">
      <div className="max-w-3xl mx-auto space-y-8">

        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors" title="Volver">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configuracion de la Cuenta</h1>
            <p className="mt-1 text-sm text-gray-600">Administra tus datos, foto de perfil y ajustes de seguridad.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Foto de Perfil</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {photoPreview ? (
                  <img src={photoPreview} alt="Foto de perfil" className="w-24 h-24 rounded-full object-cover border-4 border-teal-100 shadow" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-white text-3xl font-bold border-4 border-teal-100 shadow">
                    {formData.name ? formData.name[0].toUpperCase() : 'P'}
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
                <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} disabled={uploadingPhoto}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-teal-600 text-teal-600 rounded-lg text-sm font-medium hover:bg-teal-50 transition-colors disabled:opacity-50">
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
                  <label htmlFor="prof-name" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
                  <input type="text" name="name" id="prof-name" value={formData.name} onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm p-2 border text-gray-900" required />
                </div>
                <div>
                  <label htmlFor="prof-email" className="block text-sm font-medium text-gray-700">Correo Electronico (Solo Lectura)</label>
                  <input type="email" name="email" id="prof-email" value={formData.email} readOnly
                    className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 shadow-sm sm:text-sm p-2 border" />
                </div>
              </div>
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Preferencias de Notificacion</h3>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input id="prof-notifications" name="notifications" type="checkbox" checked={formData.notifications} onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="prof-notifications" className="font-medium text-gray-700">Notificaciones del Sistema</label>
                      <p className="text-gray-500">Recibe notificaciones sobre tus sesiones y pacientes.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input id="prof-emailUpdates" name="emailUpdates" type="checkbox" checked={formData.emailUpdates} onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="prof-emailUpdates" className="font-medium text-gray-700">Actualizaciones por Correo</label>
                      <p className="text-gray-500">Recibe noticias y actualizaciones importantes en tu correo.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end border-t border-gray-200 pt-6">
                <button type="submit" disabled={saving}
                  className="inline-flex justify-center rounded-md border border-transparent bg-teal-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50">
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
                <p className="font-medium text-gray-900">Autenticacion de Dos Factores (2FA)</p>
                <p className="text-sm text-gray-500 mt-1">Agrega una capa extra de seguridad recibiendo un codigo en tu correo al iniciar sesion.</p>
              </div>
              <div className="flex-shrink-0">
                <button onClick={handleToggle2FA}
                  className={twoFactorEnabled ? 'relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-teal-600 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2' : 'relative inline-flex h-7 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2'}>
                  <span className={twoFactorEnabled ? 'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-7' : 'pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0'} />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ProfessionalSettings;
