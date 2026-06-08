import {
  collection, doc, addDoc, updateDoc, setDoc,
  query, where, onSnapshot, serverTimestamp,
  getDoc, arrayUnion, arrayRemove, writeBatch
} from 'firebase/firestore'
import { db } from './firebase'

// Simple cache for group members (30s TTL)
const membersCache = new Map()
const CACHE_TTL = 30_000

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
  // Create invite code lookup document
  await setDoc(doc(db, 'inviteCodes', inviteCode), {
    groupId: ref.id,
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
  const codeUpper = code.toUpperCase()
  const inviteSnap = await getDoc(doc(db, 'inviteCodes', codeUpper))
  if (!inviteSnap.exists()) throw new Error('Código de grupo no encontrado')

  const groupId = inviteSnap.data().groupId
  const groupSnap = await getDoc(doc(db, 'groups', groupId))
  if (!groupSnap.exists()) throw new Error('El grupo ya no existe')

  const groupData = groupSnap.data()
  if (groupData.members.includes(userId)) throw new Error('Ya eres miembro de este grupo')

  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayUnion(userId)
  })
  await updateDoc(doc(db, 'users', userId), {
    groups: arrayUnion(groupId)
  })
  return { id: groupId, ...groupData }
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
  }, console.error)
}

// ── GET GROUP MEMBERS ────────────────────────────────────
export const getGroupMembers = async (memberIds) => {
  if (!memberIds || memberIds.length === 0) return []

  const cacheKey = [...memberIds].sort().join(',')
  const cached = membersCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data

  const members = (await Promise.all(
    memberIds.map(async (uid) => {
      const snap = await getDoc(doc(db, 'users', uid))
      return snap.exists() ? { id: snap.id, ...snap.data() } : null
    })
  )).filter(Boolean)

  membersCache.set(cacheKey, { data: members, ts: Date.now() })
  return members
}

// ── GET GROUP BY ID ──────────────────────────────────────
export const getGroupById = async (groupId) => {
  const snap = await getDoc(doc(db, 'groups', groupId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// ── DELETE GROUP ─────────────────────────────────────────
export const deleteGroup = async (groupId) => {
  const groupSnap = await getDoc(doc(db, 'groups', groupId))
  if (!groupSnap.exists()) return
  const { members, inviteCode } = groupSnap.data()

  const batch = writeBatch(db)
  // Remove group from all members
  members.forEach(uid => {
    const userRef = doc(db, 'users', uid)
    batch.update(userRef, { groups: arrayRemove(groupId) })
  })
  batch.delete(doc(db, 'groups', groupId))
  batch.delete(doc(db, 'inviteCodes', inviteCode))
  await batch.commit()
}
