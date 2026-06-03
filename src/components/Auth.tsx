/**
 * Code license: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useAuthContext } from './AuthContext';
import { 
  AlertCircle, Key, Mail, Lock, User, RefreshCw, Send, CheckCircle2, 
  Eye, EyeOff, ShieldCheck, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Auth() {
  const { 
    signInWithGoogle, 
    registerWithEmail, 
    loginWithEmail, 
    resetPassword,
    sendVerification,
    firebaseUser 
  } = useAuthContext();

  const [isLogin, setIsLogin] = useState(true);
  const [isForgot, setIsForgot] = useState(false);
  
  // Fields state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorVal, setErrorVal] = useState('');
  const [successVal, setSuccessVal] = useState('');

  // Dirty state tracking for real-time validation
  const [emailDirty, setEmailDirty] = useState(false);
  const [passwordDirty, setPasswordDirty] = useState(false);
  const [confirmDirty, setConfirmDirty] = useState(false);
  const [fullNameDirty, setFullNameDirty] = useState(false);

  // Load saved credentials if 'Remember Me' was set
  useEffect(() => {
    const savedEmail = localStorage.getItem('mk_smm_remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Sync / Auto reset errors when changing mode
  useEffect(() => {
    setErrorVal('');
    setSuccessVal('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmailDirty(false);
    setPasswordDirty(false);
    setConfirmDirty(false);
    setFullNameDirty(false);
  }, [isLogin, isForgot]);

  // Real-time validations
  const isEmailValid = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(email);
  const isPasswordValid = password.length >= 6;
  const doPasswordsMatch = password === confirmPassword;
  const isFullNameValid = fullName.trim().split(' ').length >= 1 && fullName.trim().length >= 3;

  // Password Strength Estimator
  const getPasswordStrength = () => {
    if (!password) return { label: '', score: 0, color: 'bg-zinc-800', width: '0%' };
    let score = 0;
    if (password.length >= 6) score += 1;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
    if (/[0-9]/.test(password) || /[^A-Za-z0-9]/.test(password)) score += 1;
    
    if (score === 1) {
      return { label: 'Weak', score, color: 'bg-rose-500', width: '33%', textColor: 'text-rose-500' };
    } else if (score === 2) {
      return { label: 'Medium', score, color: 'bg-amber-500', width: '66%', textColor: 'text-amber-500' };
    } else {
      return { label: 'Strong', score, color: 'bg-teal-500', width: '100%', textColor: 'text-teal-400 font-extrabold' };
    }
  };

  const strength = getPasswordStrength();

  // Convert Firebase error codes into beautiful user friendly descriptions
  const translateError = (err: any): string => {
    const code = err?.code || err?.message || '';
    if (code.includes('auth/user-not-found')) {
      return 'Account not found. Please check your email.';
    }
    if (code.includes('auth/wrong-password')) {
      return 'Incorrect password. Please try again.';
    }
    if (code.includes('auth/email-already-in-use')) {
      return 'This email is already registered.';
    }
    if (code.includes('auth/invalid-email')) {
      return 'Please enter a valid email address.';
    }
    if (code.includes('auth/weak-password')) {
      return 'Password must be at least 6 characters.';
    }
    if (code.includes('auth/network-request-failed')) {
      return 'Internet connection problem. Please try again.';
    }
    if (code.includes('auth/too-many-requests')) {
      return 'Too many attempts. Please try again later.';
    }

    // Secondary fallback text checks for complete safety
    const msg = String(err?.message || err || '').toLowerCase();
    if (msg.includes('user-not-found') || msg.includes('user not found')) {
      return 'Account not found. Please check your email.';
    }
    if (msg.includes('wrong-password') || msg.includes('wrong password') || msg.includes('invalid-credential') || msg.includes('invalid credential')) {
      return 'Incorrect password. Please try again.';
    }
    if (msg.includes('email-already-in-use') || msg.includes('email already in use')) {
      return 'This email is already registered.';
    }
    if (msg.includes('invalid-email') || msg.includes('invalid email')) {
      return 'Please enter a valid email address.';
    }
    if (msg.includes('weak-password') || msg.includes('weak password')) {
      return 'Password must be at least 6 characters.';
    }
    if (msg.includes('network-request-failed') || msg.includes('network request failed')) {
      return 'Internet connection problem. Please try again.';
    }
    if (msg.includes('too-many-requests') || msg.includes('too many attempts')) {
      return 'Too many attempts. Please try again later.';
    }

    return 'Something went wrong. Please try again.';
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorVal('');
    setSuccessVal('');

    // Trigger dirtiness on all variables for submit
    setEmailDirty(true);
    setPasswordDirty(true);
    if (!isLogin && !isForgot) {
      setConfirmDirty(true);
      setFullNameDirty(true);
    }

    if (isForgot) {
      if (!isEmailValid) {
        setErrorVal('Please enter a valid email address.');
        return;
      }
      setLoading(true);
      try {
        await resetPassword(email);
        setSuccessVal('Password reset email sent successfully.');
      } catch (err: any) {
        setErrorVal(translateError(err));
      } finally {
        setLoading(false);
      }
    } else if (isLogin) {
      if (!isEmailValid || !password) {
        setErrorVal('Please fill all requirements with valid values.');
        return;
      }
      setLoading(true);
      try {
        await loginWithEmail(email, password);
        setSuccessVal('Welcome back.');
        if (rememberMe) {
          localStorage.setItem('mk_smm_remember_email', email);
        } else {
          localStorage.removeItem('mk_smm_remember_email');
        }
      } catch (err: any) {
        setErrorVal(translateError(err));
      } finally {
        setLoading(false);
      }
    } else {
      // Register Sign Up flow
      if (!isFullNameValid) {
        setErrorVal('Please enter your full name (minimum 3 characters).');
        return;
      }
      if (!isEmailValid) {
        setErrorVal('Please enter a valid email address.');
        return;
      }
      if (!isPasswordValid) {
        setErrorVal('Password must be at least 6 characters.');
        return;
      }
      if (!doPasswordsMatch) {
        setErrorVal('Passwords do not match.');
        return;
      }
      if (!termsAccepted) {
        setErrorVal('You must accept the Terms and Conditions.');
        return;
      }
      setLoading(true);
      try {
        // Derive clean alphanumeric username from full name
        const cleanUsername = fullName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || `user_${Date.now().toString().slice(-4)}`;
        await registerWithEmail(email, password, cleanUsername);
        setSuccessVal('Account created successfully.');
      } catch (err: any) {
        setErrorVal(translateError(err));
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    setErrorVal('');
    setSuccessVal('');
    try {
      await signInWithGoogle();
      setSuccessVal(isLogin ? 'Welcome back.' : 'Account created successfully.');
    } catch (err: any) {
      setErrorVal(translateError(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  // Safe developer account draft filler for easy testing while preserving standard design elements
  const handleLoadDraftCredentials = (role: 'user' | 'admin') => {
    if (role === 'user') {
      setEmail('user@test.com');
      setPassword('password123');
      setFullName('John User');
    } else {
      setEmail('admin@mksmm.com');
      setPassword('admin123');
      setFullName('Admin Chief');
    }
    setErrorVal('');
    setSuccessVal('Sandbox credentials loaded. You can submit to login immediately.');
    setIsLogin(true);
    setIsForgot(false);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-x-hidden bg-black selection:bg-blue-600/30 selection:text-white p-4">
      
      {/* Premium Apple animated backdrops (Orbital Ambient Elements) */}
      <div className="absolute inset-x-0 top-0 h-[600px] bg-gradient-to-b from-blue-950/20 via-black to-black pointer-events-none" />
      
      <div className="absolute top-[10%] left-[10%] w-[380px] h-[380px] rounded-full bg-blue-600/10 blur-[130px] animate-pulse duration-10000 pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[420px] h-[420px] rounded-full bg-indigo-900/10 blur-[150px] pointer-events-none" />

      <div className="relative w-full max-w-md my-8 flex flex-col justify-center" id="auth-panel-container">
        
        {/* Apple-style Logo & Minimal Brand Ribbon */}
        <div className="mb-8 flex flex-col items-center justify-center text-center select-none">
          <motion.div 
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-13 h-13 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white text-lg tracking-wider shadow-xl shadow-blue-500/20"
          >
            MK
          </motion.div>
          <h1 className="mt-4 font-display text-sm font-black tracking-widest text-zinc-400 uppercase">
            MK SMM PANEL
          </h1>
        </div>

        {/* Dynamic Interactive Card with premium Glassmorphism borders and shadows */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-3xl border border-white/10 bg-[#030712]/50 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] shadow-blue-950/20 z-10"
        >
          {/* Email Verification Banner */}
          {firebaseUser && !firebaseUser.emailVerified && (
            <div className="mb-6 p-4 rounded-2xl bg-yellow-500/5 border border-yellow-500/25 text-xs text-yellow-300 space-y-2">
              <div className="font-extrabold uppercase tracking-widest flex items-center gap-2 text-[9px] text-yellow-400">
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
                Email Verification Advisory
              </div>
              <p className="text-[11px] leading-relaxed text-yellow-250/80">
                Your credentials are saved, but your email has not been verified yet. Check your inbox.
              </p>
              <button 
                onClick={async () => {
                  try {
                    await sendVerification();
                    setSuccessVal('Password reset email sent successfully.');
                  } catch (e: any) {
                    setErrorVal(translateError(e));
                  }
                }}
                className="mt-2 w-full flex items-center justify-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-300 hover:text-black py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                <Send className="h-3 w-3" />
                Dispatch Verification Link
              </button>
            </div>
          )}

          {/* Success and Error Prompts */}
          <AnimatePresence mode="wait">
            {errorVal && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="mb-6 flex gap-3 rounded-2xl border border-rose-500/15 bg-rose-500/10 p-4 text-[11.5px] leading-relaxed text-rose-450"
                id="auth-error-msg"
              >
                <AlertCircle className="h-4.5 w-4.5 shrink-0 text-rose-500" />
                <span className="font-medium">{errorVal}</span>
              </motion.div>
            )}

            {successVal && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="mb-6 flex gap-3 rounded-2xl border border-teal-500/15 bg-teal-500/10 p-4 text-[11.5px] leading-relaxed text-teal-400"
                id="auth-info-msg"
              >
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-teal-500" />
                <span className="font-medium">{successVal}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content Header Title Area */}
          <div className="mb-6">
            <AnimatePresence mode="wait">
              {isForgot ? (
                <motion.div
                  key="forgot"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white leading-tight">
                    Reset Password
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1.5 font-normal">
                    Enter your email to receive a password recovery correspondence.
                  </p>
                </motion.div>
              ) : isLogin ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white leading-tight">
                    Welcome Back
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1.5 font-normal">
                    Secure access portal to the MK SMM pricing desk.
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-white leading-tight">
                    Create Account
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1.5 font-normal">
                    Provision your high-speed reseller node in the network.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Main Form Fields Layout */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            
            <AnimatePresence mode="popLayout">
              {/* Full Name field (Signup only) */}
              {!isForgot && !isLogin && (
                <motion.div
                  key="fullname-field"
                  initial={{ opacity: 0, height: 0, y: -8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <label className="block text-[9.5px] uppercase tracking-wider font-extrabold text-zinc-400 mb-1.5 select-none leading-none">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4.5 w-4.5 text-zinc-550 pointer-events-none" />
                    <input
                      id="auth-input-fullname"
                      type="text"
                      required
                      value={fullName}
                      onBlur={() => setFullNameDirty(true)}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Maverick Meraj"
                      className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-black/40 text-[13px] text-white placeholder-zinc-700 outline-none transition-all ${
                        fullNameDirty && !isFullNameValid 
                          ? 'border-rose-500/40 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                          : 'border-white/10 hover:border-white/15 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                      }`}
                    />
                  </div>
                  {fullNameDirty && !isFullNameValid && (
                    <p className="text-[10px] text-rose-450 mt-1">Please enter your name (min 3 chars).</p>
                  )}
                </motion.div>
              )}

              {/* Email Address element (Universal) */}
              <motion.div key="email-field" layout>
                <label className="block text-[9.5px] uppercase tracking-wider font-extrabold text-zinc-400 mb-1.5 select-none leading-none">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4.5 w-4.5 text-zinc-550 pointer-events-none" />
                  <input
                    id={isForgot ? "auth-input-reset-email" : "auth-input-email"}
                    type="email"
                    required
                    value={email}
                    onBlur={() => setEmailDirty(true)}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-black/40 text-[13px] text-white placeholder-zinc-700 outline-none transition-all ${
                      emailDirty && !isEmailValid 
                        ? 'border-rose-500/40 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                        : 'border-white/10 hover:border-white/15 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                    }`}
                  />
                </div>
                {emailDirty && !isEmailValid && (
                  <p className="text-[10px] text-rose-450 mt-1">Please enter a valid email address.</p>
                )}
              </motion.div>

              {/* Password field (Login and Signup) */}
              {!isForgot && (
                <motion.div
                  key="password-field"
                  initial={{ opacity: 0, height: 0, y: 8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-1.5"
                >
                  <div className="flex justify-between items-center select-none">
                    <label className="block text-[9.5px] uppercase tracking-wider font-extrabold text-zinc-400 leading-none">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => setIsForgot(true)}
                        className="text-[9.5px] text-zinc-500 hover:text-blue-400 uppercase font-black tracking-wider transition-colors cursor-pointer"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-zinc-550 pointer-events-none" />
                    <input
                      id="auth-input-password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onBlur={() => setPasswordDirty(true)}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-11 pr-11 py-3 rounded-xl border bg-black/40 text-[13px] text-white placeholder-zinc-700 outline-none transition-all ${
                        passwordDirty && !isPasswordValid && !isLogin
                          ? 'border-rose-500/40 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                          : 'border-white/10 hover:border-white/15 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password validation indicators (Only for signup) */}
                  {!isLogin && password && (
                    <div className="space-y-2 pt-1.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-zinc-500 uppercase tracking-widest font-bold">Strength indicator:</span>
                        <span className={strength.textColor}>{strength.label}</span>
                      </div>
                      
                      {/* Gradient Bar indicator */}
                      <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${strength.color} transition-all duration-300`} 
                          style={{ width: strength.width }} 
                        />
                      </div>
                      
                      {/* Form check criteria metrics */}
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-zinc-500 mt-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${password.length >= 6 ? 'bg-teal-500' : 'bg-zinc-800'}`} />
                          <span>At least 6 chars</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'bg-teal-500' : 'bg-zinc-800'}`} />
                          <span>Case mix (A/a)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-teal-500' : 'bg-zinc-800'}`} />
                          <span>At least 1 digit</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${/[^A-Za-z0-9]/.test(password) ? 'bg-teal-500' : 'bg-zinc-800'}`} />
                          <span>Special symbol</span>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Password Confirm Field (Signup only) */}
              {!isForgot && !isLogin && (
                <motion.div
                  key="confirm-password-field"
                  initial={{ opacity: 0, height: 0, y: 8 }}
                  animate={{ opacity: 1, height: 'auto', y: 0 }}
                  exit={{ opacity: 0, height: 0, y: 8 }}
                  transition={{ duration: 0.25 }}
                >
                  <label className="block text-[9.5px] uppercase tracking-wider font-extrabold text-zinc-400 mb-1.5 select-none leading-none">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4.5 w-4.5 text-zinc-550 pointer-events-none" />
                    <input
                      id="auth-input-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onBlur={() => setConfirmDirty(true)}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full pl-11 pr-11 py-3 rounded-xl border bg-black/40 text-[13px] text-white placeholder-zinc-700 outline-none transition-all ${
                        confirmDirty && !doPasswordsMatch
                          ? 'border-rose-500/40 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10' 
                          : 'border-white/10 hover:border-white/15 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-2.5 p-1 text-zinc-500 hover:text-white transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmDirty && !doPasswordsMatch && (
                    <p className="text-[10px] text-rose-450 mt-1">Passwords do not match.</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Remember Me Button/Checkbox (Login mode only) */}
            {isLogin && !isForgot && (
              <div className="flex items-center justify-between pb-2 pt-1 select-none">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400 hover:text-white transition-colors touch-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-md border-white/10 bg-black/50 text-blue-600 focus:ring-0 outline-none cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>
              </div>
            )}

            {/* Terms and Conditions Checkbox (Signup mode only) */}
            {!isLogin && !isForgot && (
              <div className="flex items-start pb-2 select-none">
                <label className="flex gap-2.5 cursor-pointer text-[11px] text-zinc-400 hover:text-white transition-colors leading-relaxed touch-none">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 mt-0.5 rounded-md border-white/10 bg-black/50 text-blue-600 focus:ring-0 outline-none cursor-pointer"
                  />
                  <span>
                    I represent that I am at least 18 and accept the{' '}
                    <span className="text-blue-400 hover:underline">Terms of Service</span> and{' '}
                    <span className="text-blue-400 hover:underline">Cookies Policy</span>.
                  </span>
                </label>
              </div>
            )}

            {/* Core Action Button */}
            <button
              id="auth-btn-submit"
              type="submit"
              disabled={loading || googleLoading}
              className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-650 hover:from-blue-600 hover:to-blue-750 text-white font-extrabold text-[12px] tracking-widest uppercase py-3.5 shadow-lg shadow-blue-500/10 active:scale-[0.985] disabled:opacity-40 transition-all cursor-pointer select-none border border-blue-400/15"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4.5 w-4.5 animate-spin text-white" />
                  AUTHENTICATING CLIENT...
                </>
              ) : isForgot ? (
                'TRANSMIT RECOVERY EMAIL'
              ) : isLogin ? (
                'SIGN IN TO CLIENT LEDGER'
              ) : (
                'CREATE SMM NODE ACCOUNT'
              )}
            </button>
          </form>

          {/* Social Sign-In (Login / Signup Modes) */}
          {!isForgot && (
            <div className="mt-6 space-y-4">
              <div className="relative flex py-1 items-center select-none">
                <div className="flex-grow border-t border-white/5"></div>
                <span className="flex-shrink mx-3 text-[8.5px] uppercase tracking-widest text-[#52525b] font-black">OR CONTINUE WITH</span>
                <div className="flex-grow border-t border-white/5"></div>
              </div>

              {/* Standard Compliant Continue with Google button with proper brand logo */}
              <button
                id="auth-btn-google"
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading || googleLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-black/20 hover:bg-white/5 py-3 text-xs font-bold tracking-wider text-white transition-all cursor-pointer active:scale-[0.985] disabled:opacity-40 select-none text-[12px]"
              >
                {googleLoading ? (
                  <RefreshCw className="h-4.5 w-4.5 animate-spin text-blue-500" />
                ) : (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.13-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>
            </div>
          )}

          {/* Core mode link back and forth Switchers */}
          <div className="mt-6 flex justify-center text-xs text-zinc-500 select-none">
            {isForgot ? (
              <button
                type="button"
                onClick={() => setIsForgot(false)}
                className="hover:text-white flex items-center gap-1.5 transition-colors font-semibold tracking-wider uppercase text-[10px]"
              >
                Back to Sign In
              </button>
            ) : isLogin ? (
              <div className="flex items-center gap-1.5">
                <span>New to MK SMM?</span>
                <button
                  type="button"
                  id="auth-tab-signup"
                  onClick={() => setIsLogin(false)}
                  className="text-blue-400 hover:text-blue-350 hover:underline transition-colors font-black uppercase text-[10px] tracking-wider"
                >
                  Create Account
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span>Already registered?</span>
                <button
                  type="button"
                  id="auth-tab-signin"
                  onClick={() => setIsLogin(true)}
                  className="text-blue-400 hover:text-blue-350 hover:underline transition-colors font-black uppercase text-[10px] tracking-wider"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>

          {/* Interactive Secure System Gateway footer link */}
          <div className="mt-6 flex justify-center text-[9px] uppercase pt-5 border-t border-white/5 select-none">
            <button
              type="button"
              id="auth-go-to-admin"
              onClick={() => {
                window.history.pushState(null, '', '/admin/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="text-[#52525b] hover:text-rose-500 transition-colors font-extrabold tracking-widest hover:underline"
            >
              🛡️ SYSTEM ADMINISTRATION GATEWAY
            </button>
          </div>

        </motion.div>

        {/* Sandbox Test badging widget (Designed to match the high-end Apple-themed layout) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 border border-white/5 bg-[#030712]/10 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-3.5 select-none"
        >
          <div className="flex items-center gap-1.5 justify-center">
            <span className="text-[8.5px] font-black uppercase tracking-widest text-blue-500 block">
              ⚡ Sandbox Sandbox Authentication Nodes
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full">
            <button
              id="auth-quick-user"
              type="button"
              onClick={() => handleLoadDraftCredentials('user')}
              className="flex flex-col items-start rounded-xl border border-white/5 bg-zinc-950/20 hover:bg-zinc-900/40 p-2.5 text-left transition-all hover:border-white/10"
            >
              <span className="text-[11px] font-extrabold text-white">Guest Client</span>
              <span className="text-[8.5px] font-mono text-zinc-500 mt-0.5 select-all">user@test.com</span>
              <span className="text-[8.5px] font-mono text-zinc-650 select-all">password123</span>
            </button>
            <button
              id="auth-quick-admin"
              type="button"
              onClick={() => handleLoadDraftCredentials('admin')}
              className="flex flex-col items-start rounded-xl border border-white/5 bg-zinc-950/20 hover:bg-zinc-900/40 p-2.5 text-left transition-all hover:border-white/10"
            >
              <span className="text-[11px] font-extrabold text-amber-500">SysAdmin Code</span>
              <span className="text-[8.5px] font-mono text-zinc-500 mt-0.5 select-all">admin@mksmm.com</span>
              <span className="text-[8.5px] font-mono text-zinc-650 select-all">admin123</span>
            </button>
          </div>
        </motion.div>
        
      </div>
    </div>
  );
}
