import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Bot,
  Calendar,
  Building2,
  PartyPopper,
  Megaphone,
  BookOpenCheck,
  Layers,
  Clock,
  CheckCircle2,
  Database,
  Cpu,
  Users,
  LogIn,
  UserPlus,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import ThemeToggle from '../components/ThemeToggle';

const SYSTEM_FEATURES = [
  {
    title: 'Class Schedules',
    desc: 'Sunday–Thursday AUST routine management with room allocations, instructor tracking, and instant class updates.',
    icon: Calendar,
    path: '/schedules',
    color: 'from-emerald-500/20 to-teal-600/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/40',
  },
  {
    title: 'Rooms & Lab Booking',
    desc: 'Instant slot reservations with real-time overlap conflict detection, capacity filters, and equipment tagging.',
    icon: Building2,
    path: '/rooms',
    color: 'from-teal-500/20 to-emerald-600/10 text-teal-800 dark:text-teal-400 border-teal-300 dark:border-teal-700/40',
  },
  {
    title: 'Events & Hackathons',
    desc: 'Automated student registration with strict capacity enforcement, live attendee rosters, and status management.',
    icon: PartyPopper,
    path: '/events',
    color: 'from-emerald-500/20 to-teal-500/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/40',
  },
  {
    title: 'Announcements',
    desc: 'Priority-based notice broadcasting (high, medium, low) with auto-expiring flags and department advisory updates.',
    icon: Megaphone,
    path: '/announcements',
    color: 'from-teal-500/20 to-emerald-600/10 text-teal-800 dark:text-teal-400 border-teal-300 dark:border-teal-700/40',
  },
  {
    title: 'Course Assignments',
    desc: 'Chronologically sorted deadlines, automated overdue alerts, point scores, and 1-click submission status toggles.',
    icon: BookOpenCheck,
    path: '/assignments',
    color: 'from-emerald-500/20 to-emerald-700/10 text-emerald-800 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/40',
  },
  {
    title: 'CampusCopilot AI',
    desc: 'LLM wired with real tool calling to look up live routines, book rooms, register for talks, and refuse unauthorized operations.',
    icon: Bot,
    path: '/chat',
    color: 'from-emerald-600/25 to-teal-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-400 dark:border-emerald-600/50',
    highlight: true,
  },
];

const STATS = [
  { value: '24', label: 'Class Routines' },
  { value: '20', label: 'Campus Spaces' },
  { value: '7', label: 'Flagship Events' },
  { value: '100%', label: 'Live Synced' },
];

export default function LandingPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { addToast } = useToast();

  const handleSignOut = () => {
    logout();
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been signed out of CampusOS.',
    });
  };

  return (
    <div className="relative min-h-screen bg-white dark:bg-black text-black dark:text-emerald-50 overflow-hidden flex flex-col justify-between transition-colors duration-300 selection:bg-emerald-500 selection:text-white">
      {/* Background Campus Image Watermark with Glassmorphic Gradient Mask */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <img
          src="/aust_campus.png"
          alt="AUST Campus Building"
          className="w-full h-full object-cover object-center opacity-[0.06] dark:opacity-[0.12] filter brightness-105 dark:brightness-75 contrast-100 dark:contrast-125 scale-105 transition-opacity duration-300"
        />
        {/* Gradients to smoothly blend watermark with UI */}
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-white/60 dark:from-black dark:via-black/80 dark:to-black/60 transition-colors duration-300" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 dark:from-emerald-900/20 via-transparent to-transparent pointer-events-none" />
        
        {/* Glowing emerald & teal ambient mesh lights */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 dark:bg-emerald-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-10 w-[450px] h-[300px] bg-teal-500/10 dark:bg-teal-600/10 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col flex-1">
        {/* Top Navigation Bar with Theme Switcher and Auth Controls */}
        <header className="border-b border-emerald-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-50 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-5 sm:px-8 py-3.5 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-extrabold tracking-tight text-black dark:text-white text-lg leading-tight flex items-center gap-2">
                  CampusOS
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-500/25">
                    v8.0
                  </span>
                </div>
                <p className="text-[11px] text-black/75 dark:text-emerald-400/80 font-medium">Campus Intelligence System</p>
              </div>
            </Link>

            {/* Nav Links & Upper-Right Corner Controls */}
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden lg:flex items-center gap-5 text-sm text-black dark:text-emerald-200 font-semibold mr-2">
                <a href="#features" className="hover:text-emerald-700 dark:hover:text-white transition">Systems</a>
                <a href="#stats" className="hover:text-emerald-700 dark:hover:text-white transition">Overview</a>
                <Link to="/chat" className="hover:text-emerald-700 dark:hover:text-emerald-300 transition flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  CampusCopilot
                </Link>
              </div>

              {/* Theme Toggle Button (Light/Dark Switcher) */}
              <ThemeToggle compact={true} />

              {/* AUTH BUTTONS / USER PROFILE */}
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-black dark:text-emerald-200">
                    <span className="text-base">{user.avatar || '👨‍🎓'}</span>
                    <span className="truncate max-w-[120px]">{user.name}</span>
                  </div>

                  <Link
                    to="/schedules"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02]"
                  >
                    <span>Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={handleSignOut}
                    title="Sign Out"
                    className="p-2 rounded-xl text-black/70 dark:text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {/* Login Link */}
                  <Link
                    to="/auth?mode=login"
                    id="nav-login-btn"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-black dark:text-emerald-200 hover:text-emerald-700 dark:hover:text-white hover:bg-emerald-50/80 dark:hover:bg-slate-900 border border-emerald-300 dark:border-emerald-800/60 transition"
                  >
                    <LogIn className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                    <span>Log In</span>
                  </Link>

                  {/* Register Link */}
                  <Link
                    to="/auth?mode=register"
                    id="nav-register-btn"
                    className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.03]"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Register</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-12 sm:pt-20 pb-16 text-center">
          {/* Tagline Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300 text-xs sm:text-sm font-bold mb-6 shadow-sm backdrop-blur-md animate-in fade-in">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
            <span>Ahsanullah University of Science and Technology • CSE Carnival 8.0</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl font-extrabold text-black dark:text-white tracking-tight leading-[1.15] mb-6 max-w-4xl mx-auto">
            Unified Campus Intelligence &{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-700 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-500 bg-clip-text text-transparent">
              Real-Time AI Orchestration
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-black dark:text-emerald-100/90 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed mb-10 font-medium">
            A single, live source of truth for the entire campus. Effortlessly manage class routines, reserve lab slots with conflict detection, organize hackathon registrations, track assignments, and interact with our autonomous function-calling AI agent.
          </p>

          {/* Hero CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto mb-16">
            <Link
              to="/schedules"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-emerald-600/30 transition-all hover:scale-105"
            >
              <span>Explore Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to={isAuthenticated ? "/chat" : "/auth?mode=login"}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl glass-card text-black dark:text-white hover:bg-emerald-50 dark:hover:bg-[#111111] border border-emerald-300 dark:border-emerald-800 font-bold text-sm sm:text-base shadow-md transition-all hover:scale-105"
            >
              {isAuthenticated ? (
                <>
                  <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Talk to AI Copilot</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>Sign In / Register</span>
                </>
              )}
            </Link>
          </div>

          {/* Key Stat Cards */}
          <div id="stats" className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {STATS.map((stat, idx) => (
              <div
                key={idx}
                className="glass-card rounded-2xl p-5 border border-emerald-200 dark:border-emerald-800/80 backdrop-blur-lg flex flex-col items-center justify-center shadow-lg"
              >
                <span className="text-3xl sm:text-4xl font-extrabold text-black dark:text-white font-mono">
                  {stat.value}
                </span>
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mt-1 uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Feature Grid Section */}
        <section id="features" className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white tracking-tight">
              Five Integrated Campus Systems + AI Orchestrator
            </h2>
            <p className="text-sm text-black/80 dark:text-emerald-300/80 mt-2 max-w-xl mx-auto font-medium">
              Every system guarantees live read-write consistency without stale caches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {SYSTEM_FEATURES.map((feat, idx) => {
              const Icon = feat.icon;
              return (
                <Link
                  key={idx}
                  to={feat.path}
                  className={`glass-card glass-card-hover rounded-2xl p-6 border flex flex-col justify-between group cursor-pointer transition-all duration-300 ${
                    feat.highlight ? 'border-emerald-400/80 dark:border-emerald-600/60 shadow-emerald-500/10' : ''
                  }`}
                >
                  <div>
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${feat.color} flex items-center justify-center mb-4 border transition-transform group-hover:scale-110 shadow-sm`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>

                    <h3 className="text-lg font-bold text-black dark:text-white mb-2 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors flex items-center justify-between">
                      <span>{feat.title}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-emerald-600 dark:text-emerald-400" />
                    </h3>

                    <p className="text-xs text-black dark:text-emerald-100/90 leading-relaxed font-medium">
                      {feat.desc}
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-emerald-100 dark:border-emerald-900/40 flex items-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <span>Manage {feat.title.split(' ')[0]}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Highlights Banner */}
        <section className="max-w-6xl mx-auto px-5 sm:px-8 py-10 w-full">
          <div className="glass-card rounded-3xl p-8 sm:p-10 border border-emerald-300/80 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 dark:from-[#0a1411] dark:via-[#050907] dark:to-[#0a1814] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
            <div className="space-y-2 text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Live Backend & AI Synchronization
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-black dark:text-white">
                Experience CampusOS in Action
              </h3>
              <p className="text-xs sm:text-sm text-black dark:text-emerald-100/90 max-w-xl font-medium">
                Sign in with your student profile, edit data in the dashboard, open the AI agent, and ask it anything. Live functions ensure instant, accurate answers and zero stale caching.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              {!isAuthenticated && (
                <Link
                  to="/auth?mode=register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 transition-all hover:scale-105"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Create Account</span>
                </Link>
              )}
              <Link
                to="/chat"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl glass-card text-black dark:text-white font-bold text-sm shadow-md transition-all hover:scale-105 border border-emerald-300 dark:border-emerald-800"
              >
                <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>CampusCopilot</span>
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-emerald-200/80 dark:border-emerald-900/40 bg-white/80 dark:bg-black/80 backdrop-blur-xl py-8 px-5 sm:px-8 mt-12 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-black/70 dark:text-emerald-400/80 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-black dark:text-white">CampusOS</span>
            <span>•</span>
            <span>Ahsanullah University of Science and Technology (AUST)</span>
          </div>
          <div>
            Built for <strong className="text-emerald-700 dark:text-emerald-300 font-bold">CSE Carnival 8.0 AI-Build Hackathon</strong>
          </div>
        </div>
      </footer>
    </div>
  );
}
