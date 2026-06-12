import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, MousePointerClick } from 'lucide-react'
import ScrollExpandMedia from '@/components/blocks/scroll-expansion-hero'
import { BorderBeam } from '@/components/ui/BorderBeam'
import EJSLogo from '@/components/EJSLogo'
import heroBg from '@/assets/mountains-hero.jpg'
import heroPortrait from '@/assets/mountains-portrait.jpg'

/**
 * One-time cinematic intro. Scroll / swipe expands the mountain, then a
 * BorderBeam "Enter" CTA appears to hand off into the app.
 */
export default function Intro({ onEnter }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--bg)' }}>
      <ScrollExpandMedia
        mediaType="image"
        mediaSrc={heroPortrait}
        bgImageSrc={heroBg}
        title="Elite Junk Solutions"
        date="Field Quote Studio"
        scrollToExpand="Scroll to begin"
        textBlend
        onExpandedChange={setExpanded}
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center text-center">
          <EJSLogo size={64} />
          <h2 style={{ fontSize: 30, fontWeight: 800, color: 'var(--text)', marginTop: 18, lineHeight: 1.05 }}>
            Quotes that close on the spot.
          </h2>
          <p className="text-2" style={{ fontSize: 16, lineHeight: 1.55, marginTop: 12, maxWidth: 460 }}>
            A cinematic, itemized junk-removal quote built in under 30 seconds — right in
            the customer’s garage, on your phone.
          </p>
        </div>
      </ScrollExpandMedia>

      {/* Fixed CTA that appears once the mountain is fully expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 'calc(env(safe-area-inset-bottom) + 28px)',
              zIndex: 60,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
              padding: '0 20px',
            }}
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onEnter}
              className="relative overflow-hidden"
              style={{
                pointerEvents: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: 'linear-gradient(135deg, var(--teal) 0%, var(--teal-lt) 100%)',
                color: '#fff',
                fontWeight: 800,
                fontSize: 17,
                padding: '16px 30px',
                borderRadius: 18,
                border: 'none',
                boxShadow: '0 12px 36px rgba(42,127,138,0.45)',
              }}
            >
              Enter the studio <ArrowRight size={19} />
              <BorderBeam size={120} duration={6} borderWidth={2} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hint while not yet expanded */}
      <AnimatePresence>
        {!expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.85, y: [0, 6, 0] }}
            exit={{ opacity: 0 }}
            transition={{ y: { repeat: Infinity, duration: 1.6 }, opacity: { duration: 0.6 } }}
            style={{
              position: 'fixed',
              left: 0,
              right: 0,
              bottom: 'calc(env(safe-area-inset-bottom) + 22px)',
              zIndex: 50,
              display: 'flex',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <span className="glass" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 16px', borderRadius: 999, color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
              <MousePointerClick size={15} color="var(--teal-lt)" /> Scroll or swipe up to reveal
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
