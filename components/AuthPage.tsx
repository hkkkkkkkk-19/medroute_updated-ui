import React, { useState, useContext, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types.ts';
import { AuthContext } from '../App.tsx';
import { useLanguage } from '../LanguageContext.tsx';
import { auth as firebaseAuth, db, OperationType, handleFirestoreError } from '../firebase.ts';
import { sendForgotPasswordEmail } from '../services/mailService.ts';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { 
  User, 
  Mail, 
  Lock, 
  ArrowLeft, 
  Github, 
  Chrome, 
  Heart, 
  ShieldCheck, 
  Building2, 
  Truck,
  UserRound,
  ChevronRight
} from 'lucide-react';

interface Props {
  initialRole?: UserRole;
  initialIsLogin?: boolean;
  onBack: () => void;
}

const AuthPage: React.FC<Props> = ({ initialRole = UserRole.DONOR, initialIsLogin = true, onBack }) => {
  const [isLogin, setIsLogin] = useState(initialIsLogin);
  const [role, setRole] = useState<UserRole>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [authMode, setAuthMode] = useState<'USER' | 'ADMIN'>('USER');
  
  const auth = useContext(AuthContext);
  const { t } = useLanguage();

  useEffect(() => {
    setIsLogin(initialIsLogin);
    setRole(initialRole);
  }, [initialIsLogin, initialRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    // Hardcoded Admin login check as requested
    if (authMode === 'ADMIN') {
      const isAdminEmail = 
        (email === 'harsheenkour19@gmail.com' && password === '1973') ||
        (email === 'harsheenkour@hotmail.com' && password === '1973') ||
        (email === '2023a1r070@mietjammu.in' && password === '1973');

      if (isAdminEmail) {
        try {
          // Attempt Firebase login for admin to enable Firestore rules
          await signInWithEmailAndPassword(firebaseAuth, email, password);
        } catch (err: any) {
          console.error("Admin Firebase auth check:", err);
          
          // If admin doesn't exist in Auth, create it automatically to ensure rules work
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            try {
              const adminCred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
              await setDoc(doc(db, 'users', adminCred.user.uid), {
                email,
                role: UserRole.ADMIN,
                name: 'System Admin',
                createdAt: serverTimestamp()
              });
            } catch (regErr) {
              console.error("Admin auto-registration failed:", regErr);
            }
          }
        }
        auth?.login(email, UserRole.ADMIN);
        setIsLoading(false);
        return;
      } else {
        setError('Invalid administrator credentials.');
        setIsLoading(false);
        return;
      }
    }

    try {
      if (isLogin) {
        // Firebase Login
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        const userData = userDoc.data();
        
        if (userData) {
          auth?.login(email, userData.role as UserRole);
        } else {
          // If profile missing for some reason, default to Donor
          auth?.login(email, UserRole.DONOR);
        }
      } else {
        if (role === UserRole.ADMIN) {
          setError('Cannot register as Administrator.');
          setIsLoading(false);
          return;
        }

        // Firebase Registration
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        const { user } = userCredential;

        // Save to Firestore
        const userProfile = {
          email,
          role,
          name: email.split('@')[0], // Default name from email
          createdAt: serverTimestamp()
        };

        try {
          await setDoc(doc(db, 'users', user.uid), userProfile);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }

        setSuccess(t('auth.accountCreated'));
        setTimeout(() => {
          auth?.login(email, role);
        }, 1500);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let msg = err.message;
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = t('auth.invalidCredentials');
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered.';
      }
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email to reset password.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await sendForgotPasswordEmail(email);
      setSuccess('A temporary password has been sent to your email.');
    } catch (err: any) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    { id: UserRole.DONOR, label: t('auth.roles.donor'), icon: <Heart className="w-5 h-5" /> },
    { id: UserRole.RECEIVER, label: t('auth.roles.receiver'), icon: <UserRound className="w-5 h-5" /> },
    { id: UserRole.NGO, label: t('auth.roles.ngo'), icon: <Building2 className="w-5 h-5" /> },
    { id: UserRole.DELIVERY, label: 'Delivery Partner', icon: <Truck className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-[#030a1a] font-serif">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-6xl bg-white rounded-[4rem] overflow-hidden shadow-[0_50px_100_px_-20px_rgba(0,0,0,0.5)] flex flex-row min-h-[800px]"
      >
        {/* Left Side: Dynamic Messaging */}
        <div className="w-[40%] bg-gradient-to-br from-[#007fff] to-[#4f46e5] p-12 md:p-16 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-white rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-sky-300 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10">
            <button 
              onClick={onBack}
              className="group flex items-center gap-2 text-white/80 hover:text-white transition-colors font-black text-[10px] tracking-[0.3em] mb-20 font-lato"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              {t('auth.back')}
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={isLogin ? 'login-text' : 'reg-text'}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                className="space-y-8"
              >
                <div className="inline-block px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-[10px] font-black tracking-widest uppercase mb-4">
                  {authMode === 'ADMIN' ? 'Secure Entry' : 'Community Portal'}
                </div>
                <h2 className="text-6xl font-black tracking-tighter leading-[0.9] drop-shadow-2xl">
                  {authMode === 'ADMIN' 
                    ? 'Admin Access' 
                    : (isLogin ? t('auth.welcome') : t('auth.join'))}
                </h2>
                <p className="text-white/80 font-medium text-lg leading-relaxed max-w-xs font-lato">
                  {authMode === 'ADMIN'
                    ? 'Authorized access for system administrators to manage medication flow and network integrity.'
                    : (isLogin ? t('auth.loginDesc') : t('auth.regDesc'))}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative z-10 flex flex-col gap-4">
            {authMode === 'USER' && (
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsLogin(!isLogin)}
                className="px-12 py-5 border-2 border-white/40 hover:border-white rounded-full font-bold text-sm transition-all backdrop-blur-md font-sans"
              >
                {isLogin ? t('auth.create') : t('auth.signin')}
              </motion.button>
            )}
            
            <button 
              onClick={() => {
                setAuthMode(authMode === 'ADMIN' ? 'USER' : 'ADMIN');
                setIsLogin(true);
              }}
              className="text-white/60 hover:text-white text-xs font-bold font-sans transition-all flex items-center gap-2 justify-center py-2"
            >
              {authMode === 'ADMIN' ? 'Back to Community Login' : 'Admin Sign In'}
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Side: Form Panel */}
        <div className="w-[60%] bg-white p-12 md:p-24 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-12"
            >
              <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-4 pr-12">
                {authMode === 'ADMIN' ? 'Administrator Login' : (isLogin ? t('auth.signin') : t('auth.create'))}
              </h1>
              
              {authMode === 'USER' && isLogin && (
                <div className="flex gap-3 mb-8">
                  <button className="flex-1 py-4 px-6 rounded-2xl border border-slate-100 flex items-center justify-center gap-3 hover:bg-slate-50 transition-all shadow-sm font-sans font-bold text-slate-700 active:scale-95">
                    <Chrome className="w-5 h-5 text-sky-500" />
                    <span className="text-sm">Google</span>
                  </button>
                  <button className="w-16 h-16 rounded-2xl border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-all shadow-sm group">
                    <Github className="w-5 h-5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                  </button>
                </div>
              )}

              <div className="h-px bg-slate-100 w-full relative my-8">
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[10px] font-black text-slate-300 tracking-widest uppercase">
                  {authMode === 'ADMIN' ? 'Authorized Only' : 'Credentials'}
                </span>
              </div>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-6 bg-rose-50 border border-rose-100 text-rose-600 rounded-[2rem] text-xs font-bold font-sans"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-rose-500 font-black">!</div>
                  <p>{error}</p>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-6 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-[2rem] text-xs font-bold font-sans"
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shrink-0 shadow-sm text-emerald-500 font-black">✓</div>
                  <p>{success}</p>
                </div>
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {authMode === 'USER' && !isLogin && (
                <div className="space-y-4 mb-10">
                  <label className="text-xs font-black text-slate-400 ml-1 font-sans uppercase tracking-widest">{t('auth.identity')}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {roles.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setRole(r.id)}
                        className={`p-5 rounded-[2rem] border-2 flex items-center gap-4 transition-all duration-300 text-left ${role === r.id ? 'border-sky-500 bg-sky-50 text-sky-600 shadow-xl shadow-sky-100' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}`}
                      >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${role === r.id ? 'bg-sky-500 text-white' : 'bg-white'}`}>
                          {r.icon}
                        </div>
                        <div className="text-[11px] font-black uppercase tracking-wider font-sans">{r.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors">
                    <Mail size={20} />
                  </div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={authMode === 'ADMIN' ? 'Admin Email' : t('auth.email')}
                    className="w-full pl-16 pr-8 py-7 bg-slate-50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-sky-500 outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300 font-sans"
                    required
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-7 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-sky-500 transition-colors">
                    <Lock size={20} />
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={authMode === 'ADMIN' ? 'Admin Key' : t('auth.password')}
                    className="w-full pl-16 pr-8 py-7 bg-slate-50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-sky-500 outline-none font-bold text-slate-900 transition-all placeholder:text-slate-300 font-sans"
                    required
                  />
                </div>
              </div>

              {authMode === 'USER' && isLogin && (
                <div className="flex items-center justify-between px-2 font-sans">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative w-5 h-5">
                      <input type="checkbox" className="peer absolute opacity-0 w-full h-full cursor-pointer" />
                      <div className="w-5 h-5 border-2 border-slate-200 rounded-lg group-hover:border-sky-500 peer-checked:bg-sky-500 peer-checked:border-sky-500 transition-all flex items-center justify-center">
                        <div className="w-1.5 h-3 border-r-2 border-b-2 border-white rotate-45 mb-1" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-400 group-hover:text-slate-600 transition-colors">{t('auth.remember')}</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-xs font-black text-sky-500 hover:text-sky-600 transition-colors uppercase tracking-widest"
                  >
                    {t('auth.forgot')}
                  </button>
                </div>
              )}

              <div className="pt-8">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={isLoading}
                  className={`w-full py-7 rounded-[2rem] font-black text-base transition-all shadow-2xl flex items-center justify-center gap-3 font-sans uppercase tracking-[0.2em] ${
                    isLoading ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' : 'bg-sky-500 hover:bg-sky-600 text-white shadow-sky-200'
                  }`}
                >
                  {isLoading ? 'Processing...' : (authMode === 'ADMIN' ? 'Secure Login' : (isLogin ? t('auth.signin') : t('auth.signup')))}
                </motion.button>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
