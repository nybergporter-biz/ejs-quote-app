import { lazy, Suspense, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Home, Users, Settings as SettingsIcon, Plus, CalendarDays, Inbox } from 'lucide-react'
import { AppProvider, useApp } from './store'
import { ToastProvider } from './components/Toast'
import { PageSkeleton } from './components/Skeleton'
import { useDarkMode } from './hooks/useDarkMode'

const Dashboard = lazy(() => import('./views/Dashboard'))
const LeadsInbox = lazy(() => import('./views/LeadsInbox'))
const QuoteBuilder = lazy(() => import('./views/QuoteBuilder'))
const QuoteDetail = lazy(() => import('./views/QuoteDetail'))
const CustomerList = lazy(() => import('./views/CustomerList'))
const CustomerProfile = lazy(() => import('./views/CustomerProfile'))
const Schedule = lazy(() => import('./views/Schedule'))
const Settings = lazy(() => import('./views/Settings'))
const Setup = lazy(() => import('./views/Setup'))
const Intro = lazy(() => import('./views/Intro'))

function PageFallback() {
  return <PageSkeleton />
}

const NAV = [
  { key: 'dashboard', icon: Home, label: 'Home' },
  { key: 'leads', icon: Inbox, label: 'Leads' },
  { key: 'schedule', icon: CalendarDays, label: 'Schedule' },
  { key: 'customers', icon: Users, label: 'Customers' },
  { key: 'settings', icon: SettingsIcon, label: 'Settings' },
]

function BottomNav({ route, navigate }) {
  const { unreadLeadCount } = useApp()
  return (
    <div
      className="fixed left-0 right-0 bottom-0 pb-safe"
      style={{ zIndex: 800 }}
    >
      <div
        className="glass mx-auto flex items-center justify-around"
        style={{
          maxWidth: 480,
          margin: '0 auto',
          marginBottom: 8,
          borderRadius: 22,
          padding: '8px 10px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
        }}
      >
        {NAV.slice(0, 2).map((n) => (
          <NavItem key={n.key} n={n} active={route.view === n.key} onClick={() => navigate(n.key)} badge={n.key === 'leads' ? unreadLeadCount : 0} />
        ))}

        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => navigate('builder')}
          className="flex items-center justify-center shimmer-sweep"
          style={{
            width: 56, height: 56, borderRadius: 18, marginTop: -22,
            background: 'linear-gradient(135deg, var(--teal) 0%, var(--teal-lt) 100%)',
            color: '#fff', border: '3px solid var(--bg)',
            boxShadow: '0 8px 24px rgba(42,127,138,0.5)',
          }}
          aria-label="New quote"
        >
          <Plus size={26} />
        </motion.button>

        {NAV.slice(2).map((n) => (
          <NavItem key={n.key} n={n} active={route.view === n.key} onClick={() => navigate(n.key)} />
        ))}
      </div>
    </div>
  )
}

function NavItem({ n, active, onClick, badge = 0 }) {
  const Icon = n.icon
  return (
    <button onClick={onClick} className="relative flex flex-col items-center gap-1 px-2 py-1.5" style={{ minWidth: 52 }}>
      {active && (
        <motion.span
          layoutId="nav-pill"
          className="absolute inset-0"
          style={{ background: 'color-mix(in srgb, var(--teal) 16%, transparent)', borderRadius: 14 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}
      <span style={{ position: 'relative' }}>
        <Icon size={20} color={active ? 'var(--teal-lt)' : 'var(--text3)'} style={{ position: 'relative' }} />
        {badge > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="tabular"
            style={{
              position: 'absolute', top: -5, right: -9, minWidth: 16, height: 16, padding: '0 4px',
              borderRadius: 999, background: '#ff6b35', color: '#fff', fontSize: 9.5, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg)',
              boxSizing: 'content-box',
            }}
          >
            {badge > 9 ? '9+' : badge}
          </motion.span>
        )}
      </span>
      <span style={{ position: 'relative', fontSize: 10.5, fontWeight: 600, color: active ? 'var(--teal-lt)' : 'var(--text3)' }}>
        {n.label}
      </span>
    </button>
  )
}

function Shell() {
  const { setupDone, introSeen, completeIntro } = useApp()
  useDarkMode()
  // Push-notification taps land on /?view=leads — honor it as the initial view.
  const [route, setRoute] = useState(() => {
    try {
      const view = new URLSearchParams(window.location.search).get('view')
      if (view === 'leads') return { view: 'leads', params: {} }
    } catch { /* ignore */ }
    return { view: 'dashboard', params: {} }
  })

  const navigate = useCallback((view, params = {}) => {
    setRoute({ view, params })
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' })
  }, [])

  if (!introSeen) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Intro onEnter={completeIntro} />
      </Suspense>
    )
  }

  if (!setupDone) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Setup onDone={() => navigate('dashboard')} />
      </Suspense>
    )
  }

  const immersive = route.view === 'builder'

  const renderView = () => {
    switch (route.view) {
      case 'builder':
        return <QuoteBuilder route={route} navigate={navigate} />
      case 'quote':
        return <QuoteDetail route={route} navigate={navigate} />
      case 'customers':
        return <CustomerList route={route} navigate={navigate} />
      case 'customer':
        return <CustomerProfile route={route} navigate={navigate} />
      case 'leads':
        return <LeadsInbox route={route} navigate={navigate} />
      case 'schedule':
        return <Schedule route={route} navigate={navigate} />
      case 'settings':
        return <Settings route={route} navigate={navigate} />
      default:
        return <Dashboard route={route} navigate={navigate} />
    }
  }

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: immersive ? 0 : 'calc(env(safe-area-inset-bottom) + 116px)' }}>
      <Suspense fallback={<PageFallback />}>
        <AnimatePresence mode="wait">
          <motion.div
            key={route.view + (route.params.quoteId || '')}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderView()}
          </motion.div>
        </AnimatePresence>
      </Suspense>
      {!immersive && <BottomNav route={route} navigate={navigate} />}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </AppProvider>
  )
}
