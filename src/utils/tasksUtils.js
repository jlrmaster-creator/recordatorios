export const generateTaskId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export const computeProgress = (tasks = []) => {
  if (!tasks.length) return { total: 0, done: 0, pct: 0 }
  const done = tasks.filter(t => t.done).length
  const total = tasks.length
  const pct = Math.round((done / total) * 100)
  return { total, done, pct }
}