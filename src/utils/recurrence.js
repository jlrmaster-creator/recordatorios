import { addDays, addWeeks, addMonths, addYears, getDay } from 'date-fns'

export function nextRecurrenceDate(baseDate, recurrence) {
  if (!baseDate || !recurrence) return null
  let d = new Date(baseDate)
  const { type = 'daily', interval = 1, daysOfWeek = [] } = recurrence

  switch (type) {
    case 'daily':
      return addDays(d, Math.max(1, interval))
    case 'weekly': {
      if (Array.isArray(daysOfWeek) && daysOfWeek.length > 0) {
        let nd = addDays(d, 1)
        for (let i = 0; i < 21; i++) {
          const gd = getDay(nd)
          if (daysOfWeek.includes(gd)) return nd
          nd = addDays(nd, 1)
        }
        return addWeeks(d, Math.max(1, interval))
      }
      return addWeeks(d, Math.max(1, interval))
    }
    case 'monthly':
      return addMonths(d, Math.max(1, interval))
    case 'yearly':
      return addYears(d, Math.max(1, interval))
    default:
      return addDays(d, Math.max(1, interval))
  }
}

export function isRecurrenceActive(recurrence) {
  if (!recurrence) return false
  const now = Date.now()
  if (recurrence.endDate) {
    let ed
    try { ed = recurrence.endDate?.toDate?.() || new Date(recurrence.endDate) } catch { ed = new Date(recurrence.endDate) }
    if (!isNaN(ed.getTime()) && ed.getTime() < now) return false
  }
  if (typeof recurrence.count === 'number' && recurrence.count <= 0) return false
  return true
}