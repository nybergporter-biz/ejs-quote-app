import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, LogOut, Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react'
import { useApp } from '../store'
import { useToast } from './Toast'

function Github({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.575.106.785-.25.785-.555 0-.274-.01-1-.015-1.96-3.2.695-3.875-1.543-3.875-1.543-.523-1.33-1.277-1.684-1.277-1.684-1.044-.714.08-.7.08-.7 1.155.082 1.763 1.186 1.763 1.186 1.027 1.76 2.695 1.252 3.35.957.105-.744.402-1.252.73-1.54-2.555-.29-5.24-1.277-5.24-5.683 0-1.255.448-2.28 1.183-3.084-.119-.29-.513-1.46.112-3.043 0 0 .966-.31 3.165 1.178a11 11 0 0 1 5.76 0c2.198-1.488 3.162-1.178 3.162-1.178.627 1.583.233 2.753.114 3.043.737.804 1.182 1.83 1.182 3.084 0 4.417-2.69 5.39-5.253 5.674.413.357.78 1.06.78 2.137 0 1.543-.014 2.787-.014 3.167 0 .308.207.667.79.554A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5z" />
    </svg>
  )
}

export default function SyncPanel() {
  const { cloud } = useApp()
  const toast = useToast()
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  if (!cloud) return null
  const { user, status, lastSyncedAt } = cloud

  const doGithub = async () => {
    setBusy(true)
    const { error } = await cloud.signInGithub()
    if (error) { toast.warn(error.message || 'GitHub sign-in failed'); setBusy(false) }
    // on success the browser redirects to GitHub, so no further code runs here
  }

  const doEmail = async (mode) => {
    if (!email || !password) { toast.warn('Enter email and password'); return }
    setBusy(true)
    const fn = mode === 'up' ? cloud.signUpEmail : cloud.signInEmail
    const { data, error } = await fn(email, password)
    setBusy(false)
    if (error) { toast.warn(error.message); return }
    if (mode === 'up' && !data.session) {
      toast.info('Check your email to confirm, then sign in')
    } else {
      toast.success('Signed in — syncing')
    }
  }

  const doSignOut = async () => {
    await cloud.signOut()
    toast.info('Signed out (your data stays on this device)')
  }

  // ---- signed in ----
  if (user) {
    const statusMeta =
      status === 'synced'
        ? { icon: Check, color: '#4ade80', label: 'All changes synced' }
        : status === 'syncing'
        ? { icon: RefreshCw, color: 'var(--teal-lt)', label: 'Syncing…', spin: true }
        : status === 'error'
        ? { icon: AlertCircle, color: '#f6a13d', label: 'Sync paused — will retry' }
        : { icon: Cloud, color: 'var(--teal-lt)', label: 'Connected' }
    const SIcon = statusMeta.icon
    return (
      <div className="surface" style={{ borderRadius: 18, padding: 16 }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(42,127,138,0.16)', color: 'var(--teal-lt)' }}>
            <Cloud size={22} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="font-display" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Cloud sync is on</div>
            <div className="text-2" style={{ fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email || user.user_metadata?.user_name || 'Signed in'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2" style={{ marginTop: 14, padding: '10px 12px', borderRadius: 12, background: 'var(--surface2)' }}>
          <motion.span animate={statusMeta.spin ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
            <SIcon size={16} color={statusMeta.color} />
          </motion.span>
          <span style={{ fontSize: 13, color: 'var(--text)' }}>{statusMeta.label}</span>
          {lastSyncedAt && status === 'synced' && (
            <span className="text-3" style={{ fontSize: 11.5, marginLeft: 'auto' }}>
              {new Date(lastSyncedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>

        <p className="text-3" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
          Your quotes, customers and settings now sync to every device where you sign in with this account.
        </p>

        <button onClick={doSignOut} className="flex items-center justify-center gap-2 w-full" style={{ marginTop: 12, padding: '11px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>
          <LogOut size={16} /> Sign out
        </button>
      </div>
    )
  }

  // ---- signed out ----
  return (
    <div className="surface" style={{ borderRadius: 18, padding: 16 }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface2)', color: 'var(--text3)' }}>
          <CloudOff size={22} />
        </div>
        <div>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Sync across devices</div>
          <div className="text-2" style={{ fontSize: 12.5 }}>Sign in to share quotes between your phone &amp; laptop.</div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        disabled={busy}
        onClick={doGithub}
        className="flex items-center justify-center gap-2.5 w-full"
        style={{ padding: '13px', borderRadius: 12, background: '#1f2328', color: '#fff', fontWeight: 700, fontSize: 14.5, border: 'none', opacity: busy ? 0.6 : 1 }}
      >
        <Github size={18} /> Continue with GitHub
      </motion.button>

      <button onClick={() => setShowEmail((v) => !v)} className="flex items-center justify-center gap-2 w-full" style={{ marginTop: 10, color: 'var(--text2)', fontSize: 13, fontWeight: 600 }}>
        <Mail size={15} /> {showEmail ? 'Hide email option' : 'Use email instead'}
      </button>

      {showEmail && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
          <div className="space-y-2.5" style={{ marginTop: 12 }}>
            <input className="field" type="email" inputMode="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="field" type="password" placeholder="Password (6+ characters)" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="grid grid-cols-2 gap-2.5">
              <button disabled={busy} onClick={() => doEmail('in')} style={{ padding: '11px', borderRadius: 12, background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none', opacity: busy ? 0.6 : 1 }}>
                Sign in
              </button>
              <button disabled={busy} onClick={() => doEmail('up')} style={{ padding: '11px', borderRadius: 12, background: 'var(--surface2)', color: 'var(--text)', fontWeight: 700, fontSize: 14, border: '1px solid var(--border)', opacity: busy ? 0.6 : 1 }}>
                Create account
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <p className="text-3" style={{ fontSize: 11.5, marginTop: 12, lineHeight: 1.5 }}>
        Free. Your data stays private to your account. The app keeps working offline and syncs when you’re back online.
      </p>
    </div>
  )
}
