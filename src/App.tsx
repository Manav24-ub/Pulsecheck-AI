import { useState, useEffect, useRef, DragEvent, ChangeEvent, FormEvent, MouseEvent } from 'react';
import { 
  HeartPulse, 
  Sun, 
  Moon, 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Activity, 
  ChevronRight, 
  ChevronLeft, 
  User, 
  Calendar, 
  Info, 
  Plus, 
  Trash2, 
  Sparkles, 
  Filter, 
  Clock, 
  ChevronDown, 
  BookOpen, 
  X, 
  FileSpreadsheet, 
  Search, 
  Share2, 
  ArrowRight,
  ClipboardList,
  HeartCrack,
  Dna,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnalysisSession, Biomarker, TriageStatus } from './types';
import { 
  GREEN_SESSION, 
  YELLOW_SESSION, 
  RED_SESSION, 
  INITIAL_HISTORY, 
  parseUploadedReport 
} from './data';
import { 
  auth, 
  db, 
  googleProvider, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  onAuthStateChanged, 
  User as FirebaseUser, 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';

export default function App() {
  // Authentication states
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Theme management: Default to dark theme as requested by style requirements
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pulsecheck-theme');
    return (saved as 'light' | 'dark') || 'dark';
  });

  // Sessions and History state (now synchronized with Firestore)
  const [history, setHistory] = useState<AnalysisSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  // UI States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rawText, setRawText] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All Systems');
  const [expandedBiomarker, setExpandedBiomarker] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [assessmentNotes, setAssessmentNotes] = useState('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showQuickHelp, setShowQuickHelp] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Set up automatic DB population on signup if user profile is empty
  const initializeNewUserSessions = async (uid: string) => {
    try {
      const defaultDocs = [
        {
          ...GREEN_SESSION,
          id: `demo-green-${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString().split('T')[0]
        },
        {
          ...YELLOW_SESSION,
          id: `demo-yellow-${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString().split('T')[0]
        },
        {
          ...RED_SESSION,
          id: `demo-red-${Date.now().toString().slice(-4)}`,
          date: new Date().toISOString().split('T')[0]
        }
      ];

      for (const docData of defaultDocs) {
        const docRef = doc(db, 'users', uid, 'sessions', docData.id);
        await setDoc(docRef, docData);
      }

      await setDoc(doc(db, 'users', uid), {
        email: auth.currentUser?.email || '',
        displayName: auth.currentUser?.displayName || '',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${uid}/new-setup`);
    }
  };

  // Sync user diagnostic sessions from Firestore
  useEffect(() => {
    if (!user) {
      setHistory([]);
      setCurrentSessionId(null);
      return;
    }

    const sessionsColRef = collection(db, 'users', user.uid, 'sessions');
    const unsubscribe = onSnapshot(sessionsColRef, (snapshot) => {
      const fetchedSessions: AnalysisSession[] = [];
      snapshot.forEach((docSnap) => {
        fetchedSessions.push({
          id: docSnap.id,
          ...docSnap.data()
        } as AnalysisSession);
      });

      // Sort fetched sessions by date desc client-side for fast compilation
      fetchedSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (fetchedSessions.length === 0) {
        initializeNewUserSessions(user.uid);
      } else {
        setHistory(fetchedSessions);
        setCurrentSessionId(currentId => {
          if (!currentId || !fetchedSessions.some(s => s.id === currentId)) {
            return fetchedSessions[0]?.id || null;
          }
          return currentId;
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/sessions`);
    });

    return () => unsubscribe();
  }, [user]);

  // Persist theme choice details
  useEffect(() => {
    localStorage.setItem('pulsecheck-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Toast auto-clear
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const activeSession = history.find(s => s.id === currentSessionId) || null;

  // Toggle themes
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
    showNotification('Theme switched successfully');
  };

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
  };

  // Drag and drop handlers
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Run mock processing simulation
  const processFile = (file: File) => {
    setFileToUpload(file);
    setIsProcessing(true);
    setProcessingProgress(0);

    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const simulatedReport = parseUploadedReport(file.name, `Simulating file read. ${rawText}`);
            
            // For custom user notes
            if (assessmentNotes.trim()) {
              simulatedReport.summaryText = `[Patient Context Added] ${simulatedReport.summaryText}`;
            }

            if (!user) {
              setIsProcessing(false);
              return;
            }

            const docRef = doc(db, 'users', user.uid, 'sessions', simulatedReport.id);
            setDoc(docRef, simulatedReport)
              .then(() => {
                setCurrentSessionId(simulatedReport.id);
                setIsProcessing(false);
                setFileToUpload(null);
                setRawText('');
                setAssessmentNotes('');
                setSuccessToast(`Successfully parsed report: "${file.name}"`);
              })
              .catch(err => {
                setIsProcessing(false);
                handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sessions/${simulatedReport.id}`);
              });
          }, 400);
          return 100;
        }
        return prev + 12;
      });
    }, 150);
  };

  // Raw text parsing handler
  const handleManualParse = (e: FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            const simulatedReport = parseUploadedReport("Manually Entered Raw Data", rawText);
            
            if (!user) {
              setIsProcessing(false);
              return;
            }

            const docRef = doc(db, 'users', user.uid, 'sessions', simulatedReport.id);
            setDoc(docRef, simulatedReport)
              .then(() => {
                setCurrentSessionId(simulatedReport.id);
                setIsProcessing(false);
                setRawText('');
                setAssessmentNotes('');
                setSuccessToast('Successfully synthesized raw diagnostics report');
              })
              .catch(err => {
                setIsProcessing(false);
                handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sessions/${simulatedReport.id}`);
              });
          }, 400);
          return 100;
        }
        return prev + 15;
      });
    }, 100);
  };

  // Demo buttons trigger
  const triggerDemoLoad = (demoType: 'GREEN' | 'YELLOW' | 'RED') => {
    setIsProcessing(true);
    setProcessingProgress(0);

    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            let selected: AnalysisSession;
            let mockName = "";
            switch (demoType) {
              case 'GREEN':
                selected = GREEN_SESSION;
                mockName = "clinical_routine_sarah_jenkins.pdf";
                break;
              case 'YELLOW':
                selected = YELLOW_SESSION;
                mockName = "lipid_metabolic_screening_marcus.txt";
                break;
              case 'RED':
                selected = RED_SESSION;
                mockName = "renal_metabolic_crisis_elizabeth.pdf";
                break;
            }

            const simulatedReport = {
              ...selected,
              id: `demo-${demoType.toLowerCase()}-${Date.now().toString().slice(-4)}`,
              title: `${mockName} (${demoType === 'RED' ? 'Urgent' : demoType === 'YELLOW' ? 'Attention' : 'Normal'})`,
              date: new Date().toISOString().split('T')[0]
            };

            if (!user) {
              setIsProcessing(false);
              return;
            }

            const docRef = doc(db, 'users', user.uid, 'sessions', simulatedReport.id);
            setDoc(docRef, simulatedReport)
              .then(() => {
                setCurrentSessionId(simulatedReport.id);
                setIsProcessing(false);
                setSuccessToast(`Simulated analysis loaded: ${mockName}`);
              })
              .catch(err => {
                setIsProcessing(false);
                handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/sessions/${simulatedReport.id}`);
              });
          }, 300);
          return 100;
        }
        return prev + 25;
      });
    }, 80);
  };

  // Delete session
  const handleDeleteSession = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    
    const docRef = doc(db, 'users', user.uid, 'sessions', id);
    deleteDoc(docRef)
      .then(() => {
        showNotification('Report analysis deleted from history');
      })
      .catch(err => {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/sessions/${id}`);
      });
  };

  // Navigation helpers
  const handleNewAnalysis = () => {
    setCurrentSessionId(null);
    setExpandedBiomarker(null);
    setIsMobileSidebarOpen(false);
  };

  // Filter biomarkers by category
  const getCategories = (): string[] => {
    if (!activeSession) return [];
    const cats = new Set<string>(activeSession.biomarkers.map(b => b.category));
    return ['All Systems', ...Array.from(cats)];
  };

  const filteredBiomarkers = activeSession 
    ? activeSession.biomarkers.filter(b => {
        const matchesCategory = activeCategoryFilter === 'All Systems' || b.category === activeCategoryFilter;
        const matchesSearch = b.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              b.explanation.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
    : [];

  const getTriageColors = (status: TriageStatus) => {
    switch (status) {
      case 'GREEN':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20',
          border: 'border-emerald-200 dark:border-emerald-800/40',
          text: 'text-emerald-800 dark:text-emerald-300',
          statusText: 'Normal / Routine',
          iconColor: 'text-emerald-500 dark:text-emerald-400',
          pulseColor: 'bg-emerald-500',
          lightBg: 'bg-emerald-500/10'
        };
      case 'YELLOW':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/20',
          border: 'border-amber-200 dark:border-amber-800/40',
          text: 'text-amber-800 dark:text-amber-300',
          statusText: 'Moderate Risk / Consultation',
          iconColor: 'text-amber-500 dark:text-amber-400',
          pulseColor: 'bg-amber-500',
          lightBg: 'bg-amber-500/10'
        };
      case 'RED':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/20',
          border: 'border-rose-200 dark:border-rose-800/50',
          text: 'text-rose-800 dark:text-rose-300',
          statusText: 'High Severity / Urgent Attention',
          iconColor: 'text-rose-500 dark:text-rose-400',
          pulseColor: 'bg-rose-500',
          lightBg: 'bg-rose-500/10'
        };
    }
  };

  const getBiomarkerStatusBadge = (status: 'Normal' | 'High' | 'Low') => {
    switch (status) {
      case 'Normal':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-900/40';
      case 'High':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/50 dark:border-rose-900/40';
      case 'Low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/50 dark:border-blue-900/40';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white flex flex-col justify-center items-center font-sans">
        <HeartPulse className="w-12 h-12 text-teal-400 animate-pulse mb-4" />
        <p className="text-xs font-mono text-slate-400 tracking-widest uppercase">Initialising Security Core...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen relative flex flex-col transition-colors duration-300 ease-in-out bg-[#F9FAFB] text-slate-800 dark:bg-[#0B0F19] dark:text-slate-100`}>
        {/* Top Header of Login Guest Screen */}
        <header className="px-5 md:px-8 h-16 flex items-center justify-between border-b border-slate-150 dark:border-slate-900 bg-white/70 dark:bg-[#0B0F19]/80 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white shadow-sm">
              <HeartPulse className="w-5 h-5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-sans font-bold tracking-tight text-sm text-slate-900 dark:text-white">PulseCheck AI</span>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 leading-none">CLINICAL COGNITION</span>
            </div>
          </div>

          <button
            onClick={() => setTheme(p => p === 'light' ? 'dark' : 'light')}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#121A28] border border-slate-200 dark:border-slate-850 transition-all flex items-center justify-center cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-500" />}
          </button>
        </header>

        {/* Content of the Login Screen */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-900 rounded-3xl overflow-hidden shadow-2xl">
            {/* Left Column: Splash info panel */}
            <div className="p-8 md:p-12 bg-slate-50 dark:bg-[#090E18] flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-900 text-left">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-teal-500/20 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> SECURED PATIENT TRIAGE CORE
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-950 dark:text-white leading-tight font-sans">
                  Elevating healthcare insights via blood panel analysis.
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans">
                  PulseCheck AI utilizes precision clinical indicators to synthesize diagnostic triage severity scores and provide accessible biochemical insights.
                </p>

                <div className="space-y-3.5 pt-2">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4.5 h-4.5 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Intelligent Biomarker Parsing</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Instantly convert diagnostic raw text formats into structured data profiles.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4.5 h-4.5 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Automated Triage</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Visualize Routine (GREEN), Attention (YELLOW), and Urgent (RED) severity ratings instantly.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-4.5 h-4.5 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-100">Isolated Diagnostic History</h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Secure cloud-isolated persistent health records strictly linked to your authenticated user profile.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-slate-200/55 dark:border-slate-800/40 text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-teal-500 animate-pulse" /> PulseCheck Security Shield Active
              </div>
            </div>

            {/* Right Column: Portal Access Controls */}
            <div className="p-8 md:p-12 flex flex-col justify-center text-center max-w-md mx-auto w-full space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                  Clinical Portal Access
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Authenticate below using your credentials to establish a secure database session.
                </p>
              </div>

              {/* Login Button with OAuth Standard */}
              <button
                id="google-login-btn"
                onClick={async () => {
                  try {
                    await signInWithPopup(auth, googleProvider);
                  } catch (err) {
                    console.error("Authentication error: ", err);
                    alert("Authentication Error: Please open this application in a new tab if popups are blocked by the iframe.");
                  }
                }}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-950 text-slate-700 dark:text-zinc-100 font-sans font-semibold text-xs transition-all duration-200 shadow-sm cursor-pointer"
              >
                {/* Custom Google Vector Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Sign in with Google
              </button>

              <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900 pt-5 text-[11px] text-slate-450 dark:text-zinc-550 font-mono">
                <span>PORTAL VERSION: 1.4.0</span>
                <span className="text-emerald-500">SYSTEMS READY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer Footer */}
        <footer className="w-full shrink-0 border-t bg-white dark:bg-[#080D19] border-slate-150 dark:border-slate-900 py-3.5 px-6 md:px-8 mt-auto sticky bottom-0 z-20 backdrop-blur-sm shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 justify-between font-sans">
            <div className="flex items-center gap-1.5 shrink-0">
              <HeartPulse className="w-4.5 h-4.5 text-teal-500 animate-pulse" />
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-mono">
                NCAC TRIAGE REFERENCE CONCEPT
              </span>
            </div>
            <p className="text-[10px] text-center md:text-left text-slate-400 dark:text-slate-500 max-w-4xl leading-relaxed">
              Disclaimer: PulseCheck AI is an educational and informational triage concept built for NCAC. It does not provide medical diagnoses, treatment plans, or replace professional medical advice. Always consult a qualified healthcare provider regarding your health.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div id="pulsecheck-app" className="min-h-screen relative flex flex-col transition-colors duration-300 ease-in-out bg-[#F9FAFB] text-slate-800 dark:bg-[#0B0F19] dark:text-slate-100">
      
      {/* Dynamic Success Notification Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            id="toast-notification"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg bg-white dark:bg-[#182030] border-slate-200 dark:border-slate-800 text-slate-800 dark:text-zinc-100 max-w-sm sm:max-w-md"
          >
            <Sparkles className="w-4 h-4 text-teal-500 shrink-0 animate-pulse" />
            <span className="text-xs font-medium font-sans">{successToast}</span>
            <button 
              id="close-toast-btn"
              onClick={() => setSuccessToast(null)} 
              className="ml-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Body Container: Grid for Collapsible Sidebar + Dashboard View */}
      <div id="app-workspace" className="flex-1 flex overflow-hidden">
        
        {/* ======================================= */}
        {/* SIDEBAR: COLLAPSIBLE PATIENT REPORT TRACKER */}
        {/* ======================================= */}
        
        {/* Desktop Sidebar */}
        <aside 
          id="sidebar-desktop"
          className={`hidden md:flex flex-col border-r transition-all duration-300 bg-white dark:bg-[#0D1321] border-slate-100 dark:border-slate-900 ${
            sidebarCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          {/* Logo Brand Header */}
          <div id="sidebar-header" className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-900 h-16 shrink-0">
            {!sidebarCollapsed ? (
              <div id="brand-expanded" className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white shadow-sm">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <div className="flex flex-col">
                  <span className="font-sans font-bold tracking-tight text-sm text-slate-900 dark:text-white">PulseCheck AI</span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 leading-none">CLINICAL COGNITION</span>
                </div>
              </div>
            ) : (
              <div id="brand-collapsed" className="mx-auto">
                <div className="w-9 h-9 rounded-lg bg-teal-500 flex items-center justify-center text-white shadow-sm">
                  <HeartPulse className="w-5 h-5 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Action "New Analysis" Trigger */}
          <div id="new-analysis-action" className="p-4 shrink-0">
            <button
              id="new-report-sidebar-btn"
              onClick={handleNewAnalysis}
              className={`w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-semibold rounded-xl transition-all duration-200 border cursor-pointer ${
                currentSessionId === null 
                  ? 'bg-teal-500 hover:bg-teal-600 text-white border-transparent shadow-sm'
                  : 'bg-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-800'
              }`}
            >
              <Plus className="w-4 h-4 text-teal-400 shrink-0" />
              {!sidebarCollapsed && <span>New Analysis</span>}
            </button>
          </div>

          {/* History / Session List */}
          <div id="history-scroller" className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {!sidebarCollapsed && (
              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 mb-2 font-semibold">
                ANALYTIQUES RECENT ({history.length})
              </p>
            )}

            {history.length === 0 ? (
              <div id="no-history-prompt" className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 px-3">
                {!sidebarCollapsed && <p>No analyzed records yet.</p>}
              </div>
            ) : (
              history.map((session) => {
                const isActive = session.id === currentSessionId;
                const colors = getTriageColors(session.triageStatus);
                
                return (
                  <button
                    id={`session-item-${session.id}`}
                    key={session.id}
                    onClick={() => {
                      setCurrentSessionId(session.id);
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full rounded-xl p-2.5 text-left transition-all duration-200 flex items-start gap-3 border ${
                      isActive 
                        ? 'bg-slate-50 dark:bg-[#151D2A] border-slate-200 dark:border-slate-800/80' 
                        : 'bg-transparent border-transparent hover:bg-slate-50/50 dark:hover:bg-[#131B2A]/30'
                    }`}
                  >
                    {/* Status Dot / Flag */}
                    <div id="status-flag" className="pt-0.5 shrink-0 flex justify-center items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${colors.pulseColor} relative`}>
                        <div className={`absolute -inset-0.5 rounded-full ${colors.pulseColor} opacity-40 animate-ping`} />
                      </div>
                    </div>

                    {/* Metadata */}
                    {!sidebarCollapsed && (
                      <div id="session-meta" className="flex-1 min-w-0 pr-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                            {session.patientName}
                          </p>
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 shrink-0">
                            {session.date.split('-').slice(1).join('/')}
                          </span>
                        </div>
                        
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-relaxed mt-0.5">
                          {session.title.replace(`${session.patientName} - `, '')}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/10">
                          <span className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text}`}>
                            {session.triageStatus}
                          </span>
                          
                          <button
                            id={`delete-btn-${session.id}`}
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors p-0.5 rounded"
                            title="Delete record from history"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Toggle Sidebar Collapse Button at Bottom representing Apple minimal aesthetic */}
          <div id="sidebar-footer" className="p-4 border-t border-slate-100 dark:border-slate-900 shrink-0 flex justify-between items-center bg-white/50 dark:bg-[#0E1525]">
            <button
              id="sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 transition-all ml-auto"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </aside>

        {/* Mobile Slide-over Sidebar Drawer */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              {/* Overlay Backdrop */}
              <motion.div 
                id="sidebar-mobile-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.5 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileSidebarOpen(false)}
                className="fixed inset-0 bg-black z-40 md:hidden"
              />
              {/* Drawer panel */}
              <motion.div 
                id="sidebar-mobile-drawer"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                className="fixed top-0 bottom-0 left-0 w-80 bg-white dark:bg-[#0E1424] z-50 p-5 flex flex-col border-r border-slate-200 dark:border-slate-800"
              >
                <div id="mobile-sidebar-header" className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-teal-500" />
                    <span className="font-bold font-sans text-sm text-slate-900 dark:text-white">PulseCheck AI</span>
                  </div>
                  <button 
                    id="close-mobile-sidebar-btn"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <button
                  id="mobile-new-report-btn"
                  onClick={handleNewAnalysis}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs mb-6 font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-xl shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Start New Analysis</span>
                </button>

                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 font-semibold">
                  ANALYSIS HISTORY ({history.length})
                </p>

                <div id="mobile-history-scroller" className="flex-1 overflow-y-auto space-y-2 pointer-events-auto">
                  {history.map((session) => {
                    const isActive = session.id === currentSessionId;
                    const colors = getTriageColors(session.triageStatus);
                    return (
                      <button
                        id={`mobile-session-${session.id}`}
                        key={session.id}
                        onClick={() => {
                          setCurrentSessionId(session.id);
                          setIsMobileSidebarOpen(false);
                        }}
                        className={`w-full rounded-xl p-3 text-left transition-all flex items-start gap-3 border ${
                          isActive 
                            ? 'bg-slate-100 dark:bg-[#161F2F] border-slate-200 dark:border-slate-800' 
                            : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-[#131B2A]/50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${colors.pulseColor} mt-1`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{session.patientName}</p>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-400 truncate mt-0.5">{session.title}</p>
                          <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/10">
                            <span className={`text-[9px] font-mono px-1.5 rounded-full ${colors.bg} ${colors.text}`}>
                              {session.triageStatus}
                            </span>
                            <button
                              id={`mobile-delete-${session.id}`}
                              onClick={(e) => handleDeleteSession(session.id, e)}
                              className="text-slate-400 hover:text-rose-500"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ======================================= */}
        {/* MAIN VIEWPORT: HEADBOARD, PROCESSOR, GRID */}
        {/* ======================================= */}
        
        <main id="main-content" className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          
          {/* HEADER BAR */}
          <header id="clinical-header" className="px-5 md:px-8 border-b border-slate-100 dark:border-slate-900 h-16 flex items-center justify-between shrink-0 bg-white/70 dark:bg-[#0B0F19]/80 backdrop-blur-md sticky top-0 z-10">
            <div id="header-brand-box" className="flex items-center gap-3">
              {/* Mobile Sidebar Hamburger */}
              <button
                id="hamburger-btn"
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                <Activity className="w-4 h-4 text-teal-400" />
              </button>

              <div id="header-title-box">
                <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  PulseCheck AI
                  <span className="h-2 w-2 rounded-full bg-teal-400 animate-pulse hidden sm:inline-block"></span>
                </h1>
                <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 leading-none">
                  {activeSession ? `REPORT: ${activeSession.patientName}` : "CLINICAL TRIAGE STUDIO"}
                </p>
              </div>
            </div>

            {/* Right Header Operations */}
            <div id="header-ops" className="flex items-center gap-3">
              
              {/* Quick Guide Indicator */}
              <button
                id="info-guide-btn"
                onClick={() => setShowQuickHelp(!showQuickHelp)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-850 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#121A28] transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800/40 text-[11px] font-medium flex items-center gap-1"
              >
                <BookOpen className="w-4 h-4 text-teal-400" />
                <span className="hidden lg:inline">Medical Reference Info</span>
              </button>

              {/* Theme Selector Toggle with instant beautiful feedback */}
              <button
                id="theme-toggle-btn"
                onClick={toggleTheme}
                aria-label="Toggle theme brightness"
                className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#121A28] border border-slate-200 dark:border-slate-850 transition-all flex items-center justify-center cursor-pointer"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-45" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-500 transition-transform hover:-rotate-12" />
                )}
              </button>

              {user && (
                <div id="header-user-tag" className="flex items-center gap-3 pl-3 border-l border-slate-200 dark:border-slate-800">
                  <div className="hidden sm:flex items-center gap-2 text-left">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#141C2C] flex items-center justify-center text-slate-500 dark:text-teal-400 border border-slate-200/50 dark:border-slate-800">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold leading-none text-slate-800 dark:text-zinc-200 truncate max-w-[120px]">
                        {user.displayName || user.email?.split('@')[0] || 'Analyst'}
                      </span>
                      <span className="text-[9px] font-mono text-emerald-500">Authorized Analyst</span>
                    </div>
                  </div>
                  
                  <button
                    id="sign-out-header-btn"
                    onClick={() => signOut(auth)}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 dark:text-rose-400 hover:text-white hover:bg-rose-500 dark:hover:bg-rose-500 border border-rose-200 dark:border-rose-950 rounded-xl transition-all font-sans cursor-pointer shrink-0"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* QUICK HELP PANEL */}
          <AnimatePresence>
            {showQuickHelp && (
              <motion.div
                id="quick-help-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-teal-50/50 dark:bg-[#10192A] border-b border-slate-200 dark:border-slate-800 px-5 md:px-8 py-4 overflow-hidden"
              >
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-5 items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-400 mb-2 font-mono flex items-center gap-1.5">
                      <Info className="w-4 h-4" /> PulseCheck AI Analytical Triage Handbook
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed max-w-4xl">
                      This diagnostic tool uses standard clinical thresholds to immediately organize blood indicators (such as Creatinine, Fasting Blood Sugar, HbA1c, and Lipids). 
                      It automatically generates laymen-accessible summaries and targeted exercise and nutritional lifestyle insights to optimize metabolic wellbeing.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 w-full md:w-auto shrink-0 text-left">
                    <div className="border border-emerald-500/20 bg-emerald-500/5 p-2.5 rounded-lg">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider font-mono">Routine (GREEN)</span>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Markers optimal. Follow up in next routine annual.</p>
                    </div>
                    <div className="border border-amber-500/20 bg-amber-500/5 p-2.5 rounded-lg">
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider font-mono">Attention (YELLOW)</span>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Subtle variations. Consult primary care in 2-4 weeks.</p>
                    </div>
                    <div className="border border-rose-500/20 bg-rose-500/5 p-2.5 rounded-lg">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider font-mono">Urgent (RED)</span>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-1">Severe deviation. Immediate physician assessment required.</p>
                    </div>
                  </div>
                  <button 
                    id="close-help-btn"
                    onClick={() => setShowQuickHelp(false)} 
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-850 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SCROLLABLE VIEWPORT COMPULSORY BOXES */}
          <div id="main-scroll-section" className="flex-1 p-5 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            
            {/* ======================================= */}
            {/* VIEW A: LOADER OR PARSING STATUS */}
            {/* ======================================= */}
            <AnimatePresence mode="wait">
              {isProcessing && (
                <motion.div
                  id="processing-loader-screen"
                  key="loader"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.02 }}
                  className="bg-white dark:bg-[#0D1424] border border-slate-100 dark:border-slate-800 rounded-2xl p-8 md:p-12 text-center flex flex-col items-center justify-center min-h-[400px] shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-indigo-500 animate-pulse" />
                  
                  <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-400 mb-6 border border-teal-500/20 animate-bounce">
                    <Dna className="w-8 h-8 animate-spin" style={{ animationDuration: '3s' }} />
                  </div>

                  <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
                    Synthesizing Diagnostic Data
                  </h3>
                  
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 max-w-md">
                    Extracting plasma biomarkers, metabolic parameters, renal indicators, and calculating clinical triage severity configurations...
                  </p>

                  <div className="w-64 max-w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-8 overflow-hidden">
                    <div 
                      className="bg-teal-400 h-full rounded-full transition-all duration-150"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>

                  <span className="text-[11px] font-mono text-teal-500 dark:text-teal-400 mt-3 font-semibold">
                    {processingProgress}% PARSED
                  </span>
                </motion.div>
              )}

              {/* ======================================= */}
              {/* VIEW B: NEW REPORT SUBMISSION / INPUT ZONE */}
              {/* ======================================= */}
              {!isProcessing && !activeSession && (
                <motion.div
                  id="triage-input-panel"
                  key="input-form"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  {/* Visual Welcoming Pitch */}
                  <div id="welcome-pitch" className="text-left space-y-2">
                    <span className="text-[10px] font-mono text-teal-500 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> CLINICAL GRADE ASSESSMENT
                    </span>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl font-sans">
                      Analyze Blood Test Reports in Seconds
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-2xl">
                      Upload PDF/TXT patient reports or enter laboratory values manually. Our system translates biochemical metrics into standard risk levels, layman-friendly explanations, and optimized lifestyle feedback.
                    </p>
                  </div>

                  {/* Drag-and-drop & Manual Input Grid of Apple aesthetic */}
                  <div id="input-methods-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                    
                    {/* LEFT CELL: Drag and Drop Upload */}
                    <div id="upload-container" className="lg:col-span-7 flex flex-col">
                      <div
                        id="drop-zone"
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        className={`flex-1 min-h-[280px] rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-8 transition-all relative ${
                          dragActive
                            ? 'border-teal-500 bg-teal-500/5 shadow-inner'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1424] hover:border-slate-350 dark:hover:border-slate-700'
                        }`}
                      >
                        <input
                          id="file-upload-input"
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf,.txt,.tsv,.csv,.json"
                          onChange={handleFileChange}
                          className="hidden"
                        />

                        <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 dark:text-zinc-500 mb-4 border border-slate-200/50 dark:border-slate-800">
                          <Upload className="w-5 h-5 text-teal-400" />
                        </div>

                        <p className="text-xs font-bold text-slate-900 dark:text-white text-center">
                          Drag and drop patient PDF or text file
                        </p>
                        
                        <p className="text-[11px] text-slate-405 dark:text-slate-500 mt-1 max-w-xs text-center">
                          Supports clinical panel summaries, lab output raw transcripts, or spreadsheet extracts (.pdf, .txt, .json)
                        </p>

                        <div className="mt-5 flex gap-2">
                          <button
                            id="browse-files-btn"
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="py-1.5 px-3.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-zinc-100 border border-slate-200 dark:border-slate-850 rounded-xl text-xs font-semibold select-none cursor-pointer transition-all"
                          >
                            Browse Files
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT CELL: Direct Raw Copy-Paste fallback */}
                    <div id="manual-text-entry-container" className="lg:col-span-5">
                      <form 
                        id="paste-parsing-form"
                        onSubmit={handleManualParse} 
                        className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-850 rounded-2xl p-6 h-full flex flex-col justify-between"
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
                            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              <ClipboardList className="w-4 h-4 text-teal-400" /> Manual Diagnostic Entry
                            </h3>
                            <span className="text-[10px] font-mono text-indigo-400 shrink-0">RAW PARSER ENGINE</span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500">
                              Clinical Text Transcript / Values
                            </label>
                            <textarea
                              id="raw-text-textarea"
                              value={rawText}
                              onChange={(e) => setRawText(e.target.value)}
                              placeholder={`Patient Name: Elizabeth Thorne
Age: 68
Creatinine: 2.45
Serum Potassium: 5.7`}
                              className="w-full h-36 p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono text-slate-800 dark:text-slate-100 leading-normal"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500">
                              Patient Active Complaints / Notes (Optional)
                            </label>
                            <input
                              id="assessment-notes-input"
                              type="text"
                              value={assessmentNotes}
                              onChange={(e) => setAssessmentNotes(e.target.value)}
                              placeholder="e.g. chronic fatigue, lower back aches"
                              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
                            />
                          </div>
                        </div>

                        <button
                          id="parse-results-btn"
                          type="submit"
                          disabled={!rawText.trim()}
                          className={`w-full mt-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            rawText.trim()
                              ? 'bg-teal-500 hover:bg-teal-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-[#121825] text-slate-400 dark:text-slate-600 border border-transparent cursor-not-allowed'
                          }`}
                        >
                          <Activity className="w-4 h-4 shrink-0 animate-pulse" />
                          <span>Analyze Transcribed Metrics</span>
                        </button>
                      </form>
                    </div>

                  </div>

                  {/* 💡 CLINICAL DEMO CLINICAL PRELOAD SANDBOX */}
                  <div id="demo-guide-sandbox" className="bg-white dark:bg-[#0D1424] border border-slate-200 dark:border-slate-850 p-6 rounded-2xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl" />
                    
                    <div className="flex items-start gap-3.5 mb-4 border-b border-slate-100 dark:border-slate-900 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-950 dark:text-white uppercase tracking-wider font-sans">
                          Expert Clinical Inspection Sandboxes
                        </h3>
                        <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">
                          Instantly test and inspect PulseCheck AI's different safety triage layouts without uploading external medical documents:
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Demo Green */}
                      <button
                        id="demo-green-sandbox-btn"
                        onClick={() => triggerDemoLoad('GREEN')}
                        className="p-4 rounded-xl text-left border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-900 transition-all text-xs cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between h-32"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-[10px] tracking-wider uppercase">Normal (GREEN)</span>
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white font-sans text-xs">Sarah Jenkins</span>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-1 line-clamp-2">
                            Excellent metabolic profiles, optimal kidney function and cholesterol clearance.
                          </p>
                        </div>
                        <span className="text-[10px] text-teal-500 flex items-center font-semibold mt-2">
                          Inspect Green Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </span>
                      </button>

                      {/* Demo Yellow */}
                      <button
                        id="demo-yellow-sandbox-btn"
                        onClick={() => triggerDemoLoad('YELLOW')}
                        className="p-4 rounded-xl text-left border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-900 transition-all text-xs cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between h-32"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                            <span className="font-bold text-amber-600 dark:text-amber-400 font-mono text-[10px] tracking-wider uppercase">Attention (YELLOW)</span>
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white font-sans text-xs">Marcus Vance</span>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-1 line-clamp-2">
                            Atherogenic lipid ratios and early HbA1c glucose spikes indicating insulin resistance.
                          </p>
                        </div>
                        <span className="text-[10px] text-teal-500 flex items-center font-semibold mt-2">
                          Inspect Yellow Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </span>
                      </button>

                      {/* Demo Red */}
                      <button
                        id="demo-red-sandbox-btn"
                        onClick={() => triggerDemoLoad('RED')}
                        className="p-4 rounded-xl text-left border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100/50 dark:bg-slate-900/40 dark:hover:bg-slate-900 transition-all text-xs cursor-pointer hover:-translate-y-0.5 flex flex-col justify-between h-32"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-[10px] tracking-wider uppercase">Urgent (RED)</span>
                          </div>
                          <span className="font-semibold text-slate-900 dark:text-white font-sans text-xs">Elizabeth Thorne</span>
                          <p className="text-[10px] text-slate-400 dark:text-zinc-400 mt-1 line-clamp-2">
                            High potassium, BUN, and acute serum creatinine suggesting kidney filtration concerns.
                          </p>
                        </div>
                        <span className="text-[10px] text-teal-500 flex items-center font-semibold mt-2">
                          Inspect Red Profile <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ======================================= */}
              {/* VIEW C: DETAILED DIAGNOSTIC RESULTS BOARD */}
              {/* ======================================= */}
              {!isProcessing && activeSession && (
                <motion.div
                  id="results-panel-box"
                  key="results-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="space-y-6"
                >
                  
                  {/* Dashboard Hero Row */}
                  <div id="results-top-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* Visual Segment A: Patient Metadata Profile Card */}
                    <div id="patient-bio-card" className="lg:col-span-5 bg-white dark:bg-[#0D1424] border border-slate-100 dark:border-slate-900 rounded-2xl p-6 flex flex-col justify-between">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
                          <span className="text-[10px] font-mono text-teal-500 font-bold tracking-widest uppercase">
                            PATIENT METRICS SUMMARY
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> ID: {activeSession.id.slice(0, 11)}
                          </span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-[#141B2C] border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-500 dark:text-teal-400 shrink-0 font-bold text-sm">
                            {activeSession.patientName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-slate-950 dark:text-white leading-tight">
                              {activeSession.patientName}
                            </h2>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 dark:text-zinc-400 font-mono">
                              <span>AGE {activeSession.age}</span>
                              <span>•</span>
                              <span>{activeSession.gender.toUpperCase()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="bg-[#F8FAFC] dark:bg-[#121A28] p-3 rounded-xl border border-slate-100 dark:border-slate-850/40">
                            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500">
                              EXTRACTION DATE
                            </span>
                            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-teal-400" /> {activeSession.date}
                            </p>
                          </div>

                          <div className="bg-[#F8FAFC] dark:bg-[#121A28] p-3 rounded-xl border border-slate-100 dark:border-slate-850/40 font-mono">
                            <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500">
                              BIOMARKERS EXTRACTED
                            </span>
                            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200 mt-1 flex items-center gap-1">
                              <Dna className="w-3.5 h-3.5 text-teal-400" /> {activeSession.biomarkers.length} panels
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-900 pt-4 mt-4">
                        <button 
                          id="re-parse-trigger"
                          onClick={handleNewAnalysis}
                          className="text-[11px] font-semibold text-teal-500 hover:text-teal-600 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" /> Parse Another Document
                        </button>
                        
                        <button 
                          id="share-dialog-trigger"
                          onClick={() => showNotification("Clinical URL generated. Patient file securely hashed for telemedicine review.")}
                          className="text-[11px] font-semibold text-slate-405 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Share Report
                        </button>
                      </div>
                    </div>

                    {/* Visual Segment B: Triage Status Badge Card (STRIKING CRITICALITY CARDS) */}
                    <div 
                      id="triage-status-card" 
                      className={`lg:col-span-7 rounded-2xl p-6 border flex flex-col justify-between transition-all duration-300 ${
                        getTriageColors(activeSession.triageStatus).bg
                      } ${
                        getTriageColors(activeSession.triageStatus).border
                      }`}
                    >
                      <div>
                        {/* Title Row */}
                        <div className="flex items-center justify-between pb-3 border-b border-current/10">
                          <span className={`text-[10px] font-mono font-bold tracking-wider uppercase ${getTriageColors(activeSession.triageStatus).text}`}>
                            COGNITIVE CLINICAL TRIAGE ASSIGNMENT
                          </span>
                          <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase ${getTriageColors(activeSession.triageStatus).lightBg} ${getTriageColors(activeSession.triageStatus).text}`}>
                            {activeSession.triageStatus} STATUS
                          </span>
                        </div>

                        {/* Interactive Large Indicator */}
                        <div className="flex items-start gap-4 mt-5">
                          {/* Left Column Icon Indicator */}
                          <div id="triage-big-icon" className="shrink-0 mt-1">
                            {activeSession.triageStatus === 'GREEN' && (
                              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-6 h-6 animate-pulse" />
                              </div>
                            )}
                            {activeSession.triageStatus === 'YELLOW' && (
                              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 dark:text-amber-400 border border-amber-500/20">
                                <AlertTriangle className="w-6 h-6 animate-bounce" style={{ animationDuration: '4s' }} />
                              </div>
                            )}
                            {activeSession.triageStatus === 'RED' && (
                              <div className="w-12 h-12 rounded-xl bg-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400 border border-rose-550/30 animate-pulse">
                                <AlertOctagon className="w-6 h-6 text-rose-500" />
                              </div>
                            )}
                          </div>

                          {/* Right Triage Descriptions */}
                          <div id="triage-explanation-metrics">
                            <h3 className={`text-lg font-bold font-sans tracking-tight ${getTriageColors(activeSession.triageStatus).text}`}>
                              {getTriageColors(activeSession.triageStatus).statusText}
                            </h3>
                            <p className="text-xs text-slate-650 dark:text-zinc-300 mt-2 leading-relaxed">
                              {activeSession.summaryText}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Direct Medical Instruction */}
                      <div className="bg-white/40 dark:bg-black/10 p-4 rounded-xl mt-5 border border-current/5 flex items-start gap-3">
                        <Info className={`w-4 h-4 mt-0.5 shrink-0 ${getTriageColors(activeSession.triageStatus).iconColor}`} />
                        <div>
                          <p className="text-[11px] font-bold text-slate-800 dark:text-white uppercase tracking-wider font-mono">
                            PRIMARY CLINICAL RECOMMENDATION
                          </p>
                          <p className={`text-xs mt-1 leading-relaxed decoration-inherit font-medium ${getTriageColors(activeSession.triageStatus).text}`}>
                            {activeSession.primaryRecommendation}
                          </p>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* CLINICAL INTERPRETATION PROSE COLUMN */}
                  <div id="interpretation-card" className="bg-white dark:bg-[#0D1424] border border-slate-200/50 dark:border-slate-850 rounded-2xl p-6">
                    <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 dark:border-slate-900">
                      <Sparkles className="w-4 h-4 text-teal-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                        Automated Pathophysiological Interpretation
                      </h3>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      <p className="md:col-span-8 text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                        {activeSession.clinicalInterpretation}
                      </p>
                      
                      <div className="md:col-span-4 bg-[#F8FAFC] dark:bg-[#111827] border border-slate-150 dark:border-slate-850 p-4 rounded-xl">
                        <span className="text-[9px] font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block">
                          Criticality Context
                        </span>
                        
                        <div className="mt-2 text-xs space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-450 dark:text-slate-400">Biological System</span>
                            <span className="font-semibold text-slate-800 dark:text-zinc-200">
                              {activeSession.triageStatus === 'RED' ? 'Renal Filtration / Serum Electrolyte' : 'Pancreatic / Lipid Metabolism'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800/25 pt-2">
                            <span className="text-slate-450 dark:text-slate-400">Variance Type</span>
                            <span className={`font-semibold ${activeSession.triageStatus === 'GREEN' ? 'text-emerald-500' : activeSession.triageStatus === 'YELLOW' ? 'text-amber-500' : 'text-rose-500'}`}>
                              {activeSession.triageStatus === 'GREEN' ? 'In-Range Baseline' : activeSession.triageStatus === 'YELLOW' ? 'Early Metabolic Shift' : 'Acute Clearance Decline'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ======================================= */}
                  {/* BIOMARKER MATRIX AND SYSTEM VIEWER PANEL */}
                  {/* ======================================= */}
                  <div id="biomarker-table-container" className="bg-white dark:bg-[#0D1424] border border-slate-150 dark:border-slate-900 rounded-2xl p-5 space-y-4">
                    
                    {/* Header Row: Filter options */}
                    <div id="biomarkers-header" className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-900 pb-4">
                      <div>
                        <h2 className="text-sm font-bold text-slate-950 dark:text-white flex items-center gap-2">
                          <Dna className="w-4 h-4 text-teal-400 animate-pulse" /> Analyzed Blood Biomarkers
                        </h2>
                        <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-1 leading-none">
                          Systematic extraction of serum panels compared with laboratory thresholds
                        </p>
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full md:w-64">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -transparent -translate-y-1/2" />
                        <input
                          id="biomarker-search-input"
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search biomarker or category..."
                          className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 placeholder-slate-400"
                        />
                      </div>
                    </div>

                    {/* Interactive Filter Pills */}
                    <div id="pills-filters" className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0 border-b border-slate-100/30 dark:border-slate-900/40">
                      <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 mr-2 flex items-center gap-1">
                        <Filter className="w-3.5 h-3.5" /> Systems:
                      </span>
                      {getCategories().map((cat) => {
                        const isSelected = activeCategoryFilter === cat;
                        return (
                          <button
                            id={`filter-pill-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                            key={cat}
                            onClick={() => {
                              setActiveCategoryFilter(cat);
                              setExpandedBiomarker(null);
                            }}
                            className={`px-3 py-1 text-xs font-semibold rounded-full select-none transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-teal-500 text-white shadow-sm' 
                                : 'bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-300 border border-slate-150 dark:border-slate-800'
                            }`}
                          >
                            {cat}
                          </button>
                        );
                      })}
                    </div>

                    {/* Results Table / Cards Layout */}
                    <div id="biomarkers-grid" className="space-y-3 pointer-events-auto">
                      {filteredBiomarkers.length === 0 ? (
                        <div id="empty-markers" className="text-center py-10 text-xs text-slate-400 dark:text-slate-500">
                          No biomarkers match the selected parameters or active search terms.
                        </div>
                      ) : (
                        filteredBiomarkers.map((biomarker: Biomarker) => {
                          const isExpanded = expandedBiomarker === biomarker.name;
                          return (
                            <div
                              id={`biomarker-row-${biomarker.name.replace(/\s+/g, '-').toLowerCase()}`}
                              key={biomarker.name}
                              className={`border rounded-xl transition-all duration-200 group ${
                                isExpanded 
                                  ? 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30' 
                                  : 'border-slate-150 dark:border-[#161F30]/40 bg-transparent hover:border-slate-200 dark:hover:border-slate-800'
                              }`}
                            >
                              {/* Main Biomarker Summary Header */}
                              <div
                                id={`biomarker-toggle-${biomarker.name.replace(/\s+/g, '-').toLowerCase()}`}
                                onClick={() => setExpandedBiomarker(isExpanded ? null : biomarker.name)}
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                              >
                                <div className="flex items-start gap-3">
                                  {/* Icon Tag indicating high/low/normal */}
                                  <div className="mt-0.5 shrink-0">
                                    {biomarker.status === 'Normal' ? (
                                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 group-hover:scale-110 transition-transform" />
                                    ) : biomarker.status === 'High' ? (
                                      <TrendingUp className="w-4.5 h-4.5 text-rose-500 group-hover:scale-110 transition-transform" />
                                    ) : (
                                      <TrendingDown className="w-4.5 h-4.5 text-blue-500 group-hover:scale-110 transition-transform" />
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                                        {biomarker.name}
                                      </p>
                                      <span className="text-[9px] font-mono font-medium tracking-normal text-slate-400 dark:text-slate-500 uppercase">
                                        {biomarker.category}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-slate-450 dark:text-slate-400 line-clamp-1 mt-0.5 font-sans leading-relaxed">
                                      {biomarker.explanation}
                                    </p>
                                  </div>
                                </div>

                                {/* Values Columns */}
                                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-0 border-slate-100 dark:border-slate-900/50 pt-2 sm:pt-0 shrink-0">
                                  {/* Value */}
                                  <div className="text-right">
                                    <p className="text-xs font-bold text-slate-900 dark:text-white font-mono flex items-baseline gap-0.5 justify-end">
                                      {biomarker.value}
                                      <span className="text-[9px] font-mono font-normal text-slate-400 dark:text-slate-500 ml-0.5">{biomarker.unit}</span>
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500 uppercase mt-0.5">Reported Value</p>
                                  </div>

                                  {/* Reference threshold */}
                                  <div className="text-right hidden xs:block">
                                    <p className="text-xs font-semibold text-slate-650 dark:text-zinc-300 font-mono">
                                      {biomarker.referenceRange}
                                      <span className="text-[9px] font-mono font-normal text-slate-400 dark:text-slate-500 ml-0.5">{biomarker.unit}</span>
                                    </p>
                                    <p className="text-[9px] font-mono text-slate-405 dark:text-slate-500 uppercase mt-0.5">Reference Bounds</p>
                                  </div>

                                  {/* Status tag */}
                                  <div className="text-right">
                                    <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full uppercase ${getBiomarkerStatusBadge(biomarker.status)}`}>
                                      {biomarker.status}
                                    </span>
                                  </div>

                                  {/* Chevron drop indicator */}
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform hidden sm:block ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>

                              </div>

                              {/* Collapsible Expanded laymen insights detail */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.div
                                    id={`biomarker-expandable-${biomarker.name.replace(/\s+/g, '-').toLowerCase()}`}
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="px-4 pb-4 border-t border-slate-50 dark:border-slate-900/50"
                                  >
                                    <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-5 text-left">
                                      {/* Layman definition panel */}
                                      <div className="space-y-2 bg-[#F8FAFC]/60 dark:bg-[#0F1626]/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                        <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                          <BookOpen className="w-3.5 h-3.5 text-teal-400" /> Patient Translation (Layman Explanation)
                                        </h4>
                                        <p className="text-xs text-slate-650 dark:text-zinc-300 leading-relaxed font-sans">
                                          {biomarker.explanation}
                                        </p>
                                      </div>

                                      {/* Wellness lifestyle interventions */}
                                      <div className="space-y-2 bg-[#F8FAFC]/60 dark:bg-[#0F1626]/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                        <h4 className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-450 dark:text-slate-500 flex items-center gap-1">
                                          <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Tailored Lifestyle Interventions
                                        </h4>
                                        <ul className="text-xs text-slate-650 dark:text-zinc-300 space-y-1.5 list-inside list-disc pl-1 leading-normal font-sans">
                                          {biomarker.lifestyleInsights.map((insight, idx) => (
                                            <li key={idx} className="marker:text-teal-400">{insight}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>

                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>

                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* ======================================= */}
          {/* STICKY FOOTER DEDICATED MEDICAL DISCLAIMER */}
          {/* ======================================= */}
          <footer 
            id="pulsecheck-disclaimer-footer" 
            className="w-full shrink-0 border-t bg-white dark:bg-[#080D19] border-slate-150 dark:border-slate-900 py-3.5 px-6 md:px-8 mt-auto sticky bottom-0 z-20 backdrop-blur-sm shadow-md"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4 justify-between font-sans">
              <div className="flex items-center gap-1.5 shrink-0">
                <HeartPulse className="w-4.5 h-4.5 text-teal-500 animate-pulse" />
                <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400 dark:text-slate-500 font-mono">
                  NCAC TRIAGE REFERENCE CONCEPT
                </span>
              </div>
              <p className="text-[10px] text-center md:text-left text-slate-400 dark:text-slate-500 max-w-4xl leading-relaxed">
                Disclaimer: PulseCheck AI is an educational and informational triage concept built for NCAC. It does not provide medical diagnoses, treatment plans, or replace professional medical advice. Always consult a qualified healthcare provider regarding your health.
              </p>
            </div>
          </footer>

        </main>

      </div>

    </div>
  );
}
