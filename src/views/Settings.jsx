import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, DollarSign, Truck, Building2, Palette, Boxes, Upload, Plus, Trash2, Eye, EyeOff, RotateCcw, Check, Cloud, Download, ShieldCheck } from 'lucide-react'
import { useApp, ACCENTS } from '../store'
import { useDarkMode } from '../hooks/useDarkMode'
import { useToast } from '../components/Toast'
import SyncPanel from '../components/SyncPanel'

const TABS = [
  { key: 'sync', label: 'Sync', icon: Cloud },
  { key: 'pricing', label: 'Pricing', icon: DollarSign },
  { key: 'ops', label: 'Operations', icon: Truck },
  { key: 'business', label: 'Business', icon: Building2 },
  { key: 'display', label: 'Display', icon: Palette },
  { key: 'items', label: 'Items', icon: Boxes },
]

export default function Settings({ navigate }) {
  const [tab, setTab] = useState('sync')

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 'calc(env(safe-area-inset-top) + 16px) 16px 24px' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 18 }}>
        <button onClick={() => navigate('dashboard')} className="surface flex items-center justify-center" style={{ width: 38, height: 38, borderRadius: 12, color: 'var(--text)' }}>
          <ChevronLeft size={20} />
        </button>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>Settings</h1>
      </div>

      {/* tabs */}
      <div className="flex gap-2 overflow-x-auto" style={{ marginBottom: 18, scrollbarWidth: 'none', paddingBottom: 4 }}>
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className="relative flex items-center gap-1.5 whitespace-nowrap" style={{ padding: '9px 14px', borderRadius: 12, flexShrink: 0, color: active ? '#fff' : 'var(--text2)', fontWeight: 600, fontSize: 13.5 }}>
              {active && <motion.span layoutId="settings-tab" className="absolute inset-0" style={{ background: 'var(--teal)', borderRadius: 12 }} transition={{ type: 'spring', stiffness: 380, damping: 30 }} />}
              <span style={{ position: 'relative' }}><Icon size={15} /></span>
              <span style={{ position: 'relative' }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {tab === 'sync' && <><SyncPanel /><BackupCard /></>}
          {tab === 'pricing' && <PricingTab />}
          {tab === 'ops' && <OpsTab />}
          {tab === 'business' && <BusinessTab />}
          {tab === 'display' && <DisplayTab />}
          {tab === 'items' && <ItemsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

/* ---------- shared controls ---------- */
function Section({ title, children, action }) {
  return (
    <div className="surface" style={{ borderRadius: 18, padding: 16, marginBottom: 14 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
        <span className="micro-label">{title}</span>
        {action}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function NumberRow({ label, value, onChange, prefix, suffix, step = 1 }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ fontSize: 14, color: 'var(--text)' }}>{label}</span>
      <div className="flex items-center" style={{ background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
        {prefix && <span className="text-3" style={{ paddingLeft: 10, fontSize: 13 }}>{prefix}</span>}
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          className="tabular"
          style={{ width: 76, background: 'transparent', border: 'none', color: 'var(--text)', textAlign: 'right', padding: '9px 8px', fontWeight: 600, fontSize: 14, outline: 'none' }}
        />
        {suffix && <span className="text-3" style={{ paddingRight: 10, fontSize: 13 }}>{suffix}</span>}
      </div>
    </div>
  )
}

function TextRow({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <label className="block">
      <span className="micro-label" style={{ display: 'block', marginBottom: 5 }}>{label}</span>
      <input className="field" type={type} placeholder={placeholder} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}

function Switch({ checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="relative" style={{ width: 50, height: 30, borderRadius: 999, background: checked ? 'var(--teal)' : 'var(--surface2)', border: '1px solid var(--border)', flexShrink: 0 }} aria-pressed={checked}>
      <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 32 }} style={{ position: 'absolute', top: 3, left: checked ? 22 : 3, width: 22, height: 22, borderRadius: 999, background: '#fff', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }} />
    </button>
  )
}

function ToggleRow({ label, sub, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div style={{ fontSize: 14, color: 'var(--text)' }}>{label}</div>
        {sub && <div className="text-3" style={{ fontSize: 12, marginTop: 1 }}>{sub}</div>}
      </div>
      <Switch checked={checked} onChange={onChange} />
    </div>
  )
}

/* ---------- tabs ---------- */
function PricingTab() {
  const { settings, updateSettings } = useApp()
  const s = (k) => (v) => updateSettings({ [k]: v })
  return (
    <>
      <Section title="Core pricing">
        <NumberRow label="Rate per cubic yard" prefix="$" value={settings.RATE_PER_CY} onChange={s('RATE_PER_CY')} />
        <NumberRow label="Minimum job fee" prefix="$" value={settings.MIN_JOB} onChange={s('MIN_JOB')} />
        <NumberRow label="Rush multiplier" suffix="×" step={0.05} value={settings.RUSH_MULTIPLIER} onChange={s('RUSH_MULTIPLIER')} />
      </Section>
      <p className="text-3" style={{ fontSize: 12.5, padding: '0 4px' }}>
        Special-item surcharges (mattress, freon, piano, etc.) are managed per-item under the <b>Items</b> tab.
      </p>
    </>
  )
}

function OpsTab() {
  const { settings, updateSettings } = useApp()
  const s = (k) => (v) => updateSettings({ [k]: v })
  return (
    <>
      <Section title="Capacity">
        <NumberRow label="Trailer capacity" suffix="CY" value={settings.TRAILER_CY} onChange={s('TRAILER_CY')} />
        <NumberRow label="Avg. weight per CY" suffix="lbs" value={settings.LBS_PER_CY} onChange={s('LBS_PER_CY')} />
      </Section>
      <Section title="Crew & labor">
        <NumberRow label="Hourly labor rate" prefix="$" value={settings.HOURLY_RATE} onChange={s('HOURLY_RATE')} />
        <NumberRow label="Crew size" value={settings.CREW_SIZE} onChange={s('CREW_SIZE')} />
      </Section>
      <Section title="Transport & dump">
        <NumberRow label="Gas rate" prefix="$" suffix="/mi" step={0.05} value={settings.GAS_PER_MILE} onChange={s('GAS_PER_MILE')} />
        <NumberRow label="Avg. miles to dump" suffix="mi" value={settings.MILES_TO_DUMP} onChange={s('MILES_TO_DUMP')} />
        <NumberRow label="North Pointe (Lindon)" prefix="$" suffix="/ton" value={settings.NORTH_RATE_PER_TON ?? 83} onChange={s('NORTH_RATE_PER_TON')} />
        <NumberRow label="South Valley (Spanish Fork)" prefix="$" suffix="/ton" value={settings.SOUTH_RATE_PER_TON ?? 45} onChange={s('SOUTH_RATE_PER_TON')} />
        <NumberRow label="Weigh fee (North Pointe)" prefix="$" value={settings.WEIGH_FEE ?? 5} onChange={s('WEIGH_FEE')} />
      </Section>
      <p className="text-3" style={{ fontSize: 12.5, padding: '0 4px' }}>
        Out-of-district rates, June 2026. North Pointe small loads are flat ($24 ≤500 lbs, $48 ≤1,000 lbs) before the per-ton rate kicks in.
      </p>
    </>
  )
}

const PARTNER_COLORS = ['#5bb5c4', '#FF6B35', '#4ade80', '#e7c14f', '#a98fd4', '#f08a7e']

function TeamSection() {
  const { team, whoami, updateMember, setWhoami } = useApp()
  const toast = useToast()
  return (
    <Section title="Team">
      {['p1', 'p2'].map((key) => {
        const m = team.members?.[key] || {}
        return (
          <div key={key} style={{ paddingBottom: key === 'p1' ? 12 : 0, borderBottom: key === 'p1' ? '1px solid var(--border)' : 'none' }}>
            <div className="flex items-center gap-2.5" style={{ marginBottom: 8 }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: m.color || '#5bb5c4', flexShrink: 0 }} />
              <input
                className="field"
                placeholder={key === 'p1' ? 'Owner 1 (you?)' : 'Partner name'}
                value={m.name || ''}
                onChange={(e) => updateMember(key, { name: e.target.value })}
                style={{ flex: 1 }}
              />
            </div>
            <div className="flex items-center gap-2">
              {PARTNER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => updateMember(key, { color: c })}
                  aria-label={`Color ${c}`}
                  style={{
                    width: 26, height: 26, borderRadius: 999, background: c,
                    border: m.color === c ? '2.5px solid var(--text)' : '2.5px solid transparent',
                  }}
                />
              ))}
            </div>
          </div>
        )
      })}

      <div style={{ paddingTop: 4 }}>
        <span className="micro-label" style={{ display: 'block', marginBottom: 6 }}>This phone belongs to</span>
        <div className="grid grid-cols-2 gap-2">
          {['p1', 'p2'].map((key) => {
            const name = (team.members?.[key]?.name || '').trim() || (key === 'p1' ? 'Owner 1' : 'Owner 2')
            const active = whoami === key
            return (
              <button
                key={key}
                onClick={() => { setWhoami(key); toast.success(`This device is now ${name}'s`) }}
                style={{
                  padding: '11px 0', borderRadius: 12, fontSize: 13.5, fontWeight: 700, minHeight: 44,
                  background: active ? 'var(--teal)' : 'var(--surface2)',
                  color: active ? '#fff' : 'var(--text2)',
                  border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
                }}
              >
                {name}
              </button>
            )
          })}
        </div>
        <p className="text-3" style={{ fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
          Sets whose status you update from this phone and which quotes count as “mine.”
        </p>
      </div>
    </Section>
  )
}

function BusinessTab() {
  const { business, updateBusiness } = useApp()
  const toast = useToast()
  const fileRef = useRef(null)
  const b = (k) => (v) => updateBusiness({ [k]: v })

  const onLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => { updateBusiness({ logo: reader.result }); toast.success('Logo updated') }
    reader.readAsDataURL(file)
  }

  return (
    <>
      <TeamSection />
      <Section title="Company info">
        <TextRow label="Company name" value={business.companyName} onChange={b('companyName')} />
        <TextRow label="Owner name" value={business.ownerName} onChange={b('ownerName')} />
        <TextRow label="Phone" type="tel" value={business.phone} onChange={b('phone')} />
        <TextRow label="Email" type="email" value={business.email} onChange={b('email')} />
        <TextRow label="Website" value={business.website} onChange={b('website')} />
        <TextRow label="Tagline" value={business.tagline} onChange={b('tagline')} />
      </Section>
      <Section title="Logo">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 12, background: 'var(--surface2)', overflow: 'hidden' }}>
            {business.logo ? <img src={business.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 26 }}>🏔️</span>}
          </div>
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2" style={{ padding: '10px 14px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 14, fontWeight: 600 }}>
            <Upload size={16} /> Upload logo
          </button>
          {business.logo && <button onClick={() => updateBusiness({ logo: null })} className="text-3" style={{ fontSize: 13 }}>Remove</button>}
          <input ref={fileRef} type="file" accept="image/*" onChange={onLogo} style={{ display: 'none' }} />
        </div>
      </Section>
    </>
  )
}

function DisplayTab() {
  const { settings, updateSettings, resetSettings } = useApp()
  const { mode, setMode } = useDarkMode()
  const toast = useToast()

  return (
    <>
      <Section title="Theme">
        <div className="grid grid-cols-3 gap-2">
          {['light', 'dark', 'system'].map((m) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '12px 0', borderRadius: 12, textTransform: 'capitalize', fontSize: 13.5, fontWeight: 600, background: mode === m ? 'var(--teal)' : 'var(--surface2)', color: mode === m ? '#fff' : 'var(--text2)', border: `1px solid ${mode === m ? 'transparent' : 'var(--border)'}` }}>
              {m}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Accent color">
        <div className="flex gap-3 flex-wrap">
          {ACCENTS.map((a) => {
            const active = settings.accent === a.base
            return (
              <button key={a.name} onClick={() => updateSettings({ accent: a.base, accentLight: a.light })} className="flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${a.base}, ${a.light})`, border: active ? '2px solid var(--text)' : '2px solid transparent' }} aria-label={a.name}>
                {active && <Check size={18} color="#fff" />}
              </button>
            )
          })}
        </div>
      </Section>

      <Section title="Font size">
        <div className="grid grid-cols-3 gap-2">
          {[['normal', 'Normal'], ['large', 'Large'], ['xl', 'Extra Large']].map(([k, l]) => (
            <button key={k} onClick={() => updateSettings({ fontScale: k })} style={{ padding: '12px 0', borderRadius: 12, fontSize: 13.5, fontWeight: 600, background: settings.fontScale === k ? 'var(--teal)' : 'var(--surface2)', color: settings.fontScale === k ? '#fff' : 'var(--text2)', border: `1px solid ${settings.fontScale === k ? 'transparent' : 'var(--border)'}` }}>
              {l}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Preferences">
        <ToggleRow label="Compact mode" sub="Smaller item cards" checked={settings.compact} onChange={(v) => updateSettings({ compact: v })} />
        <ToggleRow label="Show internal cost panel" sub="Staff-only labor / margin breakdown" checked={settings.showInternal} onChange={(v) => updateSettings({ showInternal: v })} />
        <NumberRow label="Quote valid for" suffix="days" value={settings.validDays} onChange={(v) => updateSettings({ validDays: v })} />
      </Section>

      <button onClick={() => { resetSettings(); toast.info('Settings reset to defaults') }} className="flex items-center justify-center gap-2 w-full" style={{ padding: '12px', borderRadius: 12, color: 'var(--text2)', fontSize: 13.5, fontWeight: 600 }}>
        <RotateCcw size={15} /> Reset all settings
      </button>
    </>
  )
}

function ItemsTab() {
  const { library, categories, updateItem, toggleItem, deleteItem, addItem, addCategory, resetLibrary } = useApp()
  const toast = useToast()
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState({ name: '', category: categories[0], cy: 1, surcharge: 0, icon: '📦' })
  const [newCat, setNewCat] = useState('')

  const grouped = categories.map((cat) => ({ cat, items: library.filter((i) => i.category === cat) })).filter((g) => g.items.length)
  const orphan = library.filter((i) => !categories.includes(i.category))
  if (orphan.length) grouped.push({ cat: 'Other', items: orphan })

  return (
    <>
      <div className="flex gap-2" style={{ marginBottom: 14 }}>
        <button onClick={() => setAdding((v) => !v)} className="flex-1 flex items-center justify-center gap-2 shimmer-sweep" style={{ padding: '12px', borderRadius: 12, background: 'linear-gradient(135deg, var(--teal), var(--teal-lt))', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none' }}>
          <Plus size={17} /> Add custom item
        </button>
        <button onClick={() => { resetLibrary(); toast.info('Item library reset'); }} className="surface flex items-center justify-center" style={{ width: 46, borderRadius: 12, color: 'var(--text2)' }}>
          <RotateCcw size={17} />
        </button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
            <div className="surface" style={{ borderRadius: 16, padding: 16, marginBottom: 14 }}>
              <div className="grid grid-cols-4 gap-2" style={{ marginBottom: 10 }}>
                <input className="field" style={{ textAlign: 'center' }} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
                <input className="field col-span-3" placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 10 }}>
                <select className="field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input className="field" type="number" step={0.25} placeholder="CY" value={form.cy} onChange={(e) => setForm({ ...form, cy: Number(e.target.value) })} />
                  <input className="field" type="number" placeholder="Fee" value={form.surcharge} onChange={(e) => setForm({ ...form, surcharge: Number(e.target.value) })} />
                </div>
              </div>
              <button
                onClick={() => {
                  if (!form.name.trim()) { toast.warn('Name required'); return }
                  addItem({ ...form, surchargeLabel: form.surcharge ? `${form.name} fee` : undefined })
                  setForm({ name: '', category: categories[0], cy: 1, surcharge: 0, icon: '📦' })
                  setAdding(false)
                  toast.success('Item added')
                }}
                style={{ width: '100%', padding: '11px', borderRadius: 12, background: 'var(--teal)', color: '#fff', fontWeight: 700, fontSize: 14, border: 'none' }}
              >
                Save item
              </button>
              {/* custom category */}
              <div className="flex gap-2" style={{ marginTop: 10 }}>
                <input className="field" placeholder="New category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
                <button onClick={() => { if (newCat.trim()) { addCategory(newCat.trim()); setForm({ ...form, category: newCat.trim() }); setNewCat(''); toast.success('Category added') } }} className="surface" style={{ padding: '0 16px', borderRadius: 12, color: 'var(--teal-lt)', fontWeight: 600, fontSize: 13 }}>Add</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {grouped.map((g) => (
        <div key={g.cat} style={{ marginBottom: 16 }}>
          <div className="micro-label" style={{ marginBottom: 8, paddingLeft: 4 }}>{g.cat} · {g.items.length}</div>
          <div className="surface" style={{ borderRadius: 16, overflow: 'hidden' }}>
            {g.items.map((it, i) => (
              <div key={it.id} className="flex items-center gap-2.5" style={{ padding: '10px 12px', borderBottom: i < g.items.length - 1 ? '1px solid var(--border)' : 'none', opacity: it.hidden ? 0.5 : 1 }}>
                <span style={{ fontSize: 20 }}>{it.icon}</span>
                <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.name}</span>
                <input type="number" step={0.25} value={it.cy} onChange={(e) => updateItem(it.id, { cy: Number(e.target.value) })} className="field tabular" style={{ width: 56, padding: '6px', textAlign: 'center', fontSize: 12.5 }} title="Cubic yards" />
                <div className="flex items-center" style={{ background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span className="text-3" style={{ paddingLeft: 6, fontSize: 12 }}>$</span>
                  <input type="number" value={it.surcharge || 0} onChange={(e) => updateItem(it.id, { surcharge: Number(e.target.value) })} className="tabular" style={{ width: 42, background: 'transparent', border: 'none', color: 'var(--text)', textAlign: 'center', padding: '6px 2px', fontSize: 12.5, outline: 'none' }} title="Surcharge" />
                </div>
                <button onClick={() => toggleItem(it.id)} style={{ color: 'var(--text3)' }} title={it.hidden ? 'Show' : 'Hide'}>
                  {it.hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => { deleteItem(it.id); toast.info('Item deleted') }} style={{ color: '#f08a7e' }} title="Delete"><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

function BackupCard() {
  const toast = useToast()
  const fileRef = useRef(null)

  const exportBackup = () => {
    const data = {}
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('ejs.') && k !== 'ejs.supabase.auth') {
        try { data[k] = JSON.parse(localStorage.getItem(k)) } catch { data[k] = localStorage.getItem(k) }
      }
    }
    const payload = { app: 'elite-junk-solutions', version: 1, exportedAt: new Date().toISOString(), data }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ejs-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup downloaded')
  }

  const importBackup = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result)
        const data = parsed?.data || parsed
        if (!data || typeof data !== 'object') throw new Error('bad')
        let n = 0
        Object.entries(data).forEach(([k, v]) => {
          if (k.startsWith('ejs.') && k !== 'ejs.supabase.auth') {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
            n++
          }
        })
        if (!n) throw new Error('empty')
        toast.success('Backup restored — reloading…')
        setTimeout(() => window.location.reload(), 900)
      } catch {
        toast.warn('That doesn’t look like a valid backup file')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="surface" style={{ borderRadius: 18, padding: 16, marginTop: 14 }}>
      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        <div className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(212,160,23,0.14)', color: 'var(--gold)' }}>
          <ShieldCheck size={22} />
        </div>
        <div>
          <div className="font-display" style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>Backup &amp; restore</div>
          <div className="text-2" style={{ fontSize: 12.5 }}>A safety copy of every quote, customer &amp; setting.</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={exportBackup} className="flex items-center justify-center gap-2" style={{ padding: '12px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>
          <Download size={16} /> Download
        </button>
        <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2" style={{ padding: '12px', borderRadius: 12, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, fontSize: 14 }}>
          <Upload size={16} /> Restore
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={importBackup} style={{ display: 'none' }} />
      </div>
      <p className="text-3" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>
        Tip: download a backup now and again (e.g. to your Files or email) so you’re covered even if you ever lose access to your account.
      </p>
    </div>
  )
}
