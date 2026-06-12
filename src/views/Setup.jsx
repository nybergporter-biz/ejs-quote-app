import { Suspense, lazy, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { useApp } from '../store'
import EJSLogo from '../components/EJSLogo'

const MountainBackground = lazy(() => import('../components/MountainBackground'))

export default function Setup({ onDone }) {
  const { business, updateBusiness, completeSetup } = useApp()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    ownerName: business.ownerName || '',
    companyName: business.companyName || 'Elite Junk Solutions',
    phone: business.phone || '',
    email: business.email || '',
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const finish = () => {
    updateBusiness(form)
    completeSetup()
    onDone && onDone()
  }

  return (
    <div style={{ minHeight: '100dvh', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, height: '46vh' }}>
        <Suspense fallback={null}>
          <MountainBackground />
        </Suspense>
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(7,16,30,0.2) 0%, var(--bg) 96%)',
          }}
        />
      </div>

      <div style={{ position: 'relative', zIndex: 2, padding: '0 22px', maxWidth: 460, margin: '0 auto' }}>
        <div style={{ height: '20vh' }} />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <EJSLogo size={72} />
        </motion.div>

        {step === 0 && (
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h1 style={{ fontSize: 38, fontWeight: 800, color: 'var(--text)', marginTop: 24, lineHeight: 1.05 }}>
              Quotes that<br />close on the spot.
            </h1>
            <p className="text-2" style={{ marginTop: 14, fontSize: 15, lineHeight: 1.5 }}>
              Build a cinematic, itemized junk-removal quote in under 30 seconds — right in the customer’s garage.
            </p>
            <PrimaryBtn onClick={() => setStep(1)} className="mt-8">
              Let’s set you up <ArrowRight size={18} />
            </PrimaryBtn>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }}>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', marginTop: 24 }}>The basics</h2>
            <p className="text-2" style={{ marginTop: 6, fontSize: 14 }}>We’ll personalize the app to you.</p>
            <div className="mt-6 space-y-4">
              <Field label="Your name">
                <input className="field" placeholder="Porter" value={form.ownerName} onChange={set('ownerName')} />
              </Field>
              <Field label="Company name">
                <input className="field" value={form.companyName} onChange={set('companyName')} />
              </Field>
              <Field label="Phone">
                <input className="field" inputMode="tel" placeholder="(801) 555-0142" value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Email">
                <input className="field" inputMode="email" placeholder="hello@elitejunkut.com" value={form.email} onChange={set('email')} />
              </Field>
            </div>
            <PrimaryBtn onClick={finish} className="mt-8" disabled={!form.ownerName.trim()}>
              Start quoting <Check size={18} />
            </PrimaryBtn>
            <button onClick={finish} className="w-full text-center mt-3 text-3" style={{ fontSize: 13 }}>
              Skip for now
            </button>
          </motion.div>
        )}
        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="micro-label" style={{ display: 'block', marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  )
}

function PrimaryBtn({ children, className = '', ...props }) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className={`w-full flex items-center justify-center gap-2 shimmer-sweep ${className}`}
      style={{
        background: 'linear-gradient(135deg, var(--teal) 0%, var(--teal-lt) 100%)',
        color: '#fff', fontWeight: 700, fontSize: 16,
        borderRadius: 16, padding: '15px 20px', border: 'none',
        opacity: props.disabled ? 0.5 : 1,
      }}
      {...props}
    >
      {children}
    </motion.button>
  )
}
