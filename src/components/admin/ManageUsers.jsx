import React, { useState, useEffect } from 'react';
import { collection, getDocs, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
// import { deleteUserWithAdmin } from '../../services/adminService'; // Removido - solo eliminamos de Firestore

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setUsers(usersData);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
      setError('Error al cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };


  const updateUserStatus = async (userId, newStatus) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus
      });
      
      // Actualizar el estado local
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
    } catch (error) {
      console.error('Error al actualizar estado:', error);
    }
  };

  const deleteUser = async (userId) => {
    try {
      console.log('🔄 Iniciando eliminación del usuario:', userId);
      
      // Eliminar solo datos de Firestore
      console.log('🔄 Eliminando datos de Firestore...');
      
      // 1. Eliminar documento de Firestore
      await deleteDoc(doc(db, 'users', userId));
      console.log('✅ Documento de Firestore eliminado');
      
      // 2. Eliminar datos relacionados en otras colecciones
      try {
        // Eliminar datos de userActivity
        const activityQuery = query(collection(db, 'userActivity'), where('userId', '==', userId));
        const activitySnapshot = await getDocs(activityQuery);
        const activityPromises = activitySnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(activityPromises);
        console.log('✅ Datos de actividad eliminados');
        
        // Eliminar datos de userSessions
        const sessionsQuery = query(collection(db, 'userSessions'), where('userId', '==', userId));
        const sessionsSnapshot = await getDocs(sessionsQuery);
        const sessionsPromises = sessionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(sessionsPromises);
        console.log('✅ Datos de sesiones eliminados');
        
        // Eliminar datos de userTestResults
        const testResultsQuery = query(collection(db, 'userTestResults'), where('userId', '==', userId));
        const testResultsSnapshot = await getDocs(testResultsQuery);
        const testResultsPromises = testResultsSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(testResultsPromises);
        console.log('✅ Resultados de tests eliminados');
        
      } catch (relatedDataError) {
        console.warn('⚠️ Error al eliminar datos relacionados:', relatedDataError);
        // Continuar aunque falle la eliminación de datos relacionados
      }
      
      // 3. Actualizar el estado local
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
      
      // 4. Cerrar modal
      setShowDeleteModal(false);
      setUserToDelete(null);
      
      // 5. Mostrar popup de éxito por 2 segundos
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
      }, 2000);
      
      console.log('✅ Datos de usuario eliminados de Firestore');
      
    } catch (error) {
      console.error('❌ Error al eliminar usuario:', error);
    }
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const openUserModal = (user) => {
    console.log('👤 Abriendo modal de usuario:', user);
    console.log('🔍 Preferencias del usuario:', user.preferences);
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-purple-600 bg-purple-100';
      case 'user': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-800">{error}</p>
            <button 
              onClick={loadUsers}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">Administra los usuarios registrados en la plataforma</p>
        </div>
        <button
          onClick={loadUsers}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          🔄 Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol
            </label>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos los roles</option>
              <option value="admin">Administradores</option>
              <option value="user">Usuarios</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              {filteredUsers.length} de {users.length} usuarios
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha de Registro
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Inicios de Sesión
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {user.photoURL ? (
                        <img 
                          src={user.photoURL} 
                          alt={user.name || 'Usuario'} 
                          className="w-10 h-10 rounded-full object-cover"
                          onError={(e) => {
                            // Si la imagen falla al cargar, mostrar iniciales
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center ${user.photoURL ? 'hidden' : ''}`}
                        style={{ display: user.photoURL ? 'none' : 'flex' }}
                      >
                        <span className="text-white text-sm font-semibold">
                          {user.name?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || 'Sin nombre'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(user.role || 'user')}`}>
                      {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.status || 'active'}
                      onChange={(e) => updateUserStatus(user.id, e.target.value)}
                      className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${getStatusColor(user.status || 'active')}`}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(user.createdAt)}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {user.loginCount || 0}
                    </span>
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openUserModal(user)}
                        className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        title="Ver detalles del usuario"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openDeleteModal(user)}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar usuario"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No se encontraron usuarios que coincidan con los filtros</p>
          </div>
        )}
      </div>

      {/* Modal de Detalles del Usuario */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Detalles del Usuario</h3>
                <button
                  onClick={closeUserModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  {selectedUser.photoURL ? (
                    <img 
                      src={selectedUser.photoURL} 
                      alt={selectedUser.name || 'Usuario'} 
                      className="w-12 h-12 rounded-full object-cover"
                      onError={(e) => {
                        // Si la imagen falla al cargar, mostrar iniciales
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center ${selectedUser.photoURL ? 'hidden' : ''}`}
                    style={{ display: selectedUser.photoURL ? 'none' : 'flex' }}
                  >
                    <span className="text-white text-lg font-semibold">
                      {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">{selectedUser.name || 'Sin nombre'}</h4>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  {/* Información Básica */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Rol:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(selectedUser.role || 'user')}`}>
                        {selectedUser.role === 'admin' ? 'Administrador' : 'Usuario'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Estado:</span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedUser.status || 'active')}`}>
                        {selectedUser.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Fecha de registro:</span>
                      <span className="text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Último acceso:</span>
                      <span className="text-sm text-gray-900">{formatDate(selectedUser.lastLoginAt)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Primer login:</span>
                      <span className="text-sm text-gray-900">{formatDate(selectedUser.firstLoginAt)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-500">Última actividad:</span>
                      <span className="text-sm text-gray-900">{formatDate(selectedUser.lastActivityAt)}</span>
                    </div>
                  </div>

                  {/* Estadísticas de Actividad */}
                  <div className="border-t pt-4 mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Estadísticas de Actividad</h5>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-xs text-blue-600 font-medium">Inicios de Sesión</div>
                        <div className="text-lg font-bold text-blue-800">{selectedUser.loginCount || 0}</div>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-xs text-green-600 font-medium">Sesiones Totales</div>
                        <div className="text-lg font-bold text-green-800">{selectedUser.totalSessions || 0}</div>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="text-xs text-purple-600 font-medium">Sesiones Activas</div>
                        <div className="text-lg font-bold text-purple-800">{selectedUser.activeSessions || 0}</div>
                      </div>
                      
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="text-xs text-orange-600 font-medium">Tiempo Total (min)</div>
                        <div className="text-lg font-bold text-orange-800">{selectedUser.totalTimeSpent || 0}</div>
                      </div>
                      
                      <div className="bg-indigo-50 p-3 rounded-lg">
                        <div className="text-xs text-indigo-600 font-medium">Días Activos</div>
                        <div className="text-lg font-bold text-indigo-800">{selectedUser.daysActive || 0}</div>
                      </div>
                      
                      <div className="bg-pink-50 p-3 rounded-lg">
                        <div className="text-xs text-pink-600 font-medium">Racha de Días</div>
                        <div className="text-lg font-bold text-pink-800">{selectedUser.streakDays || 0}</div>
                      </div>
                      
                      <div className="bg-teal-50 p-3 rounded-lg">
                        <div className="text-xs text-teal-600 font-medium">Tiempo en App (min)</div>
                        <div className="text-lg font-bold text-teal-800">{selectedUser.totalTimeInApp || 0}</div>
                      </div>
                      
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <div className="text-xs text-yellow-600 font-medium">Última Notificación</div>
                        <div className="text-sm font-bold text-yellow-800">{formatDate(selectedUser.lastNotificationSent)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Progreso del Perfil */}
                  {selectedUser.profileCompleteness !== undefined && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-500">Completitud del Perfil:</span>
                        <span className="text-sm font-bold text-gray-900">{selectedUser.profileCompleteness || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${selectedUser.profileCompleteness || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Estadísticas de Tests */}
                  <div className="border-t pt-4 mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Resultados de Tests</h5>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Tests Completados:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedUser.testsCompleted || 0}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Evaluaciones:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedUser.evaluationsCompleted || 0}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Matches con Profesionales:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedUser.professionalMatches || 0}</span>
                      </div>
                      
                      {selectedUser.averageSessionRating > 0 && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-500">Calificación Promedio:</span>
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">{selectedUser.averageSessionRating.toFixed(1)}</span>
                            <div className="flex ml-1">
                              {[...Array(5)].map((_, i) => (
                                <svg key={i} className={`w-3 h-3 ${i < Math.floor(selectedUser.averageSessionRating) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Información Personal */}
                  <div className="border-t pt-4 mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Información Personal</h5>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Género:</span>
                        <span className="text-sm text-gray-900">{selectedUser.gender || 'No especificado'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Fecha de Nacimiento:</span>
                        <span className="text-sm text-gray-900">{formatDate(selectedUser.dateOfBirth)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Teléfono:</span>
                        <span className="text-sm text-gray-900">{selectedUser.phone !== 'none' ? selectedUser.phone : 'No especificado'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Ubicación:</span>
                        <span className="text-sm text-gray-900">{selectedUser.location !== 'none' ? selectedUser.location : 'No especificado'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Idioma:</span>
                        <span className="text-sm text-gray-900">{selectedUser.language !== 'none' ? selectedUser.language : 'No especificado'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Zona Horaria:</span>
                        <span className="text-sm text-gray-900">{selectedUser.timezone !== 'none' ? selectedUser.timezone : 'No especificado'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Tema:</span>
                        <span className="text-sm text-gray-900">{selectedUser.theme !== 'none' ? selectedUser.theme : 'No especificado'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Nivel de Privacidad:</span>
                        <span className="text-sm text-gray-900">{selectedUser.privacyLevel !== 'none' ? selectedUser.privacyLevel : 'No especificado'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Profesional Asignado */}
                  {selectedUser.matchedProfessional && selectedUser.matchedProfessional !== 'null' && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Profesional Asignado:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedUser.matchedProfessional}</span>
                      </div>
                    </div>
                  )}

                  {/* Progreso del Test */}
                  {selectedUser.testProgress && selectedUser.testProgress !== 'null' && (
                    <div className="border-t pt-4 mt-4">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Progreso del Test:</span>
                        <span className="text-sm font-medium text-gray-900">{selectedUser.testProgress}</span>
                      </div>
                    </div>
                  )}

                  {/* Preferencias del Usuario */}
                  <div className="border-t pt-4 mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Preferencias de Notificaciones</h5>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Notificaciones:</span>
                        <span className={`text-sm font-medium ${selectedUser.preferences?.notifications ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedUser.preferences?.notifications ? 'Habilitadas' : 'Deshabilitadas'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Actualizaciones por Email:</span>
                        <span className={`text-sm font-medium ${selectedUser.preferences?.emailUpdates ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedUser.preferences?.emailUpdates ? 'Habilitadas' : 'Deshabilitadas'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Actualizaciones por SMS:</span>
                        <span className={`text-sm font-medium ${selectedUser.preferences?.smsUpdates ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedUser.preferences?.smsUpdates ? 'Habilitadas' : 'Deshabilitadas'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Información de Auditoría */}
                  <div className="border-t pt-4 mt-4">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Información de Auditoría</h5>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Última actualización:</span>
                        <span className="text-sm text-gray-900">{formatDate(selectedUser.updatedAt)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Actualizado por:</span>
                        <span className="text-sm text-gray-900">{selectedUser.updatedBy !== 'none' ? selectedUser.updatedBy : 'Sistema'}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Versión del perfil:</span>
                        <span className="text-sm text-gray-900">{selectedUser.version || 0}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Última sesión:</span>
                        <span className="text-sm text-gray-900">{formatDate(selectedUser.lastSessionAt)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-500">Último test completado:</span>
                        <span className="text-sm text-gray-900">{formatDate(selectedUser.lastTestCompletedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={closeUserModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    closeUserModal();
                    openDeleteModal(selectedUser);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  Eliminar Usuario
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mt-4">Confirmar Eliminación</h3>
              <div className="mt-4 px-7 py-3">
                <p className="text-sm text-gray-500 mb-4">
                  ¿Estás seguro de que quieres eliminar al usuario <strong>{userToDelete.name}</strong>?
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Esta acción no se puede deshacer y se eliminarán todos los datos asociados al usuario.
                </p>
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-800">
                    <strong>Se eliminarán de Firestore:</strong>
                  </p>
                  <ul className="text-sm text-red-700 mt-2 list-disc list-inside">
                    <li>Perfil del usuario</li>
                    <li>Historial de sesiones</li>
                    <li>Resultados de tests</li>
                    <li>Datos de actividad</li>
                    <li>Todos los datos relacionados</li>
                  </ul>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mt-3">
                  <p className="text-sm text-blue-800">
                    <strong>Importante:</strong> La cuenta de autenticación (Firebase Auth) NO se eliminará automáticamente. 
                    Debes eliminarla manualmente desde Firebase Console → Authentication → Users.
                  </p>
                </div>
              </div>
              <div className="items-center px-4 py-3">
                <button
                  onClick={() => deleteUser(userToDelete.id)}
                  className="px-4 py-2 bg-red-500 text-white text-base font-medium rounded-md w-24 mr-2 hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-300"
                >
                  Eliminar
                </button>
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-300 text-gray-800 text-base font-medium rounded-md w-24 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Popup de éxito al eliminar usuario */}
      {showSuccessPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg max-w-sm mx-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Usuario eliminado exitosamente</h3>
                <p className="text-sm text-gray-500 mt-1">El usuario ha sido eliminado de la base de datos</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers;
