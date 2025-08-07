import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut,
    signInAnonymously
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    onSnapshot
} from 'firebase/firestore';

// --- Íconos de Lucide (como componentes SVG para no usar dependencias externas) ---
const CheckCircle = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

const Menu = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
);

const X = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
);

const Code = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
);

const Zap = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
);

const Layers = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
        <polyline points="2 17 12 22 22 17"></polyline>
        <polyline points="2 12 12 17 22 12"></polyline>
    </svg>
);

// --- Configuración de Firebase desde Variables de Entorno para Vercel ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_APP_ID
};

// --- Componente Principal de la App ---
export default function App() {
    const [user, setUser] = useState(null);
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [membership, setMembership] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [modalInfo, setModalInfo] = useState({ show: false, message: '' });

    // Inicialización de Firebase y Autenticación
    useEffect(() => {
        if (firebaseConfig.apiKey) {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
                if (currentUser) {
                    setUser(currentUser);
                    // Guardar usuario en Firestore si es la primera vez
                    const userRef = doc(dbInstance, `users/${currentUser.uid}`);
                    const userSnap = await getDoc(userRef);
                    if (!userSnap.exists() && !currentUser.isAnonymous) {
                        await setDoc(userRef, {
                            email: currentUser.email,
                            displayName: currentUser.displayName,
                            createdAt: new Date(),
                            membership: {
                                plan: 'Gratis',
                                status: 'active',
                                expires: null
                            }
                        });
                    }
                } else {
                    setUser(null);
                    setMembership(null);
                }
                setIsAuthReady(true);
            });
            
            signInAnonymously(authInstance).catch(error => console.error("Error en login anónimo:", error));

            return () => unsubscribe();
        }
    }, []);

    // Suscripción a los datos de membresía del usuario
    useEffect(() => {
        if (isAuthReady && user && !user.isAnonymous && db) {
            const userRef = doc(db, `users/${user.uid}`);
            const unsubscribe = onSnapshot(userRef, (docSnap) => {
                if (docSnap.exists() && docSnap.data().membership) {
                    setMembership(docSnap.data().membership);
                }
            }, (error) => {
                console.error("Error en snapshot de membresía:", error);
            });
            return () => unsubscribe();
        }
    }, [isAuthReady, user, db]);

    const showModal = (message) => {
        setModalInfo({ show: true, message });
    };

    const handleGoogleLogin = async () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error al iniciar sesión con Google:", error);
            showModal("Error al iniciar sesión con Google. Por favor, intenta de nuevo.");
        }
    };

    const handleLogout = async () => {
        if (!auth) return;
        try {
            await signOut(auth);
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Error al cerrar sesión:", error);
        }
    };
    
    const handleSelectPlan = async (planName, price) => {
        if (!user || user.isAnonymous) {
            showModal("Por favor, inicia sesión para seleccionar un plan.");
            return;
        }
        if (!db) return;

        showModal(`Has seleccionado el plan ${planName}. La integración con la pasarela de pago (como Stripe o Mercado Pago) se añadiría aquí.`);

        const userRef = doc(db, `users/${user.uid}`);
        try {
            await setDoc(userRef, {
                membership: {
                    plan: planName,
                    status: 'pending_payment',
                    purchaseDate: new Date(),
                }
            }, { merge: true });
        } catch (error) {
            console.error("Error al actualizar la membresía:", error);
            showModal("Hubo un error al seleccionar el plan. Inténtalo de nuevo.");
        }
    };

    const NavLinks = ({onClick}) => (
        <>
            <a href="#features" onClick={onClick} className="text-gray-600 hover:text-blue-600 transition-colors">Características</a>
            <a href="#pricing" onClick={onClick} className="text-gray-600 hover:text-blue-600 transition-colors">Precios</a>
            <a href="#faq" onClick={onClick} className="text-gray-600 hover:text-blue-600 transition-colors">FAQ</a>
        </>
    );

    return (
        <div className="bg-white font-sans">
             {modalInfo.show && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-sm mx-4">
                        <p className="mb-4 text-gray-800">{modalInfo.message}</p>
                        <button onClick={() => setModalInfo({ show: false, message: '' })} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
                            Cerrar
                        </button>
                    </div>
                </div>
            )}

            <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm shadow-sm z-40">
                <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">RevitPowerUp</h1>
                    <nav className="hidden md:flex items-center space-x-8">
                        <NavLinks />
                    </nav>
                    <div className="flex items-center space-x-4">
                        {isAuthReady && (
                            user && !user.isAnonymous ? (
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm text-gray-700 hidden sm:inline">
                                        Hola, {user.displayName ? user.displayName.split(' ')[0] : 'Usuario'}
                                    </span>
                                    {membership && <span className="hidden lg:inline bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">{membership.plan}</span>}
                                    <button onClick={handleLogout} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
                                        Salir
                                    </button>
                                </div>
                            ) : (
                                <button onClick={handleGoogleLogin} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
                                    Iniciar Sesión
                                </button>
                            )
                        )}
                        <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                           {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white shadow-lg">
                        <nav className="flex flex-col items-center space-y-4 py-4">
                            <NavLinks onClick={() => setIsMobileMenuOpen(false)} />
                        </nav>
                    </div>
                )}
            </header>

            <main className="pt-20">
                <section className="py-20 md:py-32 bg-gray-50">
                    <div className="container mx-auto px-6 text-center">
                        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight">
                            Automatiza tus Flujos de Trabajo en Revit
                        </h2>
                        <p className="mt-6 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
                            Nuestro plugin para Revit te ahorra horas de trabajo tedioso, optimizando tus procesos de diseño y documentación con herramientas inteligentes y potentes.
                        </p>
                        <a href="#pricing" className="mt-8 inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
                            Ver Planes de Membresía
                        </a>
                        <div className="mt-12">
                             <img 
                                src="https://placehold.co/900x500/E2E8F0/4A5568?text=Visual+de+tu+Plugin+aquí" 
                                alt="Demostración del plugin de Revit" 
                                className="rounded-xl shadow-2xl mx-auto w-full max-w-4xl h-auto"
                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/900x500/E2E8F0/4A5568?text=Error+al+cargar+imagen'; }}
                            />
                        </div>
                    </div>
                </section>

                <section id="features" className="py-20">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16">
                            <h3 className="text-3xl md:text-4xl font-bold text-gray-900">¿Por qué elegir RevitPowerUp?</h3>
                            <p className="mt-4 text-lg text-gray-600">Funcionalidades diseñadas para potenciar tu productividad.</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-8">
                            <div className="text-center p-8 bg-gray-50 rounded-xl shadow-md transition-shadow hover:shadow-xl">
                                <Zap className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                                <h4 className="text-xl font-semibold text-gray-800 mb-2">Automatización Inteligente</h4>
                                <p className="text-gray-600">Ejecuta tareas repetitivas con un solo clic.</p>
                            </div>
                            <div className="text-center p-8 bg-gray-50 rounded-xl shadow-md transition-shadow hover:shadow-xl">
                                <Code className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                                <h4 className="text-xl font-semibold text-gray-800 mb-2">Exportación Avanzada</h4>
                                <p className="text-gray-600">Exporta datos y geometrías a múltiples formatos.</p>
                            </div>
                            <div className="text-center p-8 bg-gray-50 rounded-xl shadow-md transition-shadow hover:shadow-xl">
                                <Layers className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                                <h4 className="text-xl font-semibold text-gray-800 mb-2">Gestión de Familias</h4>
                                <p className="text-gray-600">Organiza y gestiona tu biblioteca de familias.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <section id="pricing" className="py-20 bg-gray-50">
                    <div className="container mx-auto px-6">
                        <div className="text-center mb-16">
                            <h3 className="text-3xl md:text-4xl font-bold text-gray-900">Planes para cada necesidad</h3>
                            <p className="mt-4 text-lg text-gray-600">Elige la membresía que mejor se adapte a ti o a tu equipo.</p>
                        </div>
                        <div className="flex flex-wrap justify-center items-stretch gap-8">
                            <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 flex flex-col transform hover:-translate-y-2 transition-transform duration-300">
                                <div className="flex-grow">
                                    <h4 className="text-2xl font-bold text-gray-800">Básico</h4>
                                    <p className="text-gray-500 mt-2">Ideal para estudiantes y freelancers.</p>
                                    <div className="mt-6">
                                        <span className="text-5xl font-extrabold text-gray-900">$10</span>
                                        <span className="text-lg text-gray-500">/mes</span>
                                    </div>
                                    <ul className="mt-8 space-y-4">
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /> <span>Automatización básica</span></li>
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /> <span>Exportación estándar</span></li>
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /> <span>Soporte por email</span></li>
                                    </ul>
                                </div>
                                <button onClick={() => handleSelectPlan('Básico', 10)} className="w-full mt-8 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors">
                                    Seleccionar Plan
                                </button>
                            </div>
                            <div className="w-full max-w-sm bg-blue-600 text-white rounded-xl shadow-2xl p-8 flex flex-col transform sm:scale-105">
                                <div className="flex-grow">
                                    <h4 className="text-2xl font-bold">Pro</h4>
                                    <p className="opacity-80 mt-2">La opción más popular.</p>
                                    <div className="mt-6">
                                        <span className="text-5xl font-extrabold">$25</span>
                                        <span className="text-lg opacity-80">/mes</span>
                                    </div>
                                    <ul className="mt-8 space-y-4">
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 mr-3 flex-shrink-0" /> <span>Todo en Básico</span></li>
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 mr-3 flex-shrink-0" /> <span>Automatización avanzada</span></li>
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 mr-3 flex-shrink-0" /> <span>Gestión de familias</span></li>
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 mr-3 flex-shrink-0" /> <span>Soporte prioritario</span></li>
                                    </ul>
                                </div>
                                <button onClick={() => handleSelectPlan('Pro', 25)} className="w-full mt-8 bg-white hover:bg-gray-100 text-blue-600 font-bold py-3 px-6 rounded-lg transition-colors">
                                    Empezar ahora
                                </button>
                            </div>
                            <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8 flex flex-col transform hover:-translate-y-2 transition-transform duration-300">
                                <div className="flex-grow">
                                    <h4 className="text-2xl font-bold text-gray-800">Empresa</h4>
                                    <p className="text-gray-500 mt-2">Para equipos y grandes proyectos.</p>
                                    <div className="mt-6">
                                        <span className="text-4xl font-extrabold text-gray-900">Contáctanos</span>
                                    </div>
                                    <ul className="mt-8 space-y-4">
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /> <span>Todo en Pro</span></li>
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /> <span>Licencias para equipos</span></li>
                                        <li className="flex items-center"><CheckCircle className="h-6 w-6 text-green-500 mr-3 flex-shrink-0" /> <span>Soporte dedicado</span></li>
                                    </ul>
                                </div>
                                <button onClick={() => showModal('Redirigiendo a la página de contacto...')} className="w-full mt-8 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-lg transition-colors">
                                    Contactar Ventas
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
                
                <section id="faq" className="py-20">
                    <div className="container mx-auto px-6 max-w-4xl">
                         <div className="text-center mb-16">
                            <h3 className="text-3xl md:text-4xl font-bold text-gray-900">Preguntas Frecuentes</h3>
                        </div>
                        <div className="space-y-4">
                            <FAQItem question="¿En qué versiones de Revit funciona el plugin?">
                                Nuestro plugin es compatible con Revit 2021, 2022, 2023 y 2024.
                            </FAQItem>
                             <FAQItem question="¿Puedo cancelar mi membresía en cualquier momento?">
                                Sí, puedes cancelar tu suscripción en cualquier momento desde tu panel de usuario.
                            </FAQItem>
                             <FAQItem question="¿Ofrecen licencias para estudiantes?">
                                ¡Claro! Ofrecemos descuentos para estudiantes. Contáctanos para más información.
                            </FAQItem>
                        </div>
                    </div>
                </section>
            </main>

            <footer className="bg-gray-800 text-white py-12">
                <div className="container mx-auto px-6 text-center">
                    <p>&copy; {new Date().getFullYear()} RevitPowerUp. Todos los derechos reservados.</p>
                    <p className="text-sm text-gray-400 mt-2">Creado para simplificar tu trabajo en Revit.</p>
                </div>
            </footer>
        </div>
    );
}

const FAQItem = ({ question, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border border-gray-200 rounded-lg">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center p-5 text-left font-semibold text-gray-800 hover:bg-gray-50 transition-colors"
            >
                <span className="pr-4">{question}</span>
                <span className={`transform transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </span>
            </button>
            {isOpen && (
                <div className="p-5 pt-0 text-gray-600">
                    <p className="mt-2">{children}</p>
                </div>
            )}
        </div>
    );
};
