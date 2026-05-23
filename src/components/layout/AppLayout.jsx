import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StarField from '../ui/StarField.jsx';
import Navbar from './Navbar.jsx';
import { useTelegramActions } from '../../hooks/useTelegramActions.js';

export default function AppLayout() {
  const location = useLocation();
  // Polls the Telegram reminder Worker for queued button taps and applies them.
  // No-op when VITE_TELEGRAM_API_URL / VITE_TELEGRAM_API_SECRET aren't set.
  useTelegramActions();

  return (
    <div className="relative min-h-screen">
      <StarField density={70} />
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
