import { useState, useEffect, useCallback, useRef } from 'react'

// ─── Utilities ─────────────────────────────────────────────────────────────

function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function weekKey(monday) {
  return monday.toISOString().slice(0, 10)
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function fmt(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtFull(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

function todayMondayKey() {
  return weekKey(getMondayOfWeek(new Date()))
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MOOD_EMOJIS = ['😔', '😕', '😐', '🙂', '😄']

// ─── localStorage helpers ────────────────────────────────────────────────────

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? JSON.parse(v) : fallback
  } catch { return fallback }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function useLS(key, initial) {
  const [state, setState] = useState(() => load(key, initial))
  const set = useCallback((v) => {
    setState(prev => {
      const next = typeof v === 'function' ? v(prev) : v
      save(key, next)
      return next
    })
  }, [key])
  return [state, set]
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const S = {
  app: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
    background: '#F2F2F7',
    minHeight: '100vh',
    maxWidth: 430,
    margin: '0 auto',
    position: 'relative',
  },
  navBar: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    background: 'rgba(242,242,247,0.94)',
    borderBottom: '1px solid #E5E5EA',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
    overflow: 'hidden',
    margin: '0 16px',
  },
  divider: { height: 1, background: '#F2F2F7', margin: '0 16px' },
  sectionDivider: { height: 1, background: '#E5E5EA' },
  iconBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomSheet: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  sheetOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
  },
  sheetContent: {
    position: 'relative',
    background: '#F2F2F7',
    borderRadius: '13px 13px 0 0',
    maxHeight: '92vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sheetNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #E5E5EA',
    background: '#F2F2F7',
    flexShrink: 0,
  },
  sheetBody: { overflowY: 'auto', flex: 1, paddingBottom: 40 },
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toggle({ on, onChange }) {
  return (
    <div
      onClick={() => onChange(!on)}
      style={{
        width: 51, height: 31, borderRadius: 15.5,
        background: on ? '#1C1C1E' : '#E5E5EA',
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2, left: on ? 22 : 2,
        width: 27, height: 27, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

function CheckCircle({ checked, onChange, size = 26 }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: `2px solid ${checked ? '#1C1C1E' : '#C7C7CC'}`,
        background: checked ? '#1C1C1E' : 'transparent',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        padding: 0,
      }}
    >
      {checked && (
        <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
          <path d="M1 5l4 4 7-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  )
}

function PulsingDots() {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', padding: '24px 0' }}>
      {[0, 1, 2].map(i => (
        <div
          key={i}
          style={{
            width: 8, height: 8, borderRadius: '50%', background: '#8E8E93',
            animation: `bjPulse 1.4s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Habit Form Sheet ────────────────────────────────────────────────────────

function HabitFormSheet({ habit, onSave, onDelete, onClose }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [type, setType] = useState(habit?.type ?? 'check')
  const [unit, setUnit] = useState(habit?.unit ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const types = [
    { value: 'check', label: 'Checkbox' },
    { value: 'number', label: 'Number' },
    { value: 'time', label: 'Time' },
    { value: 'scale', label: '1–10 Scale' },
  ]

  function handleSave() {
    if (!name.trim()) return
    onSave({ name: name.trim(), type, unit: type === 'number' ? unit.trim() : '' })
  }

  return (
    <div style={S.bottomSheet}>
      <div style={S.sheetOverlay} onClick={onClose} />
      <div style={{ ...S.sheetContent, maxWidth: 430, width: '100%', margin: '0 auto' }}>
        <div style={S.sheetNav}>
          <button style={{ ...S.iconBtn, color: '#007AFF', fontSize: 17 }} onClick={onClose}>Cancel</button>
          <span style={{ fontWeight: 600, fontSize: 17 }}>{habit ? 'Edit Habit' : 'New Habit'}</span>
          <button
            style={{ ...S.iconBtn, color: name.trim() ? '#007AFF' : '#C7C7CC', fontSize: 17, fontWeight: 600 }}
            onClick={handleSave}
            disabled={!name.trim()}
          >Done</button>
        </div>
        <div style={S.sheetBody}>
          <div style={{ padding: '16px 16px 8px', fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Name</div>
          <div style={S.card}>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Habit name"
              autoFocus
              style={{
                width: '100%', border: 'none', outline: 'none',
                padding: '14px 16px', fontSize: 17,
                background: 'transparent', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ padding: '16px 16px 8px', fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Type</div>
          <div style={S.card}>
            {types.map((t, i) => (
              <div key={t.value}>
                <div
                  style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => setType(t.value)}
                >
                  <span style={{ flex: 1, fontSize: 17 }}>{t.label}</span>
                  {type === t.value && (
                    <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
                      <path d="M1 7l5 5L17 1" stroke="#007AFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                {i < types.length - 1 && <div style={{ height: 1, background: '#F2F2F7', marginLeft: 16 }} />}
              </div>
            ))}
          </div>

          {type === 'number' && (
            <>
              <div style={{ padding: '16px 16px 8px', fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Unit (optional)</div>
              <div style={S.card}>
                <input
                  value={unit}
                  onChange={e => setUnit(e.target.value)}
                  placeholder="e.g. km, glasses, mins"
                  style={{
                    width: '100%', border: 'none', outline: 'none',
                    padding: '14px 16px', fontSize: 17,
                    background: 'transparent', boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>
            </>
          )}

          {habit && (
            <div style={{ margin: '24px 0 0' }}>
              {!confirmDelete ? (
                <div style={S.card}>
                  <button
                    style={{ width: '100%', border: 'none', background: 'none', padding: '14px 16px', fontSize: 17, color: '#FF3B30', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}
                    onClick={() => setConfirmDelete(true)}
                  >Remove Habit</button>
                </div>
              ) : (
                <div style={S.card}>
                  <div style={{ padding: '16px' }}>
                    <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 6, textAlign: 'center' }}>Remove "{habit.name}"?</div>
                    <div style={{ fontSize: 14, color: '#8E8E93', marginBottom: 16, textAlign: 'center' }}>Recorded data will be preserved.</div>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #E5E5EA', background: '#fff', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}
                        onClick={() => setConfirmDelete(false)}
                      >Cancel</button>
                      <button
                        style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#FF3B30', color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                        onClick={() => onDelete(habit.id)}
                      >Remove</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Habit Manager Sheet ─────────────────────────────────────────────────────

function HabitManagerSheet({ habits, weekHabitIds, onClose, onSaveHabit, onDeleteHabit, onToggleWeekHabit }) {
  const [tab, setTab] = useState('week')
  const [editingHabit, setEditingHabit] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)

  function handleSave(data) {
    if (editingHabit && editingHabit.id) {
      onSaveHabit({ ...editingHabit, ...data })
    } else {
      onSaveHabit({ id: `h${Date.now()}`, ...data })
    }
    setEditingHabit(null)
    setShowNewForm(false)
  }

  function handleDelete(id) {
    onDeleteHabit(id)
    setEditingHabit(null)
  }

  const activeHabits = habits.filter(h => weekHabitIds.includes(h.id))
  const inactiveHabits = habits.filter(h => !weekHabitIds.includes(h.id))

  if (editingHabit !== null || showNewForm) {
    return (
      <HabitFormSheet
        habit={showNewForm ? null : editingHabit}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => { setEditingHabit(null); setShowNewForm(false) }}
      />
    )
  }

  return (
    <div style={S.bottomSheet}>
      <div style={S.sheetOverlay} onClick={onClose} />
      <div style={{ ...S.sheetContent, maxWidth: 430, width: '100%', margin: '0 auto' }}>
        <div style={S.sheetNav}>
          <div style={{ width: 60 }} />
          <span style={{ fontWeight: 600, fontSize: 17 }}>Habits</span>
          <button style={{ ...S.iconBtn, color: '#007AFF', fontSize: 17, width: 60, justifyContent: 'flex-end' }} onClick={onClose}>Done</button>
        </div>

        {/* Tabs */}
        <div style={{ padding: '8px 16px', background: '#F2F2F7', borderBottom: '1px solid #E5E5EA', flexShrink: 0 }}>
          <div style={{ display: 'flex', background: '#E5E5EA', borderRadius: 9, padding: 2 }}>
            {[{ key: 'week', label: 'This Week' }, { key: 'library', label: 'Library' }].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  flex: 1, padding: '6px', border: 'none', cursor: 'pointer',
                  borderRadius: 7,
                  background: tab === t.key ? '#fff' : 'transparent',
                  fontWeight: tab === t.key ? 600 : 400,
                  fontSize: 14,
                  boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
                  color: '#1C1C1E',
                  fontFamily: 'inherit',
                  transition: 'background 0.15s',
                }}
              >{t.label}</button>
            ))}
          </div>
        </div>

        <div style={S.sheetBody}>
          {tab === 'week' ? (
            <>
              {activeHabits.length > 0 && (
                <div style={{ margin: '16px 0 0' }}>
                  <div style={{ padding: '0 16px 8px', fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Active this week</div>
                  <div style={S.card}>
                    {activeHabits.map((h, i) => (
                      <div key={h.id}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12 }}>
                          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditingHabit(h)}>
                            <div style={{ fontSize: 17 }}>{h.name}</div>
                            <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 1 }}>
                              {h.type === 'check' ? 'Checkbox' : h.type === 'number' ? `Number${h.unit ? ` · ${h.unit}` : ''}` : h.type === 'time' ? 'Time' : '1–10 Scale'}
                            </div>
                          </div>
                          <Toggle on={true} onChange={() => onToggleWeekHabit(h.id)} />
                        </div>
                        {i < activeHabits.length - 1 && <div style={{ height: 1, background: '#F2F2F7', marginLeft: 16 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {inactiveHabits.length > 0 && (
                <div style={{ margin: '16px 0 0' }}>
                  <div style={{ padding: '0 16px 8px', fontSize: 13, color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5 }}>Not active</div>
                  <div style={S.card}>
                    {inactiveHabits.map((h, i) => (
                      <div key={h.id}>
                        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', gap: 12, opacity: 0.55 }}>
                          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setEditingHabit(h)}>
                            <div style={{ fontSize: 17 }}>{h.name}</div>
                            <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 1 }}>
                              {h.type === 'check' ? 'Checkbox' : h.type === 'number' ? `Number${h.unit ? ` · ${h.unit}` : ''}` : h.type === 'time' ? 'Time' : '1–10 Scale'}
                            </div>
                          </div>
                          <Toggle on={false} onChange={() => onToggleWeekHabit(h.id)} />
                        </div>
                        {i < inactiveHabits.length - 1 && <div style={{ height: 1, background: '#F2F2F7', marginLeft: 16 }} />}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {habits.length === 0 && (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#8E8E93', fontSize: 15 }}>
                  No habits yet. Create one below.
                </div>
              )}
              <div style={{ margin: '16px 0' }}>
                <div style={S.card}>
                  <button
                    style={{ width: '100%', border: 'none', background: 'none', padding: '14px 16px', fontSize: 17, color: '#007AFF', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                    onClick={() => setShowNewForm(true)}
                  >+ New Habit</button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ margin: '16px 0' }}>
              {habits.length === 0 ? (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: '#8E8E93', fontSize: 15 }}>
                  No habits in library yet.
                </div>
              ) : (
                <div style={S.card}>
                  {habits.map((h, i) => (
                    <div key={h.id}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', cursor: 'pointer', gap: 12 }}
                        onClick={() => setEditingHabit(h)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 17 }}>{h.name}</div>
                          <div style={{ fontSize: 13, color: '#8E8E93', marginTop: 1 }}>
                            {h.type === 'check' ? 'Checkbox' : h.type === 'number' ? `Number${h.unit ? ` · ${h.unit}` : ''}` : h.type === 'time' ? 'Time' : '1–10 Scale'}
                          </div>
                        </div>
                        {weekHabitIds.includes(h.id) && (
                          <span style={{ fontSize: 12, color: '#007AFF', fontWeight: 500, background: 'rgba(0,122,255,0.1)', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>Active</span>
                        )}
                        <svg width="8" height="13" viewBox="0 0 8 13" fill="none">
                          <path d="M1 1l6 5.5L1 12" stroke="#C7C7CC" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      {i < habits.length - 1 && <div style={{ height: 1, background: '#F2F2F7', marginLeft: 16 }} />}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ margin: '16px 0' }}>
                <div style={S.card}>
                  <button
                    style={{ width: '100%', border: 'none', background: 'none', padding: '14px 16px', fontSize: 17, color: '#007AFF', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                    onClick={() => setShowNewForm(true)}
                  >+ New Habit</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Close Week Sheet ────────────────────────────────────────────────────────

function CloseWeekSheet({ weekLabel, weekData, onClose, onSaveAndClose }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generated, setGenerated] = useState(false)

  async function generate() {
    setLoading(true)
    setError('')
    const { notes, moods, habits } = weekData

    const moodNames = ['very low', 'low', 'neutral', 'good', 'great']
    const moodLines = moods.map((m, i) => `${DAY_LABELS[i]}: ${m !== null ? moodNames[m] : 'not recorded'}`)
    const noteLines = notes.map((n, i) => `${DAY_LABELS[i]}: ${n || '(no note)'}`)
    const habitLines = habits.map(h => {
      const vals = h.values.map((v, i) => `${DAY_LABELS[i]}=${v || '—'}`).join(', ')
      return `${h.name} (${h.type}${h.unit ? ', unit: ' + h.unit : ''}): ${vals}`
    })

    const prompt = `You are writing a warm, reflective weekly journal summary for someone using a bullet journal app. Here is their data for the week of ${weekLabel}:

Mood (scale: very low / low / neutral / good / great):
${moodLines.join('\n')}

Daily notes:
${noteLines.join('\n')}

Habit tracking:
${habitLines.length > 0 ? habitLines.join('\n') : '(no habits tracked this week)'}

Please write 3–5 paragraphs of warm, honest prose reflecting on this person's week. No bullet points, no headers. Reflect on mood patterns, habit consistency, and themes from their notes. Close with one gentle, encouraging observation for the coming week. Write as if speaking directly to the person.`

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || `API error ${res.status}`)
      }
      const data = await res.json()
      setSummary(data.content?.[0]?.text || '')
      setGenerated(true)
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={S.bottomSheet}>
      <div style={S.sheetOverlay} onClick={onClose} />
      <div style={{ ...S.sheetContent, maxWidth: 430, width: '100%', margin: '0 auto' }}>
        <div style={S.sheetNav}>
          <button style={{ ...S.iconBtn, color: '#007AFF', fontSize: 17 }} onClick={onClose}>Cancel</button>
          <span style={{ fontWeight: 600, fontSize: 17 }}>Close Week</span>
          <div style={{ width: 60 }} />
        </div>
        <div style={S.sheetBody}>
          <div style={{ padding: '20px 16px 16px' }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{weekLabel}</div>
            <div style={{ fontSize: 15, color: '#8E8E93', lineHeight: 1.55 }}>
              Claude will write a warm, reflective summary of your notes, moods, and habits for this week. You can edit it before saving.
            </div>
          </div>

          {!generated && !loading && (
            <div style={{ padding: '0 16px 16px' }}>
              <button
                onClick={generate}
                style={{
                  width: '100%', padding: '14px', borderRadius: 12,
                  border: 'none', background: '#1C1C1E', color: '#fff',
                  fontSize: 17, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >Summarise this week</button>
            </div>
          )}

          {loading && <PulsingDots />}

          {error && !loading && (
            <div style={{ margin: '0 16px 16px', padding: 16, background: '#fff', borderRadius: 12 }}>
              <div style={{ color: '#FF3B30', fontSize: 15, marginBottom: 10 }}>{error}</div>
              <button
                onClick={generate}
                style={{ color: '#007AFF', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', padding: 0 }}
              >Try again</button>
            </div>
          )}

          {generated && !loading && (
            <div style={{ padding: '0 16px 16px' }}>
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                style={{
                  width: '100%', minHeight: 220, border: '1px solid #E5E5EA',
                  borderRadius: 12, padding: 14, fontSize: 15, lineHeight: 1.65,
                  fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                  outline: 'none', color: '#1C1C1E',
                }}
              />
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button
                  onClick={generate}
                  style={{
                    flex: 1, padding: '13px', borderRadius: 12,
                    border: '1px solid #E5E5EA', background: '#fff',
                    fontSize: 15, cursor: 'pointer', color: '#1C1C1E', fontFamily: 'inherit',
                  }}
                >Regenerate</button>
                <button
                  onClick={() => onSaveAndClose(summary)}
                  style={{
                    flex: 1, padding: '13px', borderRadius: 12,
                    border: 'none', background: '#1C1C1E', color: '#fff',
                    fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Save &amp; Close Week</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [habitLibrary, setHabitLibrary] = useLS('bj-habit-library', [])
  const [weekActiveMap, setWeekActiveMap] = useLS('bj-week-active-map', {})
  const [entries, setEntries] = useLS('bj-entries', {})
  const [notes, setNotes] = useLS('bj-notes', {})
  const [moodMap, setMoodMap] = useLS('bj-mood-map', {})
  const [closedWeeks, setClosedWeeks] = useLS('bj-closed-weeks', {})

  const [currentMonday, setCurrentMonday] = useState(() => getMondayOfWeek(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => {
    const d = new Date().getDay()
    return d === 0 ? 6 : d - 1
  })
  const [showSettings, setShowSettings] = useState(false)
  const [showCloseWeek, setShowCloseWeek] = useState(false)
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  const dayPanelRef = useRef(null)
  const wk = weekKey(currentMonday)
  const todayKey = todayMondayKey()
  const isCurrentWeek = wk === todayKey
  const isClosed = wk in closedWeeks

  // Derive active habits for this week; carry over from last configured week
  const weekHabitIds = (() => {
    if (weekActiveMap[wk] !== undefined) return weekActiveMap[wk]
    const keys = Object.keys(weekActiveMap).sort()
    if (keys.length === 0) return []
    return weekActiveMap[keys[keys.length - 1]]
  })()

  // Seed weekActiveMap for new week
  useEffect(() => {
    if (weekActiveMap[wk] === undefined) {
      const keys = Object.keys(weekActiveMap).sort()
      const lastIds = keys.length > 0 ? weekActiveMap[keys[keys.length - 1]] : []
      setWeekActiveMap(prev => ({ ...prev, [wk]: lastIds }))
    }
  }, [wk]) // eslint-disable-line

  const activeHabits = habitLibrary.filter(h => weekHabitIds.includes(h.id))

  // Week nav
  const weekStart = currentMonday
  const weekEnd = addDays(currentMonday, 6)
  const weekLabel = `${fmt(weekStart)} – ${fmt(weekEnd)}`

  function prevWeek() { setCurrentMonday(d => addDays(d, -7)) }
  function nextWeek() { setCurrentMonday(d => addDays(d, 7)) }
  function goToday() {
    setCurrentMonday(getMondayOfWeek(new Date()))
    const d = new Date().getDay()
    setSelectedDay(d === 0 ? 6 : d - 1)
  }

  // Entry/note/mood helpers
  function getEntry(habitId, dayIdx) { return entries[`${wk}-${habitId}-${dayIdx}`] ?? '' }
  function setEntry(habitId, dayIdx, val) { setEntries(prev => ({ ...prev, [`${wk}-${habitId}-${dayIdx}`]: val })) }
  function getNote(dayIdx) { return notes[`${wk}-${dayIdx}`] ?? '' }
  function setNote(dayIdx, val) { setNotes(prev => ({ ...prev, [`${wk}-${dayIdx}`]: val })) }
  function getMood(dayIdx) {
    const v = moodMap[`${wk}-${dayIdx}`]
    return v !== undefined ? v : null
  }
  function setMood(dayIdx, val) { setMoodMap(prev => ({ ...prev, [`${wk}-${dayIdx}`]: val })) }

  // Day progress dot
  function getDayProgress(dayIdx) {
    if (activeHabits.length === 0) return 'empty'
    let filled = 0
    for (const h of activeHabits) {
      const v = getEntry(h.id, dayIdx)
      if (h.type === 'check' ? v === 'true' : (v !== '' && v !== undefined)) filled++
    }
    if (filled === 0) return 'empty'
    if (filled === activeHabits.length) return 'full'
    return 'partial'
  }

  function selectDay(dayIdx) {
    setSelectedDay(dayIdx)
    setTimeout(() => {
      dayPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  // Grid cell display
  function cellDisplay(habit, dayIdx) {
    const v = getEntry(habit.id, dayIdx)
    if (!v && v !== 0) return '—'
    if (habit.type === 'number') return `${v}${habit.unit ? '\u202f' + habit.unit : ''}`
    return v
  }

  // Habit management
  function saveHabit(data) {
    const isNew = !habitLibrary.find(h => h.id === data.id)
    setHabitLibrary(prev => {
      const idx = prev.findIndex(h => h.id === data.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = data; return next }
      return [...prev, data]
    })
    if (isNew) {
      setWeekActiveMap(prev => ({
        ...prev,
        [wk]: [...(prev[wk] ?? weekHabitIds), data.id],
      }))
    }
  }

  function deleteHabit(id) {
    setHabitLibrary(prev => prev.filter(h => h.id !== id))
    setWeekActiveMap(prev => {
      const next = { ...prev }
      for (const k of Object.keys(next)) next[k] = next[k].filter(x => x !== id)
      return next
    })
  }

  function toggleWeekHabit(id) {
    setWeekActiveMap(prev => {
      const cur = prev[wk] ?? weekHabitIds
      const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
      return { ...prev, [wk]: next }
    })
  }

  // Summary data
  function getWeekDataForSummary() {
    return {
      notes: DAY_LABELS.map((_, i) => getNote(i)),
      moods: DAY_LABELS.map((_, i) => getMood(i)),
      habits: activeHabits.map(h => ({
        name: h.name, type: h.type, unit: h.unit,
        values: DAY_LABELS.map((_, i) => getEntry(h.id, i)),
      })),
    }
  }

  function handleSaveAndClose(summary) {
    setClosedWeeks(prev => ({ ...prev, [wk]: summary }))
    setShowCloseWeek(false)
    setSummaryExpanded(false)
  }

  function handleReopen() {
    setClosedWeeks(prev => { const n = { ...prev }; delete n[wk]; return n })
    setSummaryExpanded(false)
  }

  const todayDayIdx = (() => { const d = new Date().getDay(); return d === 0 ? 6 : d - 1 })()

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; background: #F2F2F7; }
        @keyframes bjPulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        input[type=range] { -webkit-appearance: none; appearance: none; height: 4px; border-radius: 2px; background: #E5E5EA; outline: none; cursor: pointer; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 22px; height: 22px; border-radius: 50%; background: #1C1C1E; box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer; }
        input[type=range]::-moz-range-thumb { width: 22px; height: 22px; border-radius: 50%; background: #1C1C1E; border: none; box-shadow: 0 1px 4px rgba(0,0,0,0.25); cursor: pointer; }
        input[type=time] { color-scheme: light; }
        textarea { resize: vertical; }
        ::-webkit-scrollbar { width: 0; height: 0; }
      `}</style>

      <div style={S.app}>
        {/* ── Nav Bar ── */}
        <div style={S.navBar}>
          <button style={S.iconBtn} onClick={prevWeek} aria-label="Previous week">
            <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
              <path d="M9 1L1 8.5L9 16" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 17 }}>{weekLabel}</span>
            {!isCurrentWeek && (
              <button
                onClick={goToday}
                style={{
                  padding: '4px 12px', borderRadius: 14, border: '1px solid #007AFF',
                  background: 'transparent', color: '#007AFF', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                }}
              >Today</button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button style={S.iconBtn} onClick={nextWeek} aria-label="Next week">
              <svg width="10" height="17" viewBox="0 0 10 17" fill="none">
                <path d="M1 1L9 8.5L1 16" stroke="#1C1C1E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button style={S.iconBtn} onClick={() => setShowSettings(true)} aria-label="Settings">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <circle cx="11" cy="11" r="2.5" stroke="#1C1C1E" strokeWidth="1.8" />
                <path d="M11 2.5v2M11 17.5v2M2.5 11h2M17.5 11h2M4.7 4.7l1.4 1.4M15.9 15.9l1.4 1.4M4.7 17.3l1.4-1.4M15.9 6.1l1.4-1.4" stroke="#1C1C1E" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Closed week banner ── */}
        {isClosed && (
          <div style={{ margin: '12px 16px 0', padding: '14px 16px', background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1C1C1E', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                  <path d="M1 5l4 4 8-8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span style={{ flex: 1, fontWeight: 600, fontSize: 15 }}>Week closed</span>
              {closedWeeks[wk] && (
                <button style={{ ...S.iconBtn, color: '#007AFF', fontSize: 15 }} onClick={() => setSummaryExpanded(x => !x)}>
                  {summaryExpanded ? 'Hide' : 'Read'}
                </button>
              )}
              <button style={{ ...S.iconBtn, color: '#007AFF', fontSize: 15 }} onClick={handleReopen}>Reopen</button>
            </div>
            {summaryExpanded && closedWeeks[wk] && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #F2F2F7', fontSize: 15, lineHeight: 1.7, color: '#1C1C1E', whiteSpace: 'pre-wrap' }}>
                {closedWeeks[wk]}
              </div>
            )}
          </div>
        )}

        {/* ── Habit Grid ── */}
        <div style={{ margin: '12px 16px 0' }}>
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <div style={{ minWidth: 480 }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '140px repeat(7, 1fr)', borderBottom: '1px solid #F2F2F7' }}>
                  <div style={{ padding: '10px 16px' }} />
                  {DAY_LABELS.map((d, i) => {
                    const dayDate = addDays(currentMonday, i)
                    const isToday = isCurrentWeek && i === todayDayIdx
                    const progress = getDayProgress(i)
                    return (
                      <div
                        key={i}
                        onClick={() => !isClosed && selectDay(i)}
                        style={{
                          padding: '8px 2px', textAlign: 'center',
                          cursor: isClosed ? 'default' : 'pointer',
                          background: selectedDay === i && !isClosed ? 'rgba(0,0,0,0.03)' : 'transparent',
                          borderLeft: i > 0 ? '1px solid #F2F2F7' : 'none',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, color: isToday ? '#007AFF' : '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3 }}>{d}</div>
                        <div style={{ fontSize: 16, fontWeight: isToday ? 700 : 400, color: isToday ? '#007AFF' : '#1C1C1E', margin: '2px 0 5px' }}>{dayDate.getDate()}</div>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%', margin: '0 auto',
                          background: progress === 'full' ? '#1C1C1E' : progress === 'partial' ? '#C7C7CC' : 'transparent',
                          border: progress === 'empty' ? '1.5px solid #C7C7CC' : 'none',
                        }} />
                      </div>
                    )
                  })}
                </div>

                {/* Habit rows */}
                <div style={{ opacity: isClosed ? 0.6 : 1, pointerEvents: isClosed ? 'none' : 'auto' }}>
                  {activeHabits.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#8E8E93', fontSize: 15 }}>
                      No habits this week.{' '}
                      <span style={{ color: '#007AFF', cursor: 'pointer' }} onClick={() => setShowSettings(true)}>Add some</span>
                    </div>
                  ) : activeHabits.map((habit) => (
                    <div
                      key={habit.id}
                      style={{ display: 'grid', gridTemplateColumns: '140px repeat(7, 1fr)', borderTop: '1px solid #F2F2F7' }}
                    >
                      <div style={{ padding: '10px 12px 10px 16px', fontSize: 14, fontWeight: 500, display: 'flex', alignItems: 'center', borderRight: '1px solid #F2F2F7', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{habit.name}</span>
                      </div>
                      {DAY_LABELS.map((_, dayIdx) => (
                        <div
                          key={dayIdx}
                          style={{
                            padding: '8px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: selectedDay === dayIdx ? 'rgba(0,0,0,0.03)' : 'transparent',
                            cursor: habit.type !== 'check' ? 'pointer' : 'default',
                            borderLeft: dayIdx > 0 ? '1px solid #F2F2F7' : 'none',
                            minHeight: 48,
                          }}
                          onClick={() => habit.type !== 'check' && selectDay(dayIdx)}
                        >
                          {habit.type === 'check' ? (
                            <CheckCircle
                              checked={getEntry(habit.id, dayIdx) === 'true'}
                              onChange={v => setEntry(habit.id, dayIdx, String(v))}
                              size={24}
                            />
                          ) : (
                            <span style={{ fontSize: 11, color: getEntry(habit.id, dayIdx) ? '#1C1C1E' : '#C7C7CC', textAlign: 'center', lineHeight: 1.2, maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 2px' }}>
                              {cellDisplay(habit, dayIdx)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Day Detail Panel ── */}
        {!isClosed && (
          <div ref={dayPanelRef} style={{ margin: '16px 16px 0', scrollMarginTop: 72 }}>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              {/* Day header */}
              <div style={{ padding: '14px 16px', borderBottom: '1px solid #E5E5EA' }}>
                <span style={{ fontWeight: 600, fontSize: 17 }}>{fmtFull(addDays(currentMonday, selectedDay))}</span>
              </div>

              {/* Non-checkbox habits */}
              {activeHabits.filter(h => h.type !== 'check').map((habit, i, arr) => (
                <div key={habit.id}>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ flex: 1, fontSize: 15, fontWeight: 500 }}>{habit.name}</span>
                    </div>
                    {habit.type === 'number' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input
                          type="number"
                          value={getEntry(habit.id, selectedDay)}
                          onChange={e => setEntry(habit.id, selectedDay, e.target.value)}
                          placeholder="0"
                          style={{ flex: 1, border: '1px solid #E5E5EA', borderRadius: 8, padding: '10px 12px', fontSize: 17, outline: 'none', fontFamily: 'inherit', minWidth: 0 }}
                        />
                        {habit.unit && <span style={{ fontSize: 15, color: '#8E8E93', flexShrink: 0 }}>{habit.unit}</span>}
                      </div>
                    )}
                    {habit.type === 'time' && (
                      <input
                        type="time"
                        value={getEntry(habit.id, selectedDay)}
                        onChange={e => setEntry(habit.id, selectedDay, e.target.value)}
                        style={{ width: '100%', border: '1px solid #E5E5EA', borderRadius: 8, padding: '10px 12px', fontSize: 17, outline: 'none', fontFamily: 'inherit' }}
                      />
                    )}
                    {habit.type === 'scale' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 13 }}>
                          <span style={{ color: '#8E8E93' }}>0</span>
                          <span style={{ fontWeight: 600, color: '#1C1C1E', fontSize: 15 }}>
                            {getEntry(habit.id, selectedDay) !== '' ? `${getEntry(habit.id, selectedDay)}/10` : '—'}
                          </span>
                          <span style={{ color: '#8E8E93' }}>10</span>
                        </div>
                        <input
                          type="range"
                          min={0} max={10}
                          value={getEntry(habit.id, selectedDay) || 0}
                          onChange={e => setEntry(habit.id, selectedDay, e.target.value)}
                          style={{ width: '100%' }}
                        />
                      </div>
                    )}
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, background: '#F2F2F7', marginLeft: 16 }} />}
                </div>
              ))}

              {activeHabits.filter(h => h.type !== 'check').length > 0 && (
                <div style={{ height: 1, background: '#E5E5EA' }} />
              )}

              {/* Mood */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>Mood</div>
                <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                  {MOOD_EMOJIS.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => setMood(selectedDay, getMood(selectedDay) === i ? null : i)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 30, padding: '6px', borderRadius: 10,
                        opacity: getMood(selectedDay) === null || getMood(selectedDay) === i ? 1 : 0.25,
                        transform: getMood(selectedDay) === i ? 'scale(1.2)' : 'scale(1)',
                        transition: 'opacity 0.15s, transform 0.15s',
                      }}
                    >{emoji}</button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: '#E5E5EA' }} />

              {/* Notes */}
              <div style={{ padding: '14px 16px' }}>
                <div style={{ fontSize: 12, color: '#8E8E93', fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>Notes</div>
                <textarea
                  value={getNote(selectedDay)}
                  onChange={e => setNote(selectedDay, e.target.value)}
                  placeholder="What's on your mind today?"
                  rows={4}
                  style={{
                    width: '100%', border: '1px solid #E5E5EA', borderRadius: 8,
                    padding: '10px 12px', fontSize: 15, fontFamily: 'inherit',
                    outline: 'none', lineHeight: 1.55, color: '#1C1C1E',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Close Week Button ── */}
        <div style={{ margin: '16px 16px 40px' }}>
          {!isClosed ? (
            <button
              onClick={() => setShowCloseWeek(true)}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                border: '1.5px solid #1C1C1E', background: 'transparent',
                fontSize: 17, fontWeight: 500, cursor: 'pointer', color: '#1C1C1E', fontFamily: 'inherit',
              }}
            >Close week</button>
          ) : (
            <button
              onClick={handleReopen}
              style={{
                width: '100%', padding: '14px', borderRadius: 12,
                border: '1.5px solid #8E8E93', background: 'transparent',
                fontSize: 17, fontWeight: 500, cursor: 'pointer', color: '#8E8E93', fontFamily: 'inherit',
              }}
            >Reopen week</button>
          )}
        </div>

        {/* ── Sheets ── */}
        {showSettings && (
          <HabitManagerSheet
            habits={habitLibrary}
            weekHabitIds={weekHabitIds}
            onClose={() => setShowSettings(false)}
            onSaveHabit={saveHabit}
            onDeleteHabit={deleteHabit}
            onToggleWeekHabit={toggleWeekHabit}
          />
        )}
        {showCloseWeek && (
          <CloseWeekSheet
            weekLabel={weekLabel}
            weekData={getWeekDataForSummary()}
            onClose={() => setShowCloseWeek(false)}
            onSaveAndClose={handleSaveAndClose}
          />
        )}
      </div>
    </>
  )
}
