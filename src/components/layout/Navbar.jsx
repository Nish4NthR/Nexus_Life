import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useDriveAuthStore } from '../../store/useDriveAuthStore.js';
import ThemeToggle from '../ui/ThemeToggle.jsx';

const NAV = [
  { to: '/',           label: 'Dashboard',  icon: '◎' },
  { to: '/habits',     label: 'Habits',     icon: '✦' },
  { to: '/bad-habits', label: 'Bad Habits', icon: '⌖' },
  { to: '/expenses',   label: 'Expenses',   icon: '₹' },
  { to: '/goals',      label: 'Goals',      icon: '◈' },
  { to: '/learning',   label: 'Learning',   icon: '☄' },
  { to: '/analytics',  label: 'Analytics',  icon: '⌬' },
  { to: '/journal',    label: 'Journal',    icon: '✺' },
  { to: '/settings',   label: 'Settings',   icon: '⚙' },
];

export default function Navbar() {
  const username = useAuthStore((s) => s.username) || 'Operator';
  const logout = useAuthStore((s) => s.logout);
  const signOutDrive = useDriveAuthStore((s) => s.signOut);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    signOutDrive();
    logout();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-space-900/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        {/* Brand */}
        <motion.div
          initial={{ letterSpacing: '0.4em', opacity: 0 }}
          animate={{ letterSpacing: '0.2em', opacity: 1 }}
          transition={{ duration: 0.7 }}
          className="shrink-0 font-display text-lg tracking-[0.3em] text-glow"
        >
          NEXUSLIFE
        </motion.div>

        {/* Desktop nav */}
        <nav className="ml-2 hidden flex-1 items-center justify-center gap-1 xl:flex">
          {NAV.map((item) => (
            <NavLinkItem key={item.to} item={item} />
          ))}
        </nav>

        {/* Compact desktop nav (icons only at md/lg) */}
        <nav className="ml-2 hidden flex-1 items-center justify-center gap-0.5 md:flex xl:hidden">
          {NAV.map((item) => (
            <NavLinkItem key={item.to} item={item} compact />
          ))}
        </nav>

        {/* Spacer on mobile so right side floats to edge */}
        <div className="flex-1 md:hidden" />

        {/* User / logout — desktop */}
        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <ThemeToggle />
          <span className="hidden text-[10px] uppercase tracking-[0.25em] text-slate-400 lg:inline">
            {username}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-slate-300 transition hover:border-nebula-red/60 hover:text-nebula-red"
          >
            Disengage
          </button>
        </div>

        {/* Mobile: theme toggle next to hamburger so it stays reachable */}
        <ThemeToggle className="md:hidden" />

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-sm text-slate-200 md:hidden"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile drop-down panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-panel"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/5 bg-space-900/95 backdrop-blur-xl md:hidden"
          >
            <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-4">
              {NAV.map((item) => (
                <NavLinkItem
                  key={item.to}
                  item={item}
                  onClick={() => setMobileOpen(false)}
                  mobile
                />
              ))}
            </nav>
            <div className="border-t border-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-[0.25em] text-slate-500">
                  {username}
                </span>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="rounded-xl border border-white/10 bg-black/30 px-3 py-1.5 text-[10px] uppercase tracking-[0.25em] text-slate-300 hover:border-nebula-red/60 hover:text-nebula-red"
                >
                  Disengage
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function NavLinkItem({ item, compact = false, mobile = false, onClick }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'group flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm transition',
          mobile ? 'justify-start' : compact ? 'justify-center' : '',
          isActive
            ? 'bg-nebula-violet/20 text-white shadow-glow ring-1 ring-nebula-violet/50'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-100',
        ].join(' ')
      }
    >
      <span className="font-display text-base text-nebula-cyan group-hover:text-nebula-violet">
        {item.icon}
      </span>
      {!compact && <span className="tracking-wider">{item.label}</span>}
    </NavLink>
  );
}
