import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  getDoc, getDocs, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

// ── CREATE ──────────────────────────────────────────────
export const createReminder = async (userId, data) => {
  const ref = await addDoc(collection(db, 'reminders'), {
    ...data,
    ownerId: userId,
    isShared: false,
    sharedFrom: null,
    status: 'own',
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

// ── DELETE ───────────────────────────────────────────────
export const deleteReminder = async (reminderId) => {
  await deleteDoc(doc(db, 'reminders', reminderId))
}

// ── SHARE ────────────────────────────────────────────────
export const shareReminder = async (reminder, fromUserId, toUserId, groupId, toUserName) => {
  // Create a copy of the reminder for the recipient
  const sharedRef = await addDoc(collection(db, 'reminders'), {
    title: reminder.title,
    description: reminder.description,
    dateTime: reminder.dateTime || serverTimestamp(),
    importance: reminder.importance,
    color: reminder.color,
    category: reminder.category,
    ownerId: toUserId,
    isShared: true,
    sharedFrom: fromUserId,
    sharedFromName: reminder.sharedFromName || 'Unknown',
    originalId: reminder.id,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  // Log the share event
  await addDoc(collection(db, 'sharedReminders'), {
    reminderId: sharedRef.id,
    originalReminderId: reminder.id,
    fromUserId,
    toUserId,
    toUserName: toUserName || 'Usuario',
    groupId,
    status: 'pending',
    createdAt: serverTimestamp()
  })

  return sharedRef.id
}

export const acceptSharedReminder = async (reminderId) => {
  await updateDoc(doc(db, 'reminders', reminderId), {
    status: 'accepted',
    updatedAt: serverTimestamp()
  })
  
  const q = query(collection(db, 'sharedReminders'), where('reminderId', '==', reminderId))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, 'sharedReminders', snap.docs[0].id), { status: 'accepted' })
  }
}

export const rejectSharedReminder = async (reminderId) => {
  await deleteDoc(doc(db, 'reminders', reminderId))
  
  const q = query(collection(db, 'sharedReminders'), where('reminderId', '==', reminderId))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(doc(db, 'sharedReminders', snap.docs[0].id), { status: 'rejected' })
  }
}

// ── GET ONE ──────────────────────────────────────────────
export const getReminderById = async (id) => {
  const snap = await getDoc(doc(db, 'reminders', id))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
