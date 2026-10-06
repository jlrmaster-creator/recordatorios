const pad = (n) => String(n).padStart(2, '0')

function toICSDateTime(dt) {
  if (!dt) return null
  let d
  try {
    d = dt?.toDate?.() || new Date(dt)
  } catch { d = new Date(dt) }
  if (isNaN(d.getTime())) return null
  const y = d.getUTCFullYear()
  const m = pad(d.getUTCMonth() + 1)
  const day = pad(d.getUTCDate())
  const h = pad(d.getUTCHours())
  const min = pad(d.getUTCMinutes())
  const s = pad(d.getUTCSeconds())
  return `${y}${m}${day}T${h}${min}${s}Z`
}

function toUID(r, idx = '') {
  const base = r.id || `${r.title}-${Date.now()}${idx}`
  return `${base.replace(/[^A-Za-z0-9]/g, '')}@recordatorios.app`
}

function escapeICS(text = '') {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

export function exportRemindersToICS(reminders = [], filename = 'recordatorios.ics') {
  const now = toICSDateTime(new Date())
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Recordatorios App//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ]

  reminders.forEach((r, i) => {
    const start = toICSDateTime(r.dateTime)
    if (!start) return
    const end = start
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${toUID(r, i)}`)
    if (now) lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART:${start}`)
    lines.push(`DTEND:${end}`)
    if (r.title) lines.push(`SUMMARY:${escapeICS(r.title)}`)
    const descParts = []
    if (r.description) descParts.push(r.description)
    if (r.isShared) descParts.push(`Compartido por: ${r.sharedFromName || 'Contacto'}`)
    if (r.category) descParts.push(`Categoría: ${r.category}`)
    if (r.importance) descParts.push(`Importancia: ${r.importance}`)
    if (r.isPermanent) descParts.push('Permanente: Sí')
    if (r.isCompleted) descParts.push('Completado: Sí')
    if (descParts.length) lines.push(`DESCRIPTION:${escapeICS(descParts.join('\\n'))}`)
    lines.push('STATUS:CONFIRMED')
    lines.push('TRANSP:OPAQUE')
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}