import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Mic } from 'lucide-react'
import { useApp } from '../store'
import { useToast } from './Toast'
import { useHaptic } from '../hooks/useHaptic'

/**
 * Job notes with hold-to-talk voice capture (Web Speech API — on-device,
 * no key). Transcripts append as timestamped lines; the whole field stays
 * hand-editable and is searchable from the dashboard.
 */
export default function JobNotes({ quote }) {
  const app = useApp()
  const toast = useToast()
  const haptic = useHaptic()
  const [notes, setNotes] = useState(quote.notes || '')
  const [listening, setListening] = useState(false)
  const recogRef = useRef(null)
  const notesRef = useRef(notes)
  notesRef.current = notes

  useEffect(() => setNotes(quote.notes || ''), [quote.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => recogRef.current?.abort?.(), [])

  const save = (text) => {
    if (text !== (quote.notes || '')) app.saveQuote({ ...quote, notes: text })
  }

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { toast.info('Voice notes aren’t supported on this device'); return }
    if (recogRef.current) return
    const r = new SR()
    r.lang = 'en-US'
    r.continuous = true
    r.interimResults = false
    r.onresult = (e) => {
      const transcript = [...e.results].map((res) => res[0].transcript).join(' ').trim()
      if (!transcript) return
      const stamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const line = `🎙️ ${stamp}: ${transcript}`
      const next = notesRef.current ? `${notesRef.current}\n${line}` : line
      setNotes(next)
      save(next)
      toast.success('Note added')
    }
    r.onend = () => { setListening(false); recogRef.current = null }
    r.onerror = () => { setListening(false); recogRef.current = null }
    recogRef.current = r
    setListening(true)
    haptic.medium()
    r.start()
  }

  const stopVoice = () => {
    recogRef.current?.stop?.()
  }

  return (
    <div className="surface" style={{ borderRadius: 16, padding: 14, marginTop: 12 }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <span className="micro-label">Job notes</span>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onPointerDown={(e) => { e.preventDefault(); startVoice() }}
          onPointerUp={stopVoice}
          onPointerLeave={() => listening && stopVoice()}
          onContextMenu={(e) => e.preventDefault()}
          className="flex items-center gap-2"
          style={{
            padding: '9px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 700, minHeight: 44, minWidth: 44,
            background: listening ? 'var(--ember)' : 'var(--surface2)',
            color: listening ? '#fff' : 'var(--teal-lt)',
            border: `1px solid ${listening ? 'var(--ember)' : 'var(--border)'}`,
            touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none',
          }}
          aria-label="Hold to record a voice note"
        >
          <motion.span animate={listening ? { scale: [1, 1.25, 1] } : {}} transition={{ repeat: Infinity, duration: 0.9 }}>
            <Mic size={15} />
          </motion.span>
          {listening ? 'Listening… release to save' : 'Hold to talk'}
        </motion.button>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={() => save(notes)}
        placeholder="Gate code, where to park, extra couch in the back…"
        rows={notes ? Math.min(6, notes.split('\n').length + 1) : 2}
        className="field"
        style={{ resize: 'vertical', lineHeight: 1.5, fontSize: 14 }}
      />
    </div>
  )
}
