
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Experiment } from './config';
import { db } from './be_db';
import { testApiKey, getSafeEnvApiKey } from './services';
import { useToast } from './toast';
import { ExperimentContext } from './context/ExperimentContext';
import { ModalProvider } from './context/ModalContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';

import { Header } from './components/common/Header';
import { Footer } from './components/common/Footer';
import { LandingPage } from './components/landing/LandingPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { ExperimentWorkspace } from './components/workspace/ExperimentWorkspace';
import { TestRunner } from './components/testing/TestRunner';
import { LabNotebook } from './components/workspace/LabNotebook';
import { CitationManager } from './components/workspace/CitationManager';
import { ProjectDocumentation } from './components/documentation/ProjectDocumentation';
import { AuthView } from './components/auth/AuthView';
import { MifecoLanding } from './components/landing/MifecoLanding';
import { GlobalDelayedTooltip } from './components/common/GlobalDelayedTooltip';

// --- MEMORY OPTIMIZATION HELPER ---
// Strips heavy data (CSVs, long markdown) from the dashboard list to prevent
// iOS/iPadOS browser crashes due to memory limits.
const lightenExperiment = (exp: Experiment): Experiment => {
    const lightExp = { ...exp };
    const lightStepData: { [key: number]: any } = {};

    if (exp.stepData) {
        Object.keys(exp.stepData).forEach(key => {
            const k = Number(key);
            const data = exp.stepData[k];
            lightStepData[k] = {
                ...data,
                // Truncate heavy fields for the list view
                input: data.input ? (data.input.length > 50 ? data.input.substring(0, 50) + '...' : data.input) : undefined,
                output: data.output ? (data.output.length > 50 ? data.output.substring(0, 50) + '...' : data.output) : undefined,
                // Keep summary and blockers as they are essential for UI badges
                summary: data.summary,
                blockers: data.blockers
            };
        });
    }
    lightExp.stepData = lightStepData;
    lightExp.labNotebook = ''; // Clear notebook text from list view
    return lightExp;
};

/**
 * @component App
 * The root component that manages the overall application state, routing, and global context.
 */
export const App = () => {
    const [user, setUser] = useState<any>(() => {
        try {
            const saved = localStorage.getItem('hmap-current-user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });
    const [view, setView] = useState('landing'); 
    const [experiments, setExperiments] = useState<Experiment[]>([]);
    const [activeExperiment, setActiveExperiment] = useState<Experiment | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLabNotebookOpen, setLabNotebookOpen] = useState(false);
    const [isCitationManagerOpen, setCitationManagerOpen] = useState(false);
    
    const { addToast } = useToast();
    const addToastRef = useRef(addToast);
    useEffect(() => {
        addToastRef.current = addToast;
    }, [addToast]);

    const isInitialized = useRef(false);
    const isInitializing = useRef(false);

    const [darkMode, _setDarkMode] = useState(() => {
        return localStorage.getItem('hypatia-dark-mode') !== 'false';
    });
    
    const [streamingEnabled, _setStreamingEnabled] = useState(() => {
        return localStorage.getItem('hypatia-streaming-enabled') !== 'false';
    });

    const setDarkMode = useCallback((val: boolean) => {
        _setDarkMode(val);
        localStorage.setItem('hypatia-dark-mode', String(val));
    }, []);

    const setStreamingEnabled = useCallback((val: boolean) => {
        _setStreamingEnabled(val);
        localStorage.setItem('hypatia-streaming-enabled', String(val));
    }, []);

    useEffect(() => {
        if (darkMode) {
            document.documentElement.setAttribute('data-bs-theme', 'dark');
        } else {
            document.documentElement.setAttribute('data-bs-theme', 'light');
        }
    }, [darkMode]);

    // Synchronize preferences and auth state across browser tabs/windows with strict event cleanup
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'hypatia-dark-mode' && e.newValue !== null) {
                _setDarkMode(e.newValue !== 'false');
            } else if (e.key === 'hypatia-streaming-enabled' && e.newValue !== null) {
                _setStreamingEnabled(e.newValue !== 'false');
            } else if (e.key === 'hmap-current-user') {
                try {
                    setUser(e.newValue ? JSON.parse(e.newValue) : null);
                } catch {
                    setUser(null);
                }
            } else if (e.key === 'hmap-gemini-api-key') {
                const hasKey = !!getSafeEnvApiKey();
                setIsAuthenticated(prev => prev !== hasKey ? hasKey : prev);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    // Initial Data Load & Synchronization (Guards against duplicate executions & memory leaks)
    useEffect(() => {
        let isMounted = true;

        if (isInitialized.current || isInitializing.current) return;
        isInitializing.current = true;
        
        const loadData = async () => {
            try {
                if (!db || !db.experiments) {
                    throw new Error("Database schema missing.");
                }

                // Load all experiments but strip heavy data immediately
                const storedExperiments = await db.experiments.orderBy('createdAt').reverse().toArray();
                
                if (isMounted) {
                    setExperiments(storedExperiments ? storedExperiments.map(lightenExperiment) : []);
                }
                
                // Auto-detect environment key
                const envKey = getSafeEnvApiKey();
                if (envKey && isMounted) {
                    setIsAuthenticated(true);
                }

                // Verify session with server /api/auth/me
                const savedToken = localStorage.getItem('hmap-token');
                const savedUser = localStorage.getItem('hmap-current-user');

                if (savedToken && isMounted) {
                    try {
                        const meResp = await fetch('/api/auth/me', {
                            headers: { 'Authorization': `Bearer ${savedToken}` }
                        });
                        if (meResp.ok) {
                            const meData = await meResp.json();
                            if (meData.user) {
                                setUser(meData.user);
                                localStorage.setItem('hmap-current-user', JSON.stringify(meData.user));
                            }
                        } else if (meResp.status === 401) {
                            // Expired or invalid session
                            localStorage.removeItem('hmap-token');
                            localStorage.removeItem('hmap-current-user');
                            setUser(null);
                        }
                    } catch {
                        // Offline or network error: retain local user if valid
                        if (savedUser) {
                            try { setUser(JSON.parse(savedUser)); } catch {}
                        }
                    }
                } else if (savedUser && isMounted) {
                    try {
                        setUser(JSON.parse(savedUser));
                    } catch {
                        setUser(null);
                    }
                } else {
                    setUser(null);
                }
            } catch (error) {
                console.warn("Data load warning:", error);
                if (isMounted) {
                    addToastRef.current("Could not access local archives.", 'warning');
                }
            } finally {
                isInitializing.current = false;
                isInitialized.current = true;
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadData();
        
        return () => { 
            isMounted = false; 
        };
    }, []);
    
    // Scroll to top on view change and update auth status without redundant re-renders
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const hasKey = !!getSafeEnvApiKey();
        setIsAuthenticated(prev => prev !== hasKey ? hasKey : prev);
    }, [view]);

    // Context Methods - Stabilized with useCallback to avoid triggering cascading re-renders
    
    const handleAuthentication = useCallback(async (type: 'promo' | 'key' | 'demo', value: string) => {
        if (type === 'key' && value) {
            localStorage.setItem('hmap-gemini-api-key', value.trim());
            setIsAuthenticated(true);
            addToastRef.current("API credentials stored securely.", "success");
        } else if (getSafeEnvApiKey()) {
            setIsAuthenticated(true);
        }
    }, []);

    const createNewExperiment = useCallback(async (title: string, description: string, field: string, experimentMode: 'simulation' | 'physical') => {
        const newId = `exp_${Date.now()}`;
        const newExperiment: Experiment = {
            id: newId,
            title,
            description,
            field,
            currentStep: 1,
            stepData: {
                1: {
                    input: `Title: ${title}\n\nDescription: ${description}`,
                    history: [],
                    provenance: [],
                }
            },
            fineTuneSettings: {},
            createdAt: new Date().toISOString(),
            labNotebook: '',
            automationMode: null,
            experimentMode,
            status: 'active',
        };

        try {
            await db.experiments.add(newExperiment);
            // Update list with lightweight version to save memory
            setExperiments(prev => [lightenExperiment(newExperiment), ...prev]);
            // Set active with full version
            setActiveExperiment(newExperiment);
            setView('experiment');
            addToastRef.current("Project initialized.", 'success');
        } catch (error) {
            console.error("Failed to save new experiment:", error);
            addToastRef.current("Failed to create project database entry.", 'danger');
        }
    }, []);

    const importExperiment = useCallback(async (experimentData: Experiment) => {
        try {
            if (!experimentData.id || !experimentData.title || !experimentData.createdAt) {
                throw new Error("Invalid experiment file format.");
            }
            
            // Check for duplicate ID
            const existing = await db.experiments.get(experimentData.id);
            if (existing) {
                experimentData.id = `exp_${Date.now()}_imported`;
                experimentData.title = `${experimentData.title} (Imported)`;
            }

            await db.experiments.add(experimentData);
            
            // Reload list with memory optimization
            const storedExperiments = await db.experiments.orderBy('createdAt').reverse().toArray();
            setExperiments(storedExperiments.map(lightenExperiment));
            
            addToastRef.current(`Project imported successfully.`, 'success');
        } catch(error) {
             console.error(error);
             addToastRef.current(`Failed to import project. File may be corrupted.`, 'danger');
        }
    }, []);

    const updateExperiment = useCallback(async (updatedExperiment: Experiment): Promise<Experiment> => {
        try {
            const experimentWithTimestamp = { ...updatedExperiment, updatedAt: new Date().toISOString() };
            
            // 1. Save FULL data to persistent storage (IndexedDB)
            await db.experiments.put(experimentWithTimestamp);
            
            // 2. Update the LIST state with LIGHTWEIGHT version (Memory Protection)
            setExperiments(prev => prev.map(e => e.id === experimentWithTimestamp.id ? lightenExperiment(experimentWithTimestamp) : e));
            
            // 3. Update the ACTIVE state with FULL version via functional update (eliminates dependency on activeExperiment)
            setActiveExperiment(prev => prev?.id === experimentWithTimestamp.id ? experimentWithTimestamp : prev);
            
            return experimentWithTimestamp;
        } catch (error) {
            console.error("Failed to update experiment:", error);
            addToastRef.current("Failed to save changes.", "danger");
            throw error;
        }
    }, []);

    const deleteExperiment = useCallback(async (id: string) => {
        if (window.confirm("Are you sure you want to delete this project? This cannot be undone.")) {
            try {
                await db.experiments.delete(id);
                setExperiments(prev => prev.filter(e => e.id !== id));
                setActiveExperiment(prev => {
                    if (prev?.id === id) {
                        setView(prevView => prevView === 'experiment' ? 'dashboard' : prevView);
                        return null;
                    }
                    return prev;
                });
                addToastRef.current("Project deleted.", 'success');
            } catch (error) {
                addToastRef.current("Failed to delete project.", 'danger');
            }
        }
    }, []);

    const selectExperiment = useCallback(async (id: string) => {
        setIsLoading(true); // Show loading UI while fetching heavy data
        try {
            const fullExperiment = await db.experiments.get(id);
            if (fullExperiment) {
                setActiveExperiment(fullExperiment);
                setView('experiment');
            } else {
                addToastRef.current("Error: Experiment data not found.", 'danger');
            }
        } catch (error) {
            console.error("Fetch error:", error);
            addToastRef.current("Failed to retrieve project from database.", 'danger');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleLogout = useCallback(async () => {
        const token = localStorage.getItem('hmap-token');
        if (token) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            } catch {
                // Ignore network error on logout
            }
        }
        localStorage.removeItem('hmap-current-user');
        localStorage.removeItem('hmap-token');
        localStorage.removeItem('hmap-gemini-api-key');
        setUser(null);
        setView('auth');
        addToastRef.current("Signed out. Session has been invalidated.", "info");
    }, []);

    // Memoized context value prevents unnecessary re-rendering of entire component tree
    const contextValue = React.useMemo(() => ({
        experiments,
        activeExperiment,
        isAuthenticated,
        createNewExperiment,
        updateExperiment,
        deleteExperiment,
        selectExperiment,
        setActiveExperiment,
        importExperiment,
        handleAuthentication,
        darkMode,
        setDarkMode,
        streamingEnabled,
        setStreamingEnabled,
    }), [
        experiments,
        activeExperiment,
        isAuthenticated,
        createNewExperiment,
        updateExperiment,
        deleteExperiment,
        selectExperiment,
        setActiveExperiment,
        importExperiment,
        handleAuthentication,
        darkMode,
        setDarkMode,
        streamingEnabled,
        setStreamingEnabled,
    ]);

    if (isLoading) {
        return (
            <div className="d-flex align-items-center justify-content-center vh-100 bg-[#0f172a] text-white">
                <div className="text-center">
                    <div className="spinner-border text-info mb-4" role="status" style={{width: '3rem', height: '3rem'}}></div>
                    <h5 className="fw-light ls-1 text-uppercase font-['Space_Grotesk']">Initializing MIFECO Hub...</h5>
                    <p className="text-white-50 small mt-2">Establishing secure archival link</p>
                </div>
            </div>
        );
    }

    if (view === 'auth') {
        return <AuthView onAuthSuccess={(u) => { setUser(u); setView('landing'); }} />;
    }

    // Protected Route Guard: accessing dashboard or active workspace requires session
    if ((view === 'experiment' || view === 'dashboard') && !user) {
        return (
            <AuthView 
                onAuthSuccess={(u) => { setUser(u); }} 
                onContinueAsGuest={() => {
                    const guestUser = { 
                        id: `guest_${Date.now()}`, 
                        username: 'Guest Researcher', 
                        email: 'guest@hypatia.pro', 
                        role: 'Guest Investigator', 
                        tier: 'free_byo_llm' 
                    };
                    setUser(guestUser);
                    localStorage.setItem('hmap-current-user', JSON.stringify(guestUser));
                }}
            />
        );
    }

    const isLandingOrHub = view === 'landing' || view === 'mifeco-landing';

    return (
        <ErrorBoundary>
            <ModalProvider>
                <GlobalDelayedTooltip />
                <ExperimentContext.Provider value={contextValue}>
                    <Header setView={setView} activeView={view} onToggleNotebook={() => setLabNotebookOpen(p => !p)} onToggleCitations={() => setCitationManagerOpen(p => !p)} />
                    <main className="container-fluid mt-2 mt-md-3 px-2 px-md-3" style={{ minHeight: '80vh' }}>
                        {isLandingOrHub && (
                            <LandingPage 
                                setView={setView} 
                                user={user}
                                onLogout={handleLogout}
                            />
                        )}
                        {view === 'dashboard' && <Dashboard setView={setView} />}
                        {view === 'experiment' && activeExperiment && <ExperimentWorkspace key={activeExperiment.id} />}
                        {view === 'documentation' && <ProjectDocumentation />}
                        {view === 'testing' && <TestRunner />}
                    </main>
                    {activeExperiment && (
                        <>
                            <LabNotebook 
                                isOpen={isLabNotebookOpen} 
                                onClose={() => setLabNotebookOpen(false)}
                            />
                            <CitationManager
                                isOpen={isCitationManagerOpen}
                                onClose={() => setCitationManagerOpen(false)}
                            />
                        </>
                    )}
                    <Footer />
                </ExperimentContext.Provider>
            </ModalProvider>
        </ErrorBoundary>
    );
};
