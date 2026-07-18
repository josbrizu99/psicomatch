import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import SkeletonLoader from '../common/SkeletonLoader';
import ScrollReveal from '../common/ScrollReveal';

const FeaturedProfessionals = () => {
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProfessional, setSelectedProfessional] = useState(null);

    useEffect(() => {
        const fetchFeaturedProfessionals = async () => {
            try {
                console.log("🔍 Fetching professionals...");
                const professionalsRef = collection(db, 'professionals');

                // Estrategia: Traer todos y filtrar en cliente para evitar problemas de índices en desarrollo
                const querySnapshot = await getDocs(professionalsRef);

                console.log(`✅ Documents found: ${querySnapshot.size}`);

                const prosData = [];

                querySnapshot.forEach((doc) => {
                    const data = doc.data();

                    // Filtrado en cliente: mostrar verificados Y aprobados
                    if (data.isVerified === true || data.isApproved === true) {
                        const allSpecialties = data.specialities || data.specialties || [];
                        const specialtyStr = Array.isArray(allSpecialties) && allSpecialties.length > 0
                            ? allSpecialties[0]
                            : typeof allSpecialties === 'string' ? allSpecialties : 'Psicología General';

                        const exp = parseInt(data.exprecienceYears || data.yearsOfExperience || data.experienceYears) || 0;

                        prosData.push({
                            id: doc.id,
                            name: data.fullName || data.displayName || data.name || 'Profesional',
                            specialty: specialtyStr,
                            experience: exp > 0 ? `${exp} año${exp !== 1 ? 's' : ''}` : 'N/A',
                            rating: typeof data.rating === 'number' ? data.rating :
                                    typeof data.averageRating === 'number' ? data.averageRating : 0,
                            reviewCount: data.ratingCount || data.reviewCount || 0,
                            price: data.hourlyRate ? `$${data.hourlyRate}` :
                                   data.sessionPrice ? `$${data.sessionPrice}` : 'Consultar',
                            avatar: data.photoURL || (data.fullName ? data.fullName.charAt(0).toUpperCase() :
                                    data.name ? data.name.charAt(0).toUpperCase() : 'P'),
                            photoURL: data.photoURL || null,
                            color: 'bg-primary-500',
                            verified: data.isVerified || data.isApproved,
                            online: data.availability?.isAvailable === true,
                            modalities: data.modalities || {},
                            bio: data.bio || data.aboutMe || 'Profesional de la salud mental dedicado al bienestar de sus pacientes.',
                        });
                    }
                });

                // Ordenar por rating descendente
                prosData.sort((a, b) => b.rating - a.rating);

                // Limitar a 4 profesionales
                const topProfessionals = prosData.slice(0, 4);
                setProfessionals(topProfessionals);
            } catch (error) {
                console.error("❌ Error fetching professionals:", error);

                if (error.code === 'permission-denied') {
                    console.warn("⚠️ Permission denied. Showing Mock Data. Please update Firestore Security Rules to allow public read access to 'professionals'.");
                    // Fallback to Mock Data so the UI isn't empty
                    const mockProfessionals = [
                        {
                            id: 'mock1',
                            name: 'Dra. María González (Mock)',
                            specialty: 'Ansiedad y Estrés',
                            experience: '8 años',
                            rating: 4.9,
                            reviewCount: 127,
                            price: '$45',
                            avatar: 'MG',
                            color: 'bg-blue-500',
                            verified: true,
                            online: true
                        },
                        {
                            id: 'mock2',
                            name: 'Dr. Carlos Rodríguez (Mock)',
                            specialty: 'Depresión',
                            experience: '12 años',
                            rating: 5.0,
                            reviewCount: 203,
                            price: '$60',
                            avatar: 'CR',
                            color: 'bg-purple-500',
                            verified: true,
                            online: true
                        },
                        {
                            id: 'mock3',
                            name: 'Lic. Ana Martínez (Mock)',
                            specialty: 'Terapia de Pareja',
                            experience: '6 años',
                            rating: 4.8,
                            reviewCount: 89,
                            price: '$50',
                            avatar: 'AM',
                            color: 'bg-pink-500',
                            verified: true,
                            online: false
                        },
                        {
                            id: 'mock4',
                            name: 'Dr. Luis Fernández (Mock)',
                            specialty: 'Trauma y PTSD',
                            experience: '10 años',
                            rating: 4.9,
                            reviewCount: 156,
                            price: '$55',
                            avatar: 'LF',
                            color: 'bg-green-500',
                            verified: true,
                            online: true
                        }
                    ];
                    setProfessionals(mockProfessionals);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchFeaturedProfessionals();
    }, []);

    if (loading) {
        return (
            <section className="py-20 bg-white">
                <div className="container mx-auto px-6">
                    <div className="text-center mb-16">
                        <SkeletonLoader width="300px" height="40px" className="mx-auto mb-4" />
                        <SkeletonLoader width="500px" height="20px" className="mx-auto" />
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="h-96"><SkeletonLoader width="100%" height="100%" /></div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Si no hay profesionales, no renderizar la sección o mostrar mensaje
    if (professionals.length === 0) return null;

    return (
        <section className="py-20 bg-white">
            <div className="container mx-auto px-6">
                {/* Header */}
                <ScrollReveal direction="up" className="text-center mb-16">
                    <h2 className="text-4xl font-bold text-gray-900 mb-4">
                        Profesionales Destacados
                    </h2>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Conoce a algunos de nuestros profesionales mejor calificados
                    </p>
                </ScrollReveal>

                {/* Professionals Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {professionals.map((professional, index) => (
                        <ScrollReveal
                            key={professional.id}
                            direction={index % 2 === 0 ? "scale" : "up"}
                            delay={index * 0.15}
                            className="bg-white rounded-2xl border-2 border-gray-100 hover:border-primary-200 hover:shadow-xl transition-all duration-300 overflow-hidden group h-full flex flex-col"
                        >
                            {/* Card Header */}
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 text-center relative">
                                {/* Online Badge */}
                                {professional.online && (
                                    <div className="absolute top-4 right-4">
                                        <div className="flex items-center space-x-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            <span>Online</span>
                                        </div>
                                    </div>
                                )}

                                {/* Avatar */}
                                <div className={`${professional.color} w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold shadow-lg transform group-hover:scale-110 transition-transform duration-300 overflow-hidden`}>
                                    {professional.photoURL ? (
                                        <img src={professional.photoURL} alt={professional.name} className="w-full h-full object-cover" />
                                    ) : (
                                        professional.avatar
                                    )}
                                </div>

                                {/* Name */}
                                <h3 className="text-xl font-bold text-gray-900 mb-1 truncate px-2">
                                    {professional.name}
                                </h3>

                                {/* Verified Badge */}
                                {professional.verified && (
                                    <div className="flex items-center justify-center space-x-1 text-blue-600 text-sm">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span>Verificado</span>
                                    </div>
                                )}
                            </div>

                            {/* Card Body */}
                            <div className="p-6 flex-grow">
                                {/* Specialty */}
                                <div className="mb-4">
                                    <div className="text-sm text-gray-500 mb-1">Especialidad</div>
                                    <div className="font-semibold text-gray-900 truncate" title={professional.specialty}>{professional.specialty}</div>
                                </div>

                                {/* Experience */}
                                <div className="mb-4">
                                    <div className="text-sm text-gray-500 mb-1">Experiencia</div>
                                    <div className="font-semibold text-gray-900">{professional.experience}</div>
                                </div>

                                {/* Rating */}
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-1">
                                        <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                        <span className="font-bold text-gray-900">{professional.rating}</span>
                                        <span className="text-sm text-gray-500">({professional.reviewCount})</span>
                                    </div>
                                    <div className="text-lg font-bold text-primary-600">
                                        {professional.price}
                                        <span className="text-sm text-gray-500 font-normal">/sesión</span>
                                    </div>
                                </div>
                            </div>

                            {/* CTA Button Wrapper (to always sit at bottom) */}
                            <div className='p-6 pt-0 mt-auto'>
                                <button
                                    onClick={() => setSelectedProfessional(professional)}
                                    className="block w-full text-center bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-300"
                                >
                                    Ver Detalles
                                </button>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>

                {/* View All CTA */}
                <ScrollReveal direction="up" delay={0.4} className="text-center mt-12">
                    <Link
                        to="/buscar-profesionales"
                        className="inline-flex items-center space-x-2 text-primary-600 font-semibold hover:text-primary-700 transition-colors duration-300 group"
                    >
                        <span>Ver Todos los Profesionales</span>
                        <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </Link>
                </ScrollReveal>
            </div>

            {/* Popup del Profesional */}
            {selectedProfessional && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 transition-opacity">
                    <div 
                        className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all relative animate-fade-in-up"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close button */}
                        <button 
                            onClick={() => setSelectedProfessional(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-none"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="p-8">
                            <div className="flex items-center space-x-6 mb-6">
                                <div className={`${selectedProfessional.color} w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0 overflow-hidden shadow-md`}>
                                    {selectedProfessional.photoURL ? (
                                        <img src={selectedProfessional.photoURL} alt={selectedProfessional.name} className="w-full h-full object-cover" />
                                    ) : (
                                        selectedProfessional.avatar
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{selectedProfessional.name}</h3>
                                    <p className="text-primary-600 font-medium mb-2">{selectedProfessional.specialty}</p>
                                    {selectedProfessional.verified && (
                                        <div className="inline-flex items-center space-x-1 text-blue-600 text-sm bg-blue-50 px-2 py-1 rounded-full">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                            </svg>
                                            <span>Perfil Verificado</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4 mb-6">
                                <p className="text-gray-600 text-sm italic">"{selectedProfessional.bio}"</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white border border-gray-100 rounded-lg p-3 text-center shadow-sm">
                                    <div className="text-xs text-gray-500 mb-1">Experiencia</div>
                                    <div className="font-semibold text-gray-900">{selectedProfessional.experience}</div>
                                </div>
                                <div className="bg-white border border-gray-100 rounded-lg p-3 text-center shadow-sm">
                                    <div className="text-xs text-gray-500 mb-1">Valoración</div>
                                    <div className="flex items-center justify-center space-x-1">
                                        <span className="font-semibold text-gray-900">{selectedProfessional.rating}</span>
                                        <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="bg-white border border-gray-100 rounded-lg p-3 text-center shadow-sm col-span-2">
                                    <div className="text-xs text-gray-500 mb-1">Precio por Sesión</div>
                                    <div className="font-semibold text-primary-600 text-lg">{selectedProfessional.price}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default FeaturedProfessionals;
