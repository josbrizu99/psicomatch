import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase/firebase';

const MAX_FILE_SIZE_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

/**
 * Valida un archivo de imagen antes de subirlo
 */
export const validateImageFile = (file) => {
  if (!file) return { valid: false, error: 'No se seleccionó ningún archivo' };
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Formato no permitido. Usá JPG, PNG o WEBP.' };
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { valid: false, error: `El archivo debe pesar menos de ${MAX_FILE_SIZE_MB}MB` };
  }
  return { valid: true };
};

/**
 * Comprime una imagen usando canvas antes de subirla
 * @param {File} file - Archivo original
 * @param {number} maxWidthPx - Ancho máximo en píxeles
 * @param {number} quality - Calidad JPEG (0-1)
 * @returns {Promise<Blob>} - Blob comprimido
 */
export const compressImage = (file, maxWidthPx = 800, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      let { width, height } = img;
      if (width > maxWidthPx) {
        height = Math.round((height * maxWidthPx) / width);
        width = maxWidthPx;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Error al comprimir imagen'));
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Error al cargar la imagen'));
    };
    img.src = url;
  });
};

/**
 * Sube una imagen a Firebase Storage con progreso
 * @param {File} file - Archivo a subir
 * @param {string} storagePath - Ruta en Storage (ej: "userProfilePhoto/uid/photo.jpg")
 * @param {function} onProgress - Callback con porcentaje de progreso (0-100)
 * @returns {Promise<{success: boolean, url?: string, error?: string}>}
 */
export const uploadImage = (file, storagePath, onProgress = null) => {
  return new Promise(async (resolve) => {
    try {
      // Comprimir antes de subir
      const compressed = await compressImage(file);
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, compressed, {
        contentType: 'image/jpeg',
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('❌ Error al subir imagen:', error);
          resolve({ success: false, error: 'Error al subir la imagen. Intenta de nuevo.' });
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ success: true, url: downloadURL });
          } catch (err) {
            resolve({ success: false, error: 'Error al obtener URL de la imagen.' });
          }
        }
      );
    } catch (error) {
      console.error('❌ Error al comprimir imagen:', error);
      resolve({ success: false, error: 'Error al procesar la imagen.' });
    }
  });
};

/**
 * Sube foto de perfil de usuario
 * @param {File} file - Archivo de imagen
 * @param {string} uid - UID del usuario
 * @param {function} onProgress - Callback de progreso
 */
export const uploadUserProfilePhoto = async (file, uid, onProgress = null) => {
  const validation = validateImageFile(file);
  if (!validation.valid) return { success: false, error: validation.error };

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `userProfilePhoto/${uid}/profile.${ext}`;
  return uploadImage(file, path, onProgress);
};

/**
 * Sube foto de perfil de profesional
 * @param {File} file - Archivo de imagen
 * @param {string} uid - UID del profesional
 * @param {function} onProgress - Callback de progreso
 */
export const uploadProfessionalProfilePhoto = async (file, uid, onProgress = null) => {
  const validation = validateImageFile(file);
  if (!validation.valid) return { success: false, error: validation.error };

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `professionalProfilePhotos/${uid}/profile.${ext}`;
  return uploadImage(file, path, onProgress);
};

/**
 * Elimina una imagen de Storage por su URL
 */
export const deleteImageByUrl = async (url) => {
  try {
    const imageRef = ref(storage, url);
    await deleteObject(imageRef);
    return { success: true };
  } catch (error) {
    console.error('❌ Error al eliminar imagen:', error);
    return { success: false, error: error.message };
  }
};
