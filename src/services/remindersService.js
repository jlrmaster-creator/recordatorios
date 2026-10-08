import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp,
  getDoc, getDocs, arrayUnion
} from 'firebase/firestore'
import { db, auth } from './firebase'
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
    const reminders = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      // Borrados solo para este usuario: quedan en Firebase hasta que
      // todos los participantes lo eliminen, pero ya no se muestran
      .filter(r => !(r.deletedBy || []).includes(userId))
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
// Reglas de borrado:
//  - Recordatorio propio SIN compartir → se borra de Firebase al
//    instante (no queda nada relacionado).
//  - Recordatorio compartido (original propio o copia recibida) →
//    se elimina SOLO de la vista del usuario (deletedBy). Los datos
//    se borran de Firebase cuando TODOS los participantes lo han
//    eliminado (lo coordina maybePurgeSharedReminder, que solo el
//    emisor puede evaluar porque lee el original, todas las copias
//    y todos los registros).
export const deleteReminder = async (reminderId) => {
  const uid = auth.currentUser?.uid
  const ref = doc(db, 'reminders', reminderId)
  const snap = await getDoc(ref).catch(() => null)
  if (!snap || !snap.exists()) return { shared: false }
  const data = snap.data()

  if (!uid) {
    await deleteDoc(ref)
    return { shared: false }
  }

  const markDeletedForMe = () => updateDoc(ref, {
    deletedBy: arrayUnion(uid),
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  // Copia recibida: la elimino solo de mi vista y lo anoto en su
  // registro para que el emisor sepa que ya la eliminé
  if (data.isShared) {
    await markDeletedForMe()
    const logs = await getDocs(query(
      collection(db, 'sharedReminders'),
      where('reminderId', '==', reminderId),
      where('toUserId', '==', uid)
    )).catch(() => null)
    for (const log of logs?.docs || []) {
      await updateDoc(log.ref, { deletedBy: arrayUnion(uid) }).catch(() => {})
    }
    return { shared: true }
  }

  // Original propio: ¿lo he compartido alguna vez?
  const logs = await getDocs(query(
    collection(db, 'sharedReminders'),
    where('originalReminderId', '==', reminderId),
    where('fromUserId', '==', uid)
  )).catch(() => null)
  if (logs === null) {
    // Sin poder comprobarlo no borramos: podría dejar copias huérfanas
    throw new Error('No se pudo comprobar si está compartido')
  }

  if (!logs.empty) {
    // Compartido: se oculta de mi vista y se espera a que todos lo eliminen
    await markDeletedForMe()
    await maybePurgeSharedReminder(reminderId).catch(() => {})
    return { shared: true }
  }

  // Nunca compartido → nada relacionado en Firebase: borrar directamente
  await deleteDoc(ref)
  return { shared: false }
}

// ── PURGA DE COMPARTIDOS ─────────────────────────────────
// Evalúa si TODOS los participantes (emisor + destinatarios) ya
// eliminaron este recordatorio compartido; si es así, borra de
// Firebase el original, todas las copias y todos los registros.
// Solo el emisor puede evaluarlo: sus registros (fromUserId) y sus
// copias (sharedFrom) son legibles por las reglas, los demás no.
export const maybePurgeSharedReminder = async (originalId) => {
  const uid = auth.currentUser?.uid
  if (!uid) return false

  const origRef = doc(db, 'reminders', originalId)
  let origSnap
  try {
    origSnap = await getDoc(origRef)
  } catch {
    return false // error de red: nunca purgar a ciegas
  }
  const orig = origSnap.exists() ? origSnap.data() : null

  const logsSnap = await getDocs(query(
    collection(db, 'sharedReminders'),
    where('originalReminderId', '==', originalId),
    where('fromUserId', '==', uid)
  )).catch(() => null)
  if (!logsSnap) return false
  const logs = logsSnap.docs.map(d => ({ ref: d.ref, id: d.id, data: d.data() }))

  const copiesSnap = await getDocs(query(
    collection(db, 'reminders'),
    where('originalId', '==', originalId),
    where('sharedFrom', '==', uid),
    where('isShared', '==', true)
  )).catch(() => null)
  if (!copiesSnap) return false
  const copies = copiesSnap.docs.map(d => ({ ref: d.ref, id: d.id, data: d.data() }))

  // Nada que evaluar ni borrar (p. ej. no soy el emisor)
  if (!orig && logs.length === 0 && copies.length === 0) return false

  // Se evalúa documento a documento (no por unión de usuarios): así,
  // si se vuelve a compartir a alguien que ya lo eliminó, su copia
  // nueva cuenta por separado y no se purga prematuramente.

  // 1) El emisor debe haber eliminado su original (si ya no existe,
  //    se da por hecho: no hay nada que esperar de él)
  const origOk = !orig || (orig.deletedBy || []).includes(orig.ownerId)

  // 2) Cada copia debe estar eliminada por SU dueño
  const copiesOk = copies.every(c => (c.data.deletedBy || []).includes(c.data.ownerId))

  // 3) Los registros sin copia viva: ese destinatario ya no tiene nada
  const logsOk = logs.every(l =>
    l.data.status === 'rejected' ||
    !l.data.reminderId ||
    copies.some(c => c.id === l.data.reminderId)
  )

  if (!origOk || !copiesOk || !logsOk) return false // aún falta alguien por eliminarlo

  // Todos lo eliminaron → purgar todo lo relacionado de Firebase
  for (const c of copies) await deleteDoc(c.ref).catch(() => {})
  for (const l of logs) await deleteDoc(l.ref).catch(() => {})
  if (orig) await deleteDoc(origRef).catch(() => {})
  return true
}

// Al iniciar sesión: intenta purgar los compartidos que ya eliminaron
// todos (los que se eliminaron en otro dispositivo o con la app cerrada)
export const purgeCompletedShares = async () => {
  const uid = auth.currentUser?.uid
  if (!uid) return

  const candidates = new Set()

  // Originales propios que ya eliminé (ocultos en mi lista)
  const mine = await getDocs(query(
    collection(db, 'reminders'),
    where('ownerId', '==', uid)
  )).catch(() => null)
  for (const d of mine?.docs || []) {
    const r = d.data()
    if (!r.isShared && (r.deletedBy || []).includes(uid)) candidates.add(d.id)
  }

  // Originales de los recordatorios que he compartido
  const sent = await getDocs(query(
    collection(db, 'sharedReminders'),
    where('fromUserId', '==', uid)
  )).catch(() => null)
  for (const d of sent?.docs || []) {
    const id = d.data().originalReminderId
    if (id) candidates.add(id)
  }

  for (const id of candidates) {
    await maybePurgeSharedReminder(id).catch(() => {})
  }
}

// ── CLEANUP DE HUÉRFANOS ─────────────────────────────────
// Al iniciar sesión, elimina los restos que ya no justifican
// conservarse (creados antes de este arreglo o por fallos):
//  - mis registros de compartición cuya COPIA ya no existe
//  - mis copias cuyo original desapareció y que YO ya eliminé
// Se conservan los registros cuyo original falta pero la copia
// sigue viva: son necesarios para coordinar la purga cuando todos
// los participantes la eliminen.
export const cleanupOrphanShares = async () => {
  const uid = auth.currentUser?.uid
  if (!uid) return

  // Ante un error de red asumimos que existe: nunca borrar a ciegas
  const exists = (id) =>
    getDoc(doc(db, 'reminders', id)).then(s => s.exists()).catch(() => true)
  const deleteSafe = (ref) => deleteDoc(ref).catch(() => {})

  // 1) Registros de compartición sin copia asociada
  const sentSnap = await getDocs(
    query(collection(db, 'sharedReminders'), where('fromUserId', '==', uid))
  ).catch(() => null)
  const recvSnap = await getDocs(
    query(collection(db, 'sharedReminders'), where('toUserId', '==', uid))
  ).catch(() => null)

  const logs = [...(sentSnap?.docs || []), ...(recvSnap?.docs || [])]
  const seen = new Set()
  for (const log of logs) {
    if (seen.has(log.id)) continue
    seen.add(log.id)
    const d = log.data()
    if (!d.reminderId && !d.originalReminderId) {
      await deleteSafe(log.ref)
      continue
    }
    if (d.reminderId) {
      const copyExists = await exists(d.reminderId)
      if (!copyExists) await deleteSafe(log.ref)
    }
  }

  // 2) Copias recibidas: solo las que YO ya eliminé y cuyo original ya no existe
  const copiesSnap = await getDocs(query(
    collection(db, 'reminders'),
    where('ownerId', '==', uid),
    where('isShared', '==', true)
  )).catch(() => null)

  if (copiesSnap) {
    for (const copy of copiesSnap.docs) {
      const d = copy.data()
      if (!d.originalId) continue
      if (!(d.deletedBy || []).includes(uid)) continue // aún la veo → conservar
      const originalExists = await exists(d.originalId)
      if (!originalExists) await deleteSafe(copy.ref)
    }
  }
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
  const uid = auth.currentUser?.uid
  const snap = await getDoc(doc(db, 'reminders', reminderId))
  if (!snap.exists()) return
  const data = snap.data()

  // Rechazar = eliminarlo solo de mi vista. Los datos se borran de
  // Firebase cuando todos los participantes lo hayan eliminado.
  await updateDoc(doc(db, 'reminders', reminderId), {
    status: 'rejected',
    deletedBy: arrayUnion(uid),
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })

  if (data.sharedReminderId) {
    // Se conserva el registro (hace falta para la purga final);
    // si las reglas aún no permiten actualizarlo, se omite.
    await updateDoc(doc(db, 'sharedReminders', data.sharedReminderId), {
      status: 'rejected',
      deletedBy: arrayUnion(uid)
    }).catch(() => {})
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
  const { id, createdAt, updatedAt, completedAt, sharedFrom, sharedReminderId, originalId, status, isShared, sharedFromName, deletedBy, deletedAt, ...rest } = reminder
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