import React, { useState, useEffect, useMemo } from 'react';
import {
  getActiveProfessionals
} from '../../services/professionalService';
import {
  getEvaluationTests
} from '../../services/evaluationTestService';
import {
  collection,
  getDocs,
  query,
  limit,
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const DashboardHome = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProfessionals: 0,
    totalTests: 0,
    totalResults: 0,
    weeklyUsersData: [],
    recentResults: [],
    topProfessionals: [],
    evaluationTests: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Memoizar los datos para evitar recargas innecesarias
  const memoizedStats = useMemo(() => stats, [stats]);
  const memoizedWeeklyUsersData = useMemo(() => stats.weeklyUsersData, [stats.weeklyUsersData]);
  const memoizedTopProfessionals = useMemo(() => stats.topProfessionals, [stats.topProfessionals]);

  useEffect(() => {
    let isMounted = true;
    const unsubscribers = [];

    const loadData = async () => {
      try {
        await loadDashboardData();

        if (isMounted) {
          console.log('🔄 Configurando listeners en tiempo real...');

          // Usuarios
          const usersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'user')
          );
          const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            if (!isMounted) return;

            const users = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));

            setStats(prevStats => {
              const newStats = { ...prevStats };

              const recentUsers = users
                .sort((a, b) => {
                  if (a.lastLoginAt && b.lastLoginAt) {
                    const dateA = a.lastLoginAt?.toDate ? a.lastLoginAt.toDate() : new Date(a.lastLoginAt);
                    const dateB = b.lastLoginAt?.toDate ? b.lastLoginAt.toDate() : new Date(b.lastLoginAt);
                    return dateB - dateA;
                  } else if (a.lastLoginAt && !b.lastLoginAt) {
                    return -1;
                  } else if (!a.lastLoginAt && b.lastLoginAt) {
                    return 1;
                  } else {
                    const loginCountA = a.loginCount || 0;
                    const loginCountB = b.loginCount || 0;
                    if (loginCountA > 0 && loginCountB > 0) {
                      return loginCountB - loginCountA;
                    } else if (loginCountA > 0 && loginCountB === 0) {
                      return -1;
                    } else if (loginCountA === 0 && loginCountB > 0) {
                      return 1;
                    } else {
                      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                      return dateB - dateA;
                    }
                  }
                })
                .slice(0, 5);

              const weeklyUsersData = calculateWeeklyUsersData(users);
              newStats.weeklyUsersData = weeklyUsersData;
              newStats.totalUsers = users.length;
              newStats.recentUsers = recentUsers;
              return newStats;
            });
          }, (error) => {
            if (isMounted) {
              console.error('❌ Error en listener de usuarios:', error);
            }
          });
          unsubscribers.push(unsubscribeUsers);

          // Profesionales activos
          const prosQuery = query(
            collection(db, 'professionals'),
            where('status', '==', 'active')
          );
          const unsubscribePros = onSnapshot(prosQuery, (snapshot) => {
            if (!isMounted) return;
            const professionals = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const ordered = [...professionals].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
            setStats(prev => ({
              ...prev,
              totalProfessionals: professionals.length,
              topProfessionals: ordered
            }));
          });
          unsubscribers.push(unsubscribePros);

          // Resultados de tests
          const resultsQuery = query(
            collection(db, 'userTestResults'),
            orderBy('createdAt', 'desc'),
            limit(10)
          );
          const unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
            if (!isMounted) return;
            const results = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setStats(prev => ({
              ...prev,
              totalResults: results.length,
              recentResults: results
            }));
          });
          unsubscribers.push(unsubscribeResults);

          // Tests de evaluación
          const testsQuery = query(collection(db, 'evaluationTests'), orderBy('createdAt', 'desc'));
          const unsubscribeTests = onSnapshot(testsQuery, (snapshot) => {
            if (!isMounted) return;
            const tests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setStats(prev => ({
              ...prev,
              evaluationTests: tests,
              totalTests: tests.length
            }));
          });
          unsubscribers.push(unsubscribeTests);
        }
      } catch (error) {
        console.error('❌ Error al cargar datos del dashboard:', error);
      }
    };

    loadData();

    return () => {
      isMounted = false;
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, []);

  const handleRefresh = () => {
    console.log('🔄 Actualizando dashboard manualmente...');
    setLastRefresh(new Date());
    loadDashboardData();
  };

  // Función para calcular datos semanales de usuarios
  const calculateWeeklyUsersData = (users) => {
    console.log('🔄 Calculando datos semanales para', users.length, 'usuarios...');

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    console.log('📅 Rango de fechas:', {
      ahora: now.toISOString(),
      haceUnaSemana: weekAgo.toISOString()
    });

    // Crear array con los últimos 7 días
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

      // Contar usuarios registrados en este día
      const usersOnDay = users.filter(user => {
        if (!user.createdAt) {
          console.log('⚠️ Usuario sin createdAt:', user.id);
          return false;
        }

        const userDate = user.createdAt?.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
        const isInRange = userDate >= dayStart && userDate < dayEnd;

        if (isInRange) {
          console.log('✅ Usuario encontrado para', dayStart.toISOString().split('T')[0], ':', user.id, userDate.toISOString());
        }

        return isInRange;
      }).length;

      const dayData = {
        day: date.toLocaleDateString('es-ES', { weekday: 'short' }),
        date: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }),
        users: usersOnDay
      };

      console.log('📊 Datos para', dayData.day, dayData.date, ':', dayData.users, 'usuarios');
      weeklyData.push(dayData);
    }

    console.log('📊 Datos semanales calculados:', weeklyData);
    return weeklyData;
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Iniciando carga de datos del dashboard...');

      // Verificar conexión a Firestore primero
      try {
        const testQuery = query(collection(db, 'users'), limit(1));
        await getDocs(testQuery);
        console.log('✅ Conexión a Firestore verificada');
      } catch (firestoreError) {
        console.error('❌ Error de conexión a Firestore:', firestoreError);
        setError(`Error de conexión a Firestore: ${firestoreError.message}`);
        setLoading(false);
        return;
      }

      // Cargar datos paso a paso para mejor diagnóstico
      const debugData = {};

      // 1. Cargar usuarios (solo con role 'user')
      console.log('📊 Cargando usuarios...');
      try {
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'user')
        );
        const usersSnapshot = await getDocs(usersQuery);
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        debugData.users = {
          count: users.length,
          sample: users.slice(0, 5).map(u => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            photoURL: u.photoURL,
            createdAt: u.createdAt,
            status: u.status || 'active'
          }))
        };
        console.log('✅ Usuarios cargados:', users.length);
      } catch (error) {
        console.error('❌ Error al cargar usuarios:', error);
        debugData.users = { error: error.message };
      }

      // 2. Cargar profesionales
      console.log('📊 Cargando profesionales...');
      try {
        const professionalsResult = await getActiveProfessionals();
        debugData.professionals = {
          success: professionalsResult.success,
          count: professionalsResult.success ? professionalsResult.professionals.length : 0,
          error: professionalsResult.success ? null : professionalsResult.error
        };
        console.log('✅ Profesionales cargados:', professionalsResult.success ? professionalsResult.professionals.length : 'Error');
      } catch (error) {
        console.error('❌ Error al cargar profesionales:', error);
        debugData.professionals = { error: error.message };
      }


      // 3. Cargar tests de evaluación
      console.log('📊 Cargando tests de evaluación...');
      try {
        const evaluationTestsResult = await getEvaluationTests();
        debugData.evaluationTests = {
          success: evaluationTestsResult.success,
          count: evaluationTestsResult.success ? evaluationTestsResult.tests.length : 0,
          error: evaluationTestsResult.success ? null : evaluationTestsResult.error,
          sample: evaluationTestsResult.success ? evaluationTestsResult.tests.slice(0, 6).map(test => ({
            id: test.id,
            title: test.title,
            description: test.description,
            state: test.state,
            estimatedTime: test.estimatedTime,
            questions: test.questions,
            specialties: test.specialties,
            createdAt: test.createdAt
          })) : []
        };
        console.log('✅ Tests de evaluación cargados:', evaluationTestsResult.success ? evaluationTestsResult.tests.length : 'Error');
        if (evaluationTestsResult.success) {
          console.log('📊 Tests cargados:', evaluationTestsResult.tests.map(t => ({
            id: t.id,
            title: t.title,
            state: t.state,
            questions: t.questions?.length || 0
          })));
        }
      } catch (error) {
        console.error('❌ Error al cargar tests de evaluación:', error);
        debugData.evaluationTests = { error: error.message };
      }

      // 4. Cargar resultados
      console.log('📊 Cargando resultados...');
      try {
        const resultsQuery = query(collection(db, 'userResults'));
        const resultsSnapshot = await getDocs(resultsQuery);
        const results = resultsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        debugData.results = {
          count: results.length,
          sample: results.slice(0, 5).map(r => ({ id: r.id, userId: r.userId, testId: r.testId, score: r.score, createdAt: r.createdAt }))
        };
        console.log('✅ Resultados cargados:', results.length);
      } catch (error) {
        console.error('❌ Error al cargar resultados:', error);
        debugData.results = { error: error.message };
      }

      // Procesar datos para estadísticas
      const users = debugData.users?.count > 0 ? debugData.users.sample : [];
      const professionals = debugData.professionals?.success ?
        (await getActiveProfessionals()).professionals : [];
      const evaluationTests = debugData.evaluationTests?.success ?
        (await getEvaluationTests()).tests : [];
      const results = debugData.results?.count > 0 ? debugData.results.sample : [];

      const allTests = evaluationTests;

      // Obtener usuarios recientes (últimos 5) - ordenados por último login
      console.log('📊 Todos los usuarios cargados:', users.length);
      console.log('📊 Datos de usuarios:', users.map(u => ({
        name: u.name,
        lastLoginAt: u.lastLoginAt,
        loginCount: u.loginCount,
        createdAt: u.createdAt,
        hasLastLoginAt: !!u.lastLoginAt,
        hasLoginCount: (u.loginCount || 0) > 0
      })));

      // Ordenar usuarios por prioridad: lastLoginAt > loginCount > createdAt
      const recentUsers = users
        .sort((a, b) => {
          // 1. Prioridad: usuarios con lastLoginAt
          if (a.lastLoginAt && b.lastLoginAt) {
            const dateA = a.lastLoginAt?.toDate ? a.lastLoginAt.toDate() : new Date(a.lastLoginAt);
            const dateB = b.lastLoginAt?.toDate ? b.lastLoginAt.toDate() : new Date(b.lastLoginAt);
            return dateB - dateA;
          } else if (a.lastLoginAt && !b.lastLoginAt) {
            return -1; // a viene primero
          } else if (!a.lastLoginAt && b.lastLoginAt) {
            return 1; // b viene primero
          } else {
            // 2. Segunda prioridad: usuarios con loginCount > 0
            const loginCountA = a.loginCount || 0;
            const loginCountB = b.loginCount || 0;
            if (loginCountA > 0 && loginCountB > 0) {
              return loginCountB - loginCountA;
            } else if (loginCountA > 0 && loginCountB === 0) {
              return -1; // a viene primero
            } else if (loginCountA === 0 && loginCountB > 0) {
              return 1; // b viene primero
            } else {
              // 3. Tercera prioridad: por fecha de creación
              const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
              const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
              return dateB - dateA;
            }
          }
        })
        .slice(0, 5);

      console.log('📊 Usuarios recientes seleccionados:', recentUsers.map(u => ({
        name: u.name,
        lastLoginAt: u.lastLoginAt,
        loginCount: u.loginCount,
        createdAt: u.createdAt
      })));

      console.log('📊 Usuarios recientes (por último login):', recentUsers.map(u => ({
        name: u.name,
        lastLoginAt: u.lastLoginAt,
        loginCount: u.loginCount
      })));

      // Obtener resultados recientes (últimos 5)
      const recentResults = results
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateB - dateA;
        })
        .slice(0, 5);

      // Obtener profesionales mejor calificados
      const topProfessionals = professionals
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);

      // Calcular datos semanales de usuarios
      const weeklyUsersData = calculateWeeklyUsersData(users);

      const newStats = {
        totalUsers: debugData.users?.count || 0,
        totalProfessionals: debugData.professionals?.count || 0,
        totalTests: allTests.length,
        totalResults: debugData.results?.count || 0,
        weeklyUsersData,
        recentResults,
        topProfessionals,
        evaluationTests: allTests
      };

      console.log('✅ Estadísticas calculadas:', newStats);
      console.log('📊 Tests en el estado:', newStats.evaluationTests.length);
      console.log('📊 Tests detallados:', newStats.evaluationTests.map(t => ({
        id: t.id,
        title: t.title,
        state: t.state,
        questions: t.questions?.length || 0
      })));
      setStats(newStats);

    } catch (error) {
      console.error('❌ Error al cargar datos del dashboard:', error);
      setError(`Error al cargar los datos del dashboard: ${error.message}`);
    } finally {
      setLoading(false);
    }
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

  const openUserModal = (user) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
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
                onClick={loadDashboardData}
                className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
              >
                Intentar de nuevo
              </button>
            </div>
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <p className="text-gray-600">Resumen general de la aplicación</p>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-600 font-medium">Tiempo real</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {lastRefresh && (
            <span className="text-sm text-gray-500">
              Última actualización: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <div className="flex space-x-2">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
              <p className="text-2xl font-semibold text-gray-900">{memoizedStats.totalUsers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Profesionales</p>
              <p className="text-2xl font-semibold text-gray-900">{memoizedStats.totalProfessionals}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tests de Evaluación</p>
              <p className="text-2xl font-semibold text-gray-900">{memoizedStats.totalTests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-orange-100">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Resultados</p>
              <p className="text-2xl font-semibold text-gray-900">{memoizedStats.totalResults}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Users Chart */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-medium text-gray-900">Registros Semanales</h3>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">Live</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-sm text-gray-500">
                  Últimos 7 días
                </div>
                <div className="text-xs text-gray-400">
                  Total: {memoizedWeeklyUsersData.reduce((sum, day) => sum + day.users, 0)} usuarios
                </div>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center px-2 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Actualizar
                </button>
              </div>
            </div>
          </div>
          <div className="p-6">
            {memoizedWeeklyUsersData.length > 0 ? (
              <div className="h-64 w-full" style={{ minWidth: 0, minHeight: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <LineChart data={memoizedWeeklyUsersData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip
                      formatter={(value, name) => [value, 'Usuarios']}
                      labelFormatter={(label) => `Día: ${label}`}
                      contentStyle={{
                        backgroundColor: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="users"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay datos disponibles</p>
            )}
          </div>
        </div>

        {/* Recent Results */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Resultados Recientes</h3>
          </div>
          <div className="p-6">
            {stats.recentResults.length > 0 ? (
              <div className="space-y-4">
                {stats.recentResults.map((result, idx) => (
                  <div key={result.id || `recent-${idx}`} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Test: {result.testId}
                      </p>
                      <p className="text-sm text-gray-500">
                        Usuario: {result.userId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        Puntuación: {result.score || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(result.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay resultados recientes</p>
            )}
          </div>
        </div>
      </div>

      {/* Tests de Evaluación Recientes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Tests de Evaluación</h3>
            <span className="text-sm text-gray-500">
              {memoizedStats.totalTests} tests disponibles
            </span>
          </div>
        </div>
        <div className="p-6">
          {memoizedStats.totalTests > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.evaluationTests.slice(0, 6).map((test, idx) => (
                  <div key={test.id || `eval-${idx}`} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{test.title}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${test.state === 'active' ? 'bg-green-100 text-green-800' :
                          test.state === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                        }`}>
                        {test.state === 'active' ? 'Activo' :
                          test.state === 'draft' ? 'Borrador' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">{test.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{test.questions?.length || 0} preguntas</span>
                      <span>{test.estimatedTime} min</span>
                    </div>
                    {test.specialties && test.specialties.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {test.specialties.slice(0, 2).map((specialty, sIdx) => (
                            <span key={`${test.id || idx}-spec-${sIdx}`} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {specialty}
                            </span>
                          ))}
                          {test.specialties.length > 2 && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              +{test.specialties.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {memoizedStats.totalTests > 6 && (
                <div className="text-center pt-4">
                  <p className="text-sm text-gray-500">
                    Y {memoizedStats.totalTests - 6} tests más...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No hay tests de evaluación</h4>
              <p className="text-gray-600 mb-4">Crea tu primer test de evaluación para comenzar</p>
              <button className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Crear Test de Evaluación
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Top Professionals */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Profesionales Destacados</h3>
        </div>
        <div className="p-6">
          {memoizedTopProfessionals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {memoizedTopProfessionals.map((professional, idx) => (
                <div key={professional.profId || `top-${idx}`} className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-lg font-semibold">
                      {professional.name?.charAt(0)?.toUpperCase() || 'P'}
                    </span>
                  </div>
                  <h4 className="text-sm font-medium text-gray-900">{professional.name}</h4>
                  <p className="text-sm text-gray-500">{professional.speciality}</p>
                  <div className="flex items-center justify-center mt-2">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="ml-1 text-sm text-gray-600">
                        {professional.rating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay profesionales registrados</p>
          )}
        </div>
      </div>

      {/* Modal para ver detalles del usuario */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Detalles del Usuario</h3>
                <button
                  onClick={closeUserModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
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
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={`w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center ${selectedUser.photoURL ? 'hidden' : ''}`}>
                    <span className="text-white text-lg font-semibold">
                      {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-medium text-gray-900">{selectedUser.name}</h4>
                    <p className="text-sm text-gray-500">{selectedUser.email}</p>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email:</label>
                    <p className="text-sm text-gray-900">{selectedUser.email}</p>
                  </div>

                  {selectedUser.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Teléfono:</label>
                      <p className="text-sm text-gray-900">{selectedUser.phone}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado:</label>
                    <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedUser.status)}`}>
                      {selectedUser.status}
                    </span>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha de registro:</label>
                    <p className="text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={closeUserModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;
