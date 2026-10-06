import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  getDoc
} from 'firebase/firestore'
import { db } from './firebase'
import { nextRecurrenceDate, isRecurrenceActive } from '../utils/recurrence'

// ── CREATE ──────────────────────────────────────────────
export const createReminder = async (userId, data) => {
  const ref = await addDoc(collection(db, 'reminders'), {
    ...data,
    ownerId: userId,
    isShared: false,
    sharedFrom: null,
    status: 'own',
    isCompleted: false,
    completedAt: null,
    snoozeUntil: null,
    recurrence: data.recurrence || null,
    seriesId: data.seriesId || null,
    tasks: data.tasks || [],
    archived: data.archived || false,
    isFavorite: data.isFavorite || false,
    tags: data.tags || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return ref.id
}

// ── READ (real-time) ─────────────────────────────────────
export const subscribeToMyReminders = (userId, callback) => {
  const q = query(
    collection(db, 'reminders'),
    where('ownerId', '==', userId),
    orderBy('dateTime', 'asc')
  )
  return onSnapshot(q, (snap) => {
    const reminders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(reminders)
  }, console.error)
}

// Escuchar los recordatorios que el usuario ha compartido con otros (para ver el estado)
export const subscribeToMySentShares = (userId, callback) => {
  const q = query(
    collection(db, 'sharedReminders'),
    where('fromUserId', '==', userId)
  )
  return onSnapshot(q, snap => {
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(data)
  }, console.error)
}

// Pending shared reminders (not yet accepted)
export const subscribeToPendingShared = (userId, callback) => {
  const q = query(
    collection(db, 'sharedReminders'),
    where('toUserId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, (snap) => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(items)
  }, console.error)
}

// ── UPDATE ───────────────────────────────────────────────
export const updateReminder = async (reminderId, data) => {
  await updateDoc(doc(db, 'reminders', reminderId), {
    ...data,
    updatedAt: serverTimestamp()
  })
}

// ── COMPLETE ─────────────────────────────────────────────
export const markCompleted = async (reminderId, completed = true) => {
  await updateDoc(doc(db, 'reminders', reminderId), {
    isCompleted: completed,
    completedAt: completed ? serverTimestamp() : null,
    updatedAt: serverTimestamp()
  })
}

export const completeReminderWithRecurrence = async (reminderId) => {
  const snap = await getDoc(doc(db, 'reminders', reminderId))
  if (!snap.exists()) return
  const r = snap.data()

  await updateDoc(doc(db, 'reminders', reminderId), {
    isCompleted: true,
    completedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  if (r.recurrence && !r.isShared) {
    if (isRecurrenceActive(r.recurrence)) {
      const base = r.dateTime
      const nd = nextRecurrenceDate(base, r.recurrence)
      if (!nd) return
      const newSeriesId = r.seriesId || reminderId
      let newRec = { ...r.recurrence }
      if (typeof newRec.count === 'number' && newRec.count > 0) {
        newRec.count = newRec.count - 1
      }
      await addDoc(collection(db, 'reminders'), {
        title: r.title,
        description: r.description,
        dateTime: nd,
        importance: r.importance,
        color: r.color,
        category: r.category,
        isPermanent: r.isPermanent || false,
        ownerId: r.ownerId,
        isShared: false,
        sharedFrom: null,
        status: 'own',
        isCompleted: false,
        completedAt: null,
        snoozeUntil: null,
        recurrence: newRec.count === 0 ? null : newRec,
        seriesId: newSeriesId,
        tasks: r.tasks || [],
        archived: false,
        isFavorite: r.isFavorite || false,
        tags: r.tags || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }
  }
}

// ── DELETE ───────────────────────────────────────────────
export const deleteReminder = async (reminderId) => {
  await deleteDoc(doc(db, 'reminders', reminderId))
}

// ── SHARE ────────────────────────────────────────────────
export const shareReminder = async (reminder, fromUserId, toUserId, groupId, toUserName) => {
  const sharedRef = await addDoc(collection(db, 'reminders'), {
    title: reminder.title,
    description: reminder.description,
    dateTime: reminder.dateTime || serverTimestamp(),
    importance: reminder.importance,
    color: reminder.color,
    category: reminder.category,
    isPermanent: reminder.isPermanent || false,
    ownerId: toUserId,
    isShared: true,
    sharedFrom: fromUserId,
    sharedFromName: reminder.sharedFromName || 'Unknown',
    originalId: reminder.id,
    status: 'pending',
    isCompleted: false,
    completedAt: null,
    recurrence: null,
    tasks: reminder.tasks || [],
    tags: reminder.tags || [],
    isFavorite: false,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  const logRef = await addDoc(collection(db, 'sharedReminders'), {
    reminderId: sharedRef.id,
    originalReminderId: reminder.id,
    fromUserId,
    toUserId,
    toUserName: toUserName || 'Usuario',
    groupId,
    status: 'pending',
    revoked: false,
    readAt: null,
    createdAt: serverTimestamp()
  })

  await updateDoc(doc(db, 'reminders', sharedRef.id), {
    sharedReminderId: logRef.id
  })

  return sharedRef.id
}

export const acceptSharedReminder = async (reminderId) => {
  const snap = await getDoc(doc(db, 'reminders', reminderId))
  if (!snap.exists()) return
  const data = snap.data()

  await updateDoc(doc(db, 'reminders', reminderId), {
    status: 'accepted',
    updatedAt: serverTimestamp()
  })

  if (data.sharedReminderId) {
    await updateDoc(doc(db, 'sharedReminders', data.sharedReminderId), { status: 'accepted' })
  }
}

export const rejectSharedReminder = async (reminderId) => {
  const snap = await getDoc(doc(db, 'reminders', reminderId))
  if (!snap.exists()) return
  const data = snap.data()

  await deleteDoc(doc(db, 'reminders', reminderId))

  if (data.sharedReminderId) {
    await updateDoc(doc(db, 'sharedReminders', data.sharedReminderId), { status: 'rejected' })
  }
}

// ── FAVORITE ──────────────────────────────────────────────
export const toggleFavorite = async (reminderId, favorite = true) => {
  await updateDoc(doc(db, 'reminders', reminderId), {
    isFavorite: !!favorite,
    updatedAt: serverTimestamp()
  })
}

// ── SNOOZE ────────────────────────────────────────────────
export const snoozeReminder = async (reminderId, minutes) => {
  const m = Math.max(1, Number(minutes) || 5)
  const until = new Date(Date.now() + m * 60000)
  await updateDoc(doc(db, 'reminders', reminderId), {
    snoozeUntil: until,
    updatedAt: serverTimestamp()
  })
}

export const clearSnooze = async (reminderId) => {
  await updateDoc(doc(db, 'reminders', reminderId), {
    snoozeUntil: null,
    updatedAt: serverTimestamp()
  })
}

// ── DUPLICATE ────────────────────────────────────────────
export const duplicateReminder = async (userId, reminder) => {
  const { id, createdAt, updatedAt, completedAt, sharedFrom, sharedReminderId, originalId, status, isShared, sharedFromName, ...rest } = reminder
  await addDoc(collection(db, 'reminders'), {
    ...rest,
    title: `${rest.title || 'Recordatorio'} (Copia)`,
    ownerId: userId,
    isShared: false,
    sharedFrom: null,
    status: 'own',
    isCompleted: false,
    completedAt: null,
    snoozeUntil: null,
    sharedReminderId: null,
    originalId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
}

// ── GET ONE ──────────────────────────────────────────────
export const getReminderById = async (id) => {
  const snap = await getDoc(doc(db, 'reminders', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}