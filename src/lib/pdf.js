import jsPDF from 'jspdf'
import { formatCY } from './utils'
import { tierPrices } from './pricing'

const NAVY = [15, 32, 51]
const NAVY_DEEP = [7, 16, 30]
const TEAL = [42, 127, 138]
const TEAL_LT = [91, 181, 196]
const SNOW = [232, 244, 245]
const INK = [20, 32, 46]
const MUTE = [110, 128, 148]
const LINE = [216, 224, 232]

/* draw a small vector mountain-badge logo at (x,y) with width w */
function drawBadge(doc, x, y, w) {
  const h = w * 1.12
  // shield
  doc.setFillColor(...NAVY_DEEP)
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(w * 0.035)
  // approximate shield with a rounded rect + triangle bottom
  doc.roundedRect(x, y, w, h * 0.62, w * 0.08, w * 0.08, 'FD')
  doc.triangle(x, y + h * 0.5, x + w, y + h * 0.5, x + w / 2, y + h, 'FD')
  // peaks
  doc.setFillColor(...TEAL)
  doc.triangle(x + w * 0.1, y + h * 0.55, x + w * 0.42, y + h * 0.2, x + w * 0.5, y + h * 0.55, 'F')
  doc.setFillColor(...TEAL_LT)
  doc.triangle(x + w * 0.42, y + h * 0.55, x + w * 0.7, y + h * 0.16, x + w * 0.95, y + h * 0.55, 'F')
  // snow cap
  doc.setFillColor(...SNOW)
  doc.triangle(x + w * 0.62, y + h * 0.3, x + w * 0.7, y + h * 0.16, x + w * 0.78, y + h * 0.3, 'F')
  // banner
  doc.setFillColor(...NAVY)
  doc.roundedRect(x + w * 0.12, y + h * 0.56, w * 0.76, h * 0.16, 1, 1, 'F')
}

export function buildQuotePdf(quote, business = {}, settings = {}) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 40
  let y = M

  const company = business.companyName || 'Elite Junk Solutions'
  const phone = business.phone || ''
  const email = business.email || ''
  const website = business.website || ''
  const validDays = settings.validDays || 7

  // ---------- Header ----------
  drawBadge(doc, M, y, 46)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text(company, M + 60, y + 22)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...TEAL)
  doc.text('We show up. We haul it. We’re done.', M + 60, y + 38)

  // right-aligned contact
  doc.setTextColor(...MUTE)
  doc.setFontSize(9)
  const contact = [phone, email, website].filter(Boolean)
  contact.forEach((line, i) => {
    doc.text(line, W - M, y + 12 + i * 13, { align: 'right' })
  })

  y += 70

  // ---------- Quote meta ----------
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(`Quote ${quote.id}`, M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTE)
  const dateStr = new Date(quote.createdAt || Date.now()).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  doc.text(`Date: ${dateStr}`, W - M, y - 8, { align: 'right' })
  doc.text(`Valid for ${validDays} days`, W - M, y + 5, { align: 'right' })

  y += 14
  // teal divider
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(1.5)
  doc.line(M, y, W - M, y)
  y += 24

  // ---------- Prepared for ----------
  const c = quote.customer || {}
  doc.setTextColor(...MUTE)
  doc.setFontSize(8)
  doc.text('PREPARED FOR', M, y)
  y += 14
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(`${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Customer', M, y)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTE)
  const cust = [c.address, [c.phone, c.email].filter(Boolean).join('  •  ')].filter(Boolean)
  cust.forEach((line, i) => {
    doc.text(String(line), M, y + 14 + i * 12)
  })
  y += 14 + cust.length * 12 + 18

  // ---------- Items table (no prices shown to customer) ----------
  doc.setFillColor(...NAVY)
  doc.rect(M, y, W - 2 * M, 22, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('ITEM', M + 12, y + 15)
  doc.text('QTY', W - M - 40, y + 15)
  y += 22

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...INK)
  doc.setFontSize(10)
  ;(quote.items || []).forEach((it, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(245, 248, 250)
      doc.rect(M, y, W - 2 * M, 20, 'F')
    }
    doc.setTextColor(...INK)
    doc.text(String(it.name), M + 12, y + 14)
    doc.text(`${it.qty}`, W - M - 36, y + 14)
    y += 20
  })

  // ---------- Volume summary ----------
  y += 10
  const cap = settings.TRAILER_CY || 12
  const cy = quote.pricing?.totalCY || 0
  const pct = Math.round(Math.min((cy / cap) * 100, 100))
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.8)
  doc.line(M, y, W - M, y)
  y += 18
  doc.setTextColor(...TEAL)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(`About ${trailerWords(pct)} — roughly ${pct}% of a trailer load`, M, y)
  y += 15
  doc.setTextColor(...MUTE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.text(`(Approximately ${formatCY(cy)} cubic yards of space.)`, M, y)
  y += 22

  // ---------- Pricing ----------
  const p = quote.pricing || {}
  const hitMinimum = (quote.pricing?.totalCY || 0) * (settings.RATE_PER_CY || 50) < (settings.MIN_JOB || 89)
  const rightX = W - M
  const labelX = W - M - 200
  const drawLine = (label, val, opts = {}) => {
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
    doc.setTextColor(...(opts.color || (opts.bold ? INK : MUTE)))
    doc.setFontSize(opts.size || 10)
    doc.text(label, labelX, y, { align: 'left' })
    doc.text(val, rightX, y, { align: 'right' })
    y += opts.gap || 18
  }
  drawLine('Base removal', money(p.base))
  if (hitMinimum) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTE)
    doc.text('Our minimum service charge applies to small loads.', labelX, y - 6)
    y += 6
  }
  ;(quote.items || [])
    .filter((it) => it.surcharge)
    .forEach((it) => {
      drawLine(`${it.surchargeLabel || 'Special item fee'}${it.qty > 1 ? ` ×${it.qty}` : ''}`, money(it.surcharge * it.qty))
    })
  ;(quote.additionalCharges || [])
    .filter((ch) => !ch._tier) // package upgrades render as tier columns below
    .forEach((ch) => drawLine(ch.label || 'Additional', money(ch.amount)))
  if (p.discount) drawLine('Discount', money(p.discount), { color: [30, 126, 52] })

  y += 4
  doc.setDrawColor(...TEAL)
  doc.setLineWidth(1.2)
  doc.line(labelX, y, rightX, y)
  y += 22

  if (quote.tiered) {
    // ---------- Good / Better / Best columns ----------
    const upgrade = (quote.additionalCharges || []).find((c) => c._tier)
    const baseTotal = (p.total || 0) - (upgrade ? Number(upgrade.amount) || 0 : 0)
    const tiers = tierPrices(baseTotal)
    const chosen = quote.tierChoice || 'basic'
    const gap = 10
    const colW = (W - 2 * M - gap * 2) / 3
    const colH = 72
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...MUTE)
    doc.text('CHOOSE YOUR PACKAGE', M, y - 6)
    tiers.forEach((t, i) => {
      const x = M + i * (colW + gap)
      const active = t.key === chosen
      if (active) {
        doc.setFillColor(...TEAL)
        doc.roundedRect(x, y, colW, colH, 5, 5, 'F')
      } else {
        doc.setDrawColor(...LINE)
        doc.setLineWidth(1)
        doc.roundedRect(x, y, colW, colH, 5, 5, 'D')
      }
      doc.setTextColor(...(active ? [255, 255, 255] : INK))
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.text(t.label, x + colW / 2, y + 16, { align: 'center' })
      doc.setFontSize(15)
      doc.text(money(t.price), x + colW / 2, y + 34, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...(active ? [220, 240, 244] : MUTE))
      const descLines = doc.splitTextToSize(t.desc, colW - 12)
      doc.text(descLines, x + colW / 2, y + 46, { align: 'center' })
    })
    y += colH + 24
  } else {
    doc.setFillColor(...TEAL)
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.roundedRect(labelX - 12, y - 16, rightX - labelX + 12, 30, 4, 4, 'F')
    doc.text('TOTAL', labelX, y + 4)
    doc.text(money(p.total), rightX - 6, y + 4, { align: 'right' })
    y += 40
  }

  // ---------- Photos (before / after, only ones with local image data) ----------
  const allPhotos = (quote.photos || [])
    .map((p) => (typeof p === 'string' ? { kind: 'before', data: p } : p))
    .filter((p) => p?.data)
  const photoGroups = [
    { label: 'BEFORE', list: allPhotos.filter((p) => p.kind !== 'after').slice(0, 6) },
    { label: 'AFTER', list: allPhotos.filter((p) => p.kind === 'after').slice(0, 6) },
  ].filter((g) => g.list.length)

  for (const group of photoGroups) {
    const cols = 3
    const gap = 8
    const cw = (W - 2 * M - gap * (cols - 1)) / cols
    const ch = cw * 0.72
    const blockH = 14 + Math.ceil(group.list.length / cols) * (ch + gap)
    const footerTop = doc.internal.pageSize.getHeight() - 70
    if (y + blockH > footerTop) { doc.addPage(); y = M }
    doc.setTextColor(...MUTE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(`${group.label} PHOTOS`, M, y)
    y += 10
    group.list.forEach((p, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const cellX = M + col * (cw + gap)
      const cellY = y + row * (ch + gap)
      try {
        // Fit within the cell preserving the photo's real aspect ratio (no stretching).
        const props = doc.getImageProperties(p.data)
        const ar = props.width / props.height
        let w = cw
        let h = cw / ar
        if (h > ch) { h = ch; w = ch * ar }
        const ox = cellX + (cw - w) / 2
        const oy = cellY + (ch - h) / 2
        doc.addImage(p.data, 'JPEG', ox, oy, w, h)
        if (p.ts) {
          doc.setFontSize(6)
          doc.setTextColor(...MUTE)
          const stamp = new Date(p.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
          doc.text(`${stamp}${p.gps ? `  ·  ${p.gps.lat}, ${p.gps.lng}` : ''}`, ox, oy + h + 7)
        }
      } catch { /* skip bad image */ }
    })
    y += Math.ceil(group.list.length / cols) * (ch + gap) + 6
  }

  // ---------- Footer ----------
  const fy = doc.internal.pageSize.getHeight() - 54
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.8)
  doc.line(M, fy, W - M, fy)
  doc.setTextColor(...TEAL)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('We show up. We haul it. We’re done.', M, fy + 18)
  doc.setTextColor(...MUTE)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text([company, ...contact].join('  •  '), M, fy + 32)

  return doc
}

function money(n) {
  const v = Number.isFinite(n) ? n : 0
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

// Plain-English trailer fullness for a homeowner reading the quote.
function trailerWords(pct) {
  if (pct <= 0) return 'an empty trailer'
  if (pct < 18) return 'a small load'
  if (pct < 38) return 'a quarter of a trailer'
  if (pct < 60) return 'half a trailer'
  if (pct < 85) return 'three-quarters of a trailer'
  if (pct < 100) return 'a nearly full trailer'
  return 'a full trailer'
}

export function downloadQuotePdf(quote, business, settings) {
  const doc = buildQuotePdf(quote, business, settings)
  doc.save(`${quote.id || 'quote'}.pdf`)
}

export async function shareQuotePdf(quote, business, settings) {
  const doc = buildQuotePdf(quote, business, settings)
  const blob = doc.output('blob')
  const file = new File([blob], `${quote.id || 'quote'}.pdf`, { type: 'application/pdf' })
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Quote ${quote.id}`,
        text: `Your quote from ${business.companyName || 'Elite Junk Solutions'}`,
      })
      return 'shared'
    } catch {
      // fall through to download
    }
  }
  doc.save(`${quote.id || 'quote'}.pdf`)
  return 'downloaded'
}
