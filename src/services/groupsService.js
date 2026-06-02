import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot, serverTimestamp,
  getDoc, getDocs, arrayUnion, arrayRemove, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

// Generate random 6-char invite code
const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase()

// ── CREATE GROUP ─────────────────────────────────────────
export const createGroup = async (userId, name, description = '') => {
  const inviteCode = generateCode()
  const ref = await addDoc(collection(db, 'groups'), {
    name,
    description,
    createdBy: userId,
    members: [userId],
    inviteCode,
    createdAt: serverTimestamp()
  })
  // Add group to user's profile
  await updateDoc(doc(db, 'users', userId), {
    groups: arrayUnion(ref.id)
  })
  return { id: ref.id, inviteCode }
}

// ── JOIN GROUP ───────────────────────────────────────────
export const joinGroupByCode = async (userId, code) => {
  const q = query(collection(db, 'groups'), where('inviteCode', '==', code.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error('Código de grupo no encontrado')
  const groupDoc = snap.docs[0]
  const groupData = groupDoc.data()
  if (groupData.members.includes(userId)) throw new Error('Ya eres miembro de este grupo')

  await updateDoc(doc(db, 'groups', groupDoc.id), {
    members: arrayUnion(userId)
  })
  await updateDoc(doc(db, 'users', userId), {
    groups: arrayUnion(groupDoc.id)
  })
  return { id: groupDoc.id, ...groupData }
}

// ── LEAVE GROUP ──────────────────────────────────────────
export const leaveGroup = async (userId, groupId) => {
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayRemove(userId)
  })
  await updateDoc(doc(db, 'users', userId), {
    groups: arrayRemove(groupId)
  })
}

// ── GET GROUPS (real-time) ───────────────────────────────
export const subscribeToUserGroups = (userId, callback) => {
  const q = query(
    collection(db, 'groups'),
    where('members', 'array-contains', userId)
  )
  return onSnapshot(q, (snap) => {
    const groups = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(groups)
  })
}

// ── GET GROUP MEMBERS ────────────────────────────────────
export const getGroupMembers = async (memberIds) => {
  if (!memberIds || memberIds.length === 0) return []
  const members = await Promise.all(
    memberIds.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid))
      return snap.exists() ? { id: snap.id, ...snap.data() } : null
    })
  )
  return members.filter(Boolean)
}

// ── GET GROUP BY ID ──────────────────────────────────────
export const getGroupById = async (groupId) => {
  const snap = await getDoc(doc(db, 'groups', groupId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ── DELETE GROUP ─────────────────────────────────────────
export const deleteGroup = async (groupId, memberIds) => {
  const batch = writeBatch(db)
  // Remove group from all members
  memberIds.forEach(uid => {
    const userRef = doc(db, 'users', uid)
    batch.update(userRef, { groups: arrayRemove(groupId) })
  })
  batch.delete(doc(db, 'groups', groupId))
  await batch.commit()
}
