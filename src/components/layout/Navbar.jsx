import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useDriveAuthStore } from '../../store/useDriveAuthStore.js';

const NAV = [
  { to: '/',           label: 'dashboard'  },
  { to: '/habits',     label: 'habits'     },
  { to: '/bad-habits', label: 'bad habits' },
  { to: '/expenses',   label: 'expenses'   },
  { to: '/goals',      label: 'goals'      },
  { to: '/learning',   label: 'learning'   },
  { to: '/analytics',  label: 'analytics'  },
  { to: '/journal',    label: 'journal'    },
  { to: '/settings',   label: 'settings'   },
];

export default function Navbar() {
  const username = useAuthStore((s) => s.username) || 'operator';
  const logout = useAuthStore((s) => s.logout);
  const signOutDrive = useDriveAuthStore((s) => s.signOut);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    signOutDrive();
    logout();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-nebula-violet/15 bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-3 sm:px-8">
        {/* Brand — terminal-prompt style */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="shrink-0 select-none font-mono text-base font-bold tracking-tight text-nebula-violet text-glow"
        >
          <span className="text-nebula-cyan">&gt;</span> nexus<span className="text-nebula-cyan">_</span>life
        </motion.div>

        {/* Desktop nav — full labels */}
        <nav className="ml-2 hidden flex-1 items-center justify-center gap-1 xl:flex">
          {NAV.map((item) => (
            <NavLinkItem key={item.to} item={item} />
          ))}
        </nav>

        {/* Compact desktop nav (md/lg) */}
        <nav className="ml-2 hidden flex-1 items-center justify-center gap-0.5 md:flex xl:hidden">
          {NAV.map((item) => (
            <NavLinkItem key={item.to} item={item} compact />
          ))}
        </nav>

        {/* Mobile spacer */}
        <div className="flex-1 md:hidden" />

        {/* Desktop right cluster */}
        <div className="hidden shrink-0 items-center gap-3 md:flex">
          <span className="hidden font-mono text-[11px] text-nebula-cyan lg:inline">
            {username}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-md border border-nebula-violet/15 bg-black px-3 py-1.5 font-mono text-[11px] text-[color:var(--text-muted)] transition hover:border-nebula-red/60 hover:text-nebula-red hover:shadow-glow-red"
          >
            logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={mobileOpen}
          className="rounded-md border border-nebula-violet/20 bg-black px-3 py-1.5 font-mono text-sm text-nebula-violet md:hidden"
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
            className="border-t border-nebula-violet/15 bg-black/95 backdrop-blur-xl md:hidden"
          >
            <nav className="mx-auto grid max-w-[1400px] grid-cols-2 gap-2 px-4 py-4">
              {NAV.map((item) => (
                <NavLinkItem
                  key={item.to}
                  item={item}
                  onClick={() => setMobileOpen(false)}
                  mobile
                />
              ))}
            </nav>
            <div className="border-t border-nebula-violet/15 px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] text-nebula-cyan">
                  {username}
                </span>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    handleLogout();
                  }}
                  className="rounded-md border border-nebula-violet/15 bg-black px-3 py-1.5 font-mono text-[11px] text-[color:var(--text-muted)] hover:border-nebula-red/60 hover:text-nebula-red"
                >
                  logout
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
          'group relative font-mono text-[13px] tracking-tight transition-colors duration-200',
          mobile
            ? 'rounded-md px-3 py-2 text-left'
            : compact
              ? 'px-2 py-1.5'
              : 'px-3 py-1.5',
          isActive
            ? 'text-nebula-violet'
            : 'text-[color:var(--text-muted)] hover:text-nebula-violet',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span>{item.label}</span>
          {/* Underline indicator — Monkeytype-style minimal active marker */}
          {!mobile && (
            <span
              className={`pointer-events-none absolute inset-x-2 -bottom-[10px] h-[2px] origin-center rounded-full bg-nebula-violet transition-all duration-200 ${
                isActive ? 'scale-x-100 opacity-100 shadow-[0_0_8px_rgba(57,255,20,0.6)]' : 'scale-x-0 opacity-0'
              }`}
            />
          )}
        </>
      )}
    </NavLink>
  );
}
