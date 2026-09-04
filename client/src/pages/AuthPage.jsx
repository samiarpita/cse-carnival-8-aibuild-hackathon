import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  Layers,
  Sparkles,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Building,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ThemeToggle from '../components/ThemeToggle';

const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Electrical & Electronic Engineering',
  'Civil Engineering',
  'Mechanical & Production Engineering',
  'Textile Engineering',
  'Architecture',
  'Business Administration',
];

export function evaluatePasswordStrength(password = '') {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;
  
  let label = 'Weak';
  let color = 'bg-rose-500 text-rose-600 dark:text-rose-400';
  let barColor = 'bg-rose-500';
  let percentage = 20;

  if (score === 5) {
    label = 'Strong';
    color = 'bg-emerald-500 text-emerald-600 dark:text-emerald-400';
    barColor = 'bg-emerald-500';
    percentage = 100;
  } else if (score >= 3) {
    label = 'Moderate';
    color = 'bg-amber-500 text-amber-600 dark:text-amber-400';
    barColor = 'bg-amber-500';
    percentage = score * 20;
  } else if (score > 0) {
    percentage = score * 20;
  }

  const isValid = score === 5;
  return { checks, score, label, color, barColor, percentage, isValid };
}

export default function AuthPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { login, register, isAuthenticated, user } = useAuth();
  const { addToast } = useToast();

  // Mode: 'login' or 'register' (synced with query param or path)
  const initialMode =
    searchParams.get('mode') === 'register' || location.pathname.includes('register')
      ? 'register'
      : 'login';

  const [mode, setMode] = useState(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Login Form State
  const [loginForm, setLoginForm] = useState({
    emailOrId: '',
    password: '',
    remember: true,
  });

  // Register Form State
  const [registerForm, setRegisterForm] = useState({
    name: '',
    student_id: '',
    email: '',
    department: 'Computer Science & Engineering',
    role: 'Student',
    password: '',
    confirmPassword: '',
  });

  // Keep mode in sync if URL changes
  useEffect(() => {
    const qMode = searchParams.get('mode');
    if (qMode === 'register' || qMode === 'login') {
      setMode(qMode);
    }
  }, [searchParams]);

  const handleSwitchMode = (newMode) => {
    setMode(newMode);
    setSearchParams({ mode: newMode });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.emailOrId.trim() || !loginForm.password) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please enter your University Email/Student ID and password.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const loggedUser = await login({
        emailOrId: loginForm.emailOrId,
        password: loginForm.password,
      });

      addToast({
        type: 'success',
        title: `Welcome Back, ${loggedUser.name}!`,
        message: 'You have logged in successfully to CampusOS.',
      });

      navigate('/schedules');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Login Failed',
        message: err.message || 'Invalid credentials.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password) {
      addToast({
        type: 'error',
        title: 'Missing Required Fields',
        message: 'Please provide full name, university email, and a password.',
      });
      return;
    }

    const strength = evaluatePasswordStrength(registerForm.password);
    if (!strength.isValid) {
      addToast({
        type: 'error',
        title: 'Password Too Weak',
        message: 'Password must contain at least 8 characters with uppercase, lowercase, number, and special character.',
      });
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      addToast({
        type: 'error',
        title: 'Passwords Do Not Match',
        message: 'Please verify that both password fields are identical.',
      });
      return;
    }

    setIsLoading(true);
    try {
      const newUser = await register({
        name: registerForm.name,
        email: registerForm.email,
        student_id: registerForm.student_id,
        department: registerForm.department,
        role: registerForm.role,
        password: registerForm.password,
      });

      addToast({
        type: 'success',
        title: 'Registration Complete!',
        message: `Account created for ${newUser.name} (${newUser.student_id}).`,
      });

      navigate('/schedules');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Registration Error',
        message: err.message || 'Could not complete registration.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#ffffff] dark:bg-[#000000] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white transition-colors duration-300">
      {/* Background Campus Image Watermark with Low Opacity & Emerald Radial Lighting */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/aust_campus.png"
          alt="AUST Campus Background"
          className="w-full h-full object-cover object-center opacity-[0.14] dark:opacity-[0.12] filter brightness-100 dark:brightness-90 contrast-110 scale-105"
        />
        {/* Gradients blending with green/white theme */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/80 to-white/60 dark:from-black dark:via-black/85 dark:to-black/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent dark:from-emerald-600/15" />

        {/* Ambient emerald blur glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-[130px] pointer-events-none" />
      </div>

      {/* Top Navbar */}
      <header className="relative z-20 border-b border-emerald-900/10 dark:border-emerald-800/30 bg-white/70 dark:bg-black/60 backdrop-blur-md px-5 sm:px-8 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold tracking-tight text-emerald-950 dark:text-white text-base leading-tight flex items-center gap-2">
              CampusOS
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                AUST
              </span>
            </div>
            <p className="text-[10px] text-emerald-800/70 dark:text-slate-400">Authentication Portal</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <ThemeToggle compact={true} />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-900 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-slate-900 border border-emerald-200 dark:border-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Landing Page</span>
          </Link>
        </div>
      </header>

      {/* Main Authentication Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-lg glass-card rounded-3xl p-6 sm:p-9 shadow-2xl border border-emerald-500/25 dark:border-emerald-500/30 backdrop-blur-2xl">
          {/* Card Header & Brand Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/30 mb-3">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-emerald-950 dark:text-white tracking-tight">
              {mode === 'login' ? 'Sign In to CampusOS' : 'Create CampusOS Account'}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-slate-300 mt-1">
              {mode === 'login'
                ? 'Access your class routines, lab bookings, coursework & AI Copilot'
                : 'Join the unified Ahsanullah University campus intelligence network'}
            </p>
          </div>

          {/* Switch / Toggle Tabs: Login vs Register */}
          <div className="p-1 rounded-2xl bg-emerald-900/10 dark:bg-emerald-950/60 border border-emerald-500/20 grid grid-cols-2 gap-1 mb-6">
            <button
              type="button"
              onClick={() => handleSwitchMode('login')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 scale-[1.01]'
                  : 'text-emerald-900/80 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>Log In</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchMode('register')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 scale-[1.01]'
                  : 'text-emerald-900/80 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Register</span>
            </button>
          </div>

          {/* LOGIN FORM */}
          {mode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 animate-in fade-in duration-200">
              {/* Email / Student ID */}
              <div>
                <label className="block text-xs font-bold text-emerald-950 dark:text-slate-200 mb-1.5">
                  University Email or Student ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-emerald-700 dark:text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 20-40532@aust.edu or 20-40532"
                    value={loginForm.emailOrId}
                    onChange={(e) => setLoginForm({ ...loginForm, emailOrId: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 text-sm text-slate-900 dark:text-white placeholder-emerald-900/40 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-emerald-950 dark:text-slate-200 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-emerald-700 dark:text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter your account password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 text-sm text-slate-900 dark:text-white placeholder-emerald-900/40 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-white absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-emerald-900 dark:text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={loginForm.remember}
                    onChange={(e) => setLoginForm({ ...loginForm, remember: e.target.checked })}
                    className="rounded bg-emerald-100 dark:bg-slate-800 border-emerald-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
                  />
                  Remember my session
                </label>

                <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  AUST CSE Portal
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-2"
              >
                <span>{isLoading ? 'Signing In...' : 'Sign In to CampusOS'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5 animate-in fade-in duration-200">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-emerald-950 dark:text-slate-200 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-emerald-700 dark:text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sakibul Hassan"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 text-sm text-slate-900 dark:text-white placeholder-emerald-900/40 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Student ID & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 dark:text-slate-200 mb-1">
                    Student ID / Roll
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 20-40532"
                    value={registerForm.student_id}
                    onChange={(e) => setRegisterForm({ ...registerForm, student_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 text-sm text-slate-900 dark:text-white placeholder-emerald-900/40 dark:placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 dark:text-slate-200 mb-1">
                    Campus Role
                  </label>
                  <select
                    value={registerForm.role}
                    onChange={(e) => setRegisterForm({ ...registerForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="Student">Student</option>
                    <option value="Faculty">Faculty</option>
                  </select>
                </div>
              </div>

              {/* University Email */}
              <div>
                <label className="block text-xs font-bold text-emerald-950 dark:text-slate-200 mb-1">
                  University Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-emerald-700 dark:text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. sakibul.cse@aust.edu"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 text-sm text-slate-900 dark:text-white placeholder-emerald-900/40 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-emerald-950 dark:text-slate-200 mb-1">
                  Academic Department
                </label>
                <select
                  value={registerForm.department}
                  onChange={(e) => setRegisterForm({ ...registerForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-emerald-950 dark:text-slate-200 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showRegisterPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 8 characters"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 text-sm text-slate-900 dark:text-white placeholder-emerald-900/40 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
                    >
                      {showRegisterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-emerald-950 dark:text-slate-200 mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="w-full pl-3 pr-9 py-2 rounded-xl bg-emerald-50/50 dark:bg-slate-900/90 border border-emerald-300/80 dark:border-emerald-800/60 text-sm text-slate-900 dark:text-white placeholder-emerald-900/40 dark:placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="p-1 text-slate-400 hover:text-emerald-600 dark:hover:text-white absolute right-2.5 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Strength Meter & Live Security Checklist */}
              {registerForm.password && (
                <div className="p-3 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/40 border border-emerald-500/15 space-y-2 animate-in fade-in duration-200">
                  {(() => {
                    const str = evaluatePasswordStrength(registerForm.password);
                    return (
                      <>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-950 dark:text-slate-300">
                            Password Strength:
                          </span>
                          <span className={`font-extrabold uppercase tracking-wider text-[10px] ${str.color}`}>
                            {str.label} ({str.score}/5)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full ${str.barColor} transition-all duration-300`}
                            style={{ width: `${str.percentage}%` }}
                          />
                        </div>

                        {/* Constraints Checklist */}
                        <div className="grid grid-cols-2 gap-1 text-[10px] pt-1">
                          <div className={`flex items-center gap-1 font-medium ${str.checks.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <CheckCircle2 className={`w-3 h-3 ${str.checks.length ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-30'}`} />
                            <span>8+ characters</span>
                          </div>

                          <div className={`flex items-center gap-1 font-medium ${str.checks.uppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <CheckCircle2 className={`w-3 h-3 ${str.checks.uppercase ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-30'}`} />
                            <span>Uppercase (A-Z)</span>
                          </div>

                          <div className={`flex items-center gap-1 font-medium ${str.checks.lowercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <CheckCircle2 className={`w-3 h-3 ${str.checks.lowercase ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-30'}`} />
                            <span>Lowercase (a-z)</span>
                          </div>

                          <div className={`flex items-center gap-1 font-medium ${str.checks.number ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <CheckCircle2 className={`w-3 h-3 ${str.checks.number ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-30'}`} />
                            <span>Number (0-9)</span>
                          </div>

                          <div className={`flex items-center gap-1 font-medium col-span-2 ${str.checks.special ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            <CheckCircle2 className={`w-3 h-3 ${str.checks.special ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-30'}`} />
                            <span>Special symbol (!@#$%^&*...)</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Register Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 mt-2"
              >
                <span>{isLoading ? 'Creating Account...' : 'Complete Registration'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-4 px-5 text-center text-xs text-emerald-900/60 dark:text-slate-500 border-t border-emerald-900/10 dark:border-emerald-800/30 bg-white/60 dark:bg-black/60 backdrop-blur-md">
        <span>CampusOS Security • Ahsanullah University of Science and Technology (AUST)</span>
      </footer>
    </div>
  );
}
