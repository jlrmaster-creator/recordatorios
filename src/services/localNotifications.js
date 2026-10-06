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

// ── Obtener el registro del SW de forma robusta ────────────
// getRegistration() es inmediato si el SW ya existe (lo normal
// al arrancar); si no, esperamos a "ready" con timeout más largo.
async function getSWRegistration() {
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    if (reg && reg.active) return reg
  } catch (e) { /* ignorar */ }
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise(resolve => setTimeout(() => resolve(null), 3000))
  ])
}

// ── Mostrar notificación ───────────────────────────────────
async function showNotification(reminder, subtitle) {
  const permission = Notification.permission

  // El título del recordatorio primero para identificarlo de un vistazo;
  // el tipo de aviso (5 min / ahora) va después.
  const title = `${reminder.title || 'Recordatorio'} — ${subtitle}`
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
      const registration = await getSWRegistration()
      if (registration) {
        await registration.showNotification(title, options)
        return
      }
    }
  } catch (e) {
    console.warn('SW showNotification falló:', e)
  }

  // Fallback: Notification API directa (Ojo: lanza error en Android Chrome).
  // requireInteraction es imprescindible: sin él Chrome lo cierra solo a los ~8-20 s.
  try {
    new Notification(title, {
      body: options.body,
      icon: options.icon,
      badge: options.badge,
      vibrate: options.vibrate,
      requireInteraction: true,
      tag: options.tag
    })
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

// Mapa clave -> timestamp para recordar qué notificaciones ya han
// saltado y no repetirlas. Nunca se limpia "a ciegas": solo se
// olvidan entradas de más de 2 horas (fuera de toda ventana útil).
const notified = new Map()
let isAppInitialized = false

function wasNotified(key) {
  const ts = notified.get(key)
  if (ts === undefined) return false
  if (Date.now() - ts > 2 * 60 * 60 * 1000) {
    notified.delete(key)
    return false
  }
  return true
}

function markNotified(key) {
  notified.set(key, Date.now())
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

    // Si está pospuesto (snooze) y aún no ha vencido, no notificar
    const snoozeTs = reminder.snoozeUntil ? new Date(reminder.snoozeUntil).getTime() : 0
    if (snoozeTs && snoozeTs > now) continue

    const exactKey = `exact-${reminder.id}`
    const preKey = `pre-${reminder.id}`

    // Si ya pasó hace más de 15 minutos, lo ignoramos por completo
    if (targetTime < now - 15 * 60 * 1000) continue

    const timers = {}
    const fiveMinBefore = targetTime - FIVE_MIN

    // ── Lógica de 5 minutos antes ──
    if (fiveMinBefore > now) {
      timers.pre = setTimeout(() => {
        markNotified(preKey)
        showNotification(reminder, '⏰ En 5 minutos')
      }, fiveMinBefore - now)
    } else if (fiveMinBefore > now - 5 * 60 * 1000 && isAppInitialized) {
      // Si venció hace poco mientras el móvil dormía
      if (!wasNotified(preKey)) {
        markNotified(preKey)
        showNotification(reminder, '⏰ En 5 minutos')
      }
    }

    // ── Lógica de Hora Exacta ──
    if (targetTime > now) {
      timers.exact = setTimeout(() => {
        markNotified(exactKey)
        showNotification(reminder, '🔔 ¡Ahora!')
      }, targetTime - now)
    } else if (targetTime > now - 15 * 60 * 1000 && isAppInitialized) {
      // Si venció hace poco mientras el móvil dormía
      if (!wasNotified(exactKey)) {
        markNotified(exactKey)
        showNotification(reminder, '🔔 ¡Vencido recientemente!')
      }
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

function periodicCheck() {
  const now = Date.now()
  const WINDOW = 30 * 1000 // ±30 seg

  for (const reminder of lastReminders) {
    const targetTime = getReminderTime(reminder)
    if (!targetTime) continue

    // Si está pospuesto (snooze) y aún no ha vencido, no notificar
    const snoozeTs = reminder.snoozeUntil ? new Date(reminder.snoozeUntil).getTime() : 0
    if (snoozeTs && snoozeTs > now) continue

    const exactKey = `exact-${reminder.id}`
    const preKey = `pre-${reminder.id}`

    // Notificación en hora exacta
    if (!wasNotified(exactKey) && Math.abs(now - targetTime) < WINDOW) {
      markNotified(exactKey)
      showNotification(reminder, '🔔 ¡Ahora!')
    }

    // Notificación 5 min antes
    const fiveMinBefore = targetTime - 5 * 60 * 1000
    if (!wasNotified(preKey) && Math.abs(now - fiveMinBefore) < WINDOW) {
      markNotified(preKey)
      showNotification(reminder, '⏰ En 5 minutos')
    }
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
  // Marcar inicializado ANTES de programar para que el primer
  // scheduleAll pueda avisar de vencimientos recientes al arrancar
  isAppInitialized = true
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
  // No limpiamos `notified`: se borra en cada cambio de reminders y
  // hacía que la misma notificación se re-mostrara y "reiniciara"
  // la notificación existente en bandeja. Los entries caducan solos
  // a las 2 h dentro de wasNotified().
  lastReminders = []
}
