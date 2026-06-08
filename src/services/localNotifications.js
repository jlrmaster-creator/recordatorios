/**
 * localNotifications.js
 * Sistema de notificaciones locales del navegador.
 * Programa timers para cada recordatorio y muestra notificaciones
 * nativas cuando llega la hora (5 min antes + hora exacta).
 * Incluye un checker periódico como fallback por si los timers
 * se pierden (tabs en background, throttling, etc).
 */

const activeTimers = new Map() // reminderId -> { pre?, exact? }
let checkerInterval = null
let lastReminders = []

import toast from 'react-hot-toast'

// ── Permiso ────────────────────────────────────────────────
export async function requestPermission() {
  if (!('Notification' in window)) return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  return Notification.requestPermission()
}

// ── Mostrar notificación ───────────────────────────────────
async function showNotification(reminder, subtitle) {
  const permission = Notification.permission

  const title = `${subtitle} — ${reminder.title || 'Recordatorio'}`
  const body = reminder.description || reminder.title || ''
  
  // Siempre mostrar un toast in-app como fallback/complemento visual
  toast(`${title}\n${body}`, {
    icon: '🔔',
    duration: 6000,
  })

  if (permission !== 'granted') return

  const options = {
    body,
    icon: '/recordatorios/icon-192x192.png',
    badge: '/recordatorios/icon-192x192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag: `reminder-local-${reminder.id}-${subtitle}`,
    data: { clickAction: '/recordatorios/' }
  }

  // Preferir ServiceWorker (siempre en móviles, es obligatorio en Chrome Android)
  try {
    if ('serviceWorker' in navigator) {
      // Esperar al SW pero con timeout de 1 segundo para no colgarse en Dev mode
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise(resolve => setTimeout(() => resolve(null), 1000))
      ])
      
      if (registration) {
        await registration.showNotification(title, options)
        return
      }
    }
  } catch (e) {
    console.warn('SW showNotification falló:', e)
  }

  // Fallback: Notification API directa (Ojo: lanza error en Android Chrome)
  try {
    new Notification(title, { body: options.body, icon: options.icon, tag: options.tag })
  } catch (e) {
    console.warn('Notification API directa falló (normal en móviles):', e)
  }
}

// ── Obtener timestamp de un reminder ───────────────────────
function getReminderTime(reminder) {
  if (!reminder.dateTime) return null
  try {
    let dt
    if (typeof reminder.dateTime.toDate === 'function') {
      dt = reminder.dateTime.toDate()
    } else if (reminder.dateTime.seconds) {
      dt = new Date(reminder.dateTime.seconds * 1000)
    } else {
      dt = new Date(reminder.dateTime)
    }
    return isNaN(dt.getTime()) ? null : dt.getTime()
  } catch (e) {
    return null
  }
}

// ── Programar timers para todos los reminders ──────────────
export function scheduleAll(reminders) {
  lastReminders = reminders
  clearAllTimers()

  const now = Date.now()
  const FIVE_MIN = 5 * 60 * 1000

  for (const reminder of reminders) {
    const targetTime = getReminderTime(reminder)
    if (!targetTime) continue

    // Solo programar recordatorios futuros (o de los próximos segundos)
    if (targetTime < now - 60000) continue

    const timers = {}
    const fiveMinBefore = targetTime - FIVE_MIN

    // Timer: 5 minutos antes
    if (fiveMinBefore > now) {
      timers.pre = setTimeout(() => {
        showNotification(reminder, '⏰ En 5 minutos')
      }, fiveMinBefore - now)
    }

    // Timer: hora exacta
    if (targetTime > now) {
      timers.exact = setTimeout(() => {
        showNotification(reminder, '🔔 ¡Ahora!')
      }, targetTime - now)
    }

    if (timers.pre !== undefined || timers.exact !== undefined) {
      activeTimers.set(reminder.id, timers)
    }
  }
}

// ── Limpiar timers ─────────────────────────────────────────
export function clearAllTimers() {
  for (const [, timers] of activeTimers) {
    if (timers.pre !== undefined) clearTimeout(timers.pre)
    if (timers.exact !== undefined) clearTimeout(timers.exact)
  }
  activeTimers.clear()
}

export function clearTimerFor(reminderId) {
  const timers = activeTimers.get(reminderId)
  if (timers) {
    if (timers.pre !== undefined) clearTimeout(timers.pre)
    if (timers.exact !== undefined) clearTimeout(timers.exact)
    activeTimers.delete(reminderId)
  }
}

// ── Checker periódico (fallback) ───────────────────────────
// Cada 30 segundos revisa si algún recordatorio está en la
// ventana de ±30 seg de su hora programada y no fue notificado.
const notified = new Set()

function periodicCheck() {
  const now = Date.now()
  const WINDOW = 30 * 1000 // ±30 seg

  for (const reminder of lastReminders) {
    const targetTime = getReminderTime(reminder)
    if (!targetTime) continue

    const exactKey = `exact-${reminder.id}`
    const preKey = `pre-${reminder.id}`

    // Notificación en hora exacta
    if (!notified.has(exactKey) && Math.abs(now - targetTime) < WINDOW) {
      notified.add(exactKey)
      showNotification(reminder, '🔔 ¡Ahora!')
    }

    // Notificación 5 min antes
    const fiveMinBefore = targetTime - 5 * 60 * 1000
    if (!notified.has(preKey) && Math.abs(now - fiveMinBefore) < WINDOW) {
      notified.add(preKey)
      showNotification(reminder, '⏰ En 5 minutos')
    }
  }

  // Limpiar notificaciones muy antiguas del set (>1h) para no acumular memoria
  // Lo hacemos cada ~100 checks
  if (Math.random() < 0.01) {
    notified.clear()
  }
}

// ── Iniciar / detener el checker ───────────────────────────
export function startChecker() {
  if (checkerInterval) return
  checkerInterval = setInterval(periodicCheck, 30000)
}

export function stopChecker() {
  if (checkerInterval) {
    clearInterval(checkerInterval)
    checkerInterval = null
  }
}

// ── Recalcular al volver a la pestaña ──────────────────────
export function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && lastReminders.length > 0) {
    scheduleAll(lastReminders)
  }
}

// ── Inicializar todo ───────────────────────────────────────
export function init(reminders) {
  scheduleAll(reminders)
  startChecker()

  // Recalcular timers cuando el usuario vuelve a la pestaña
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  document.addEventListener('visibilitychange', handleVisibilityChange)
}

// ── Limpiar todo ───────────────────────────────────────────
export function cleanup() {
  clearAllTimers()
  stopChecker()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  notified.clear()
  lastReminders = []
}
