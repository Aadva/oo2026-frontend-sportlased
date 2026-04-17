
import { useEffect, useState } from 'react'

const PAGE_SIZE = 10

interface Sportlane {
  id: number
  nimi: string
  riik: string | null
  tulemused: number[]
}

interface Page<T> {
  content: T[]
  totalPages: number
}

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options)
  return res
}

function HomePage() {
  const [sportlased, setSportlased] = useState<Sportlane[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')
  const [riikFilter, setRiikFilter] = useState('')
  const [activeRiik, setActiveRiik] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  // Lisa sportlane vorm
  const [newNimi, setNewNimi] = useState('')
  const [newRiik, setNewRiik] = useState('')
  const [newTulemus, setNewTulemus] = useState('')
  const [addError, setAddError] = useState('')

  // Lisa tulemus modaal
  const [modalId, setModalId] = useState<number | null>(null)
  const [modalNimi, setModalNimi] = useState('')
  const [modalTulemus, setModalTulemus] = useState('')
  const [modalError, setModalError] = useState('')

  useEffect(() => {
    loadSportlased()
  }, [currentPage, sortDirection, activeRiik])

  async function loadSportlased() {
    setLoadError(false)
    const params = new URLSearchParams({
      page: String(currentPage),
      size: String(PAGE_SIZE),
      sortDirection,
    })
    if (activeRiik) params.set('riik', activeRiik)
    try {
      const res = await apiFetch('/sportlased?' + params)
      if (!res.ok) throw new Error()
      const data: Page<Sportlane> = await res.json()
      setSportlased(data.content)
      setTotalPages(data.totalPages)
    } catch {
      setLoadError(true)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    const res = await apiFetch('/sportlased', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nimi: newNimi.trim(),
        riik: newRiik.trim() || null,
        tulemus: parseInt(newTulemus, 10),
      }),
    })
    if (res.ok) {
      setNewNimi(''); setNewRiik(''); setNewTulemus('')
      setCurrentPage(0)
      loadSportlased()
    } else {
      const err = await res.json().catch(() => ({}))
      setAddError(err.detail || 'Viga sportlase lisamisel.')
    }
  }

  async function handleDelete(id: number, nimi: string) {
    if (!confirm(`Kas oled kindel, et soovid kustutada sportlase "${nimi}"?`)) return
    const res = await apiFetch(`/sportlased/${id}`, { method: 'DELETE' })
    if (res.ok) loadSportlased()
    else alert('Kustutamine ebaõnnestus.')
  }

  async function handleAddResult() {
    if (modalId === null) return
    setModalError('')
    if (modalTulemus === '') { setModalError('Tulemus on kohustuslik.'); return }
    const res = await apiFetch(`/sportlased/${modalId}/tulemused`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tulemus: parseInt(modalTulemus, 10) }),
    })
    if (res.ok) {
      setModalId(null); setModalTulemus('')
      loadSportlased()
    } else {
      const err = await res.json().catch(() => ({}))
      setModalError(err.detail || 'Viga tulemuse lisamisel.')
    }
  }

  function applyFilter() {
    setActiveRiik(riikFilter.trim() || null)
    setCurrentPage(0)
  }

  function clearFilter() {
    setRiikFilter('')
    setActiveRiik(null)
    setCurrentPage(0)
  }

  function toggleSort() {
    setSortDirection(d => d === 'desc' ? 'asc' : 'desc')
    setCurrentPage(0)
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem', fontFamily: 'sans-serif' }}>
      <h1>🏅 Kümnevõistlus</h1>

      {/* Lisa sportlane */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Lisa sportlane</h3>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            placeholder="Nimi *"
            value={newNimi}
            onChange={e => setNewNimi(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            placeholder="Riik (nt EST)"
            value={newRiik}
            onChange={e => setNewRiik(e.target.value)}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="Esimene tulemus *"
            value={newTulemus}
            onChange={e => setNewTulemus(e.target.value)}
            min={0}
            required
            style={{ ...inputStyle, width: 160 }}
          />
          <button type="submit" style={btnStyle('#2563eb')}>Lisa</button>
        </form>
        {addError && <p style={{ color: 'red', margin: '8px 0 0' }}>{addError}</p>}
      </div>

      {/* Filter + sort */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
        <input
          placeholder="Filtreeri riigi järgi"
          value={riikFilter}
          onChange={e => setRiikFilter(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && applyFilter()}
          style={inputStyle}
        />
        <button onClick={applyFilter} style={btnStyle('#374151')}>Filtreeri</button>
        {activeRiik && (
          <button onClick={clearFilter} style={btnStyle('#dc2626')}>✕ Tühista filter</button>
        )}
        <button onClick={toggleSort} style={btnStyle('#0891b2')}>
          {sortDirection === 'desc' ? '▼ Tulemus (kahanev)' : '▲ Tulemus (kasvav)'}
        </button>
      </div>

      {/* Tabel */}
      {loadError ? (
        <p style={{ color: 'red' }}>Andmete laadimine ebaõnnestus.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#1e293b', color: '#fff' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Nimi</th>
              <th style={thStyle}>Riik</th>
              <th style={thStyle}>Tulemused</th>
              <th style={thStyle}>Kogusumma</th>
              <th style={thStyle}>Tegevused</th>
            </tr>
          </thead>
          <tbody>
            {sportlased.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 16, color: '#888' }}>Sportlasi ei leitud.</td></tr>
            ) : sportlased.map((s, i) => {
              const summa = s.tulemused.reduce((a, b) => a + b, 0)
              return (
                <tr key={s.id} style={{ background: i % 2 === 0 ? '#f8fafc' : '#fff' }}>
                  <td style={tdStyle}>{s.id}</td>
                  <td style={tdStyle}>{s.nimi}</td>
                  <td style={tdStyle}>{s.riik ?? '—'}</td>
                  <td style={{ ...tdStyle, color: '#64748b', fontSize: 12 }}>{s.tulemused.join(', ') || '—'}</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold' }}>{summa}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => { setModalId(s.id); setModalNimi(s.nimi); setModalTulemus(''); setModalError('') }}
                      style={{ ...btnStyle('#16a34a'), marginRight: 4 }}
                    >+ Tulemus</button>
                    <button onClick={() => handleDelete(s.id, s.nimi)} style={btnStyle('#dc2626')}>Kustuta</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 16 }}>
          <button disabled={currentPage === 0} onClick={() => setCurrentPage(p => p - 1)} style={pageBtn(false)}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setCurrentPage(i)} style={pageBtn(i === currentPage)}>{i + 1}</button>
          ))}
          <button disabled={currentPage === totalPages - 1} onClick={() => setCurrentPage(p => p + 1)} style={pageBtn(false)}>›</button>
        </div>
      )}

      {/* Lisa tulemus modaal */}
      {modalId !== null && (
        <div style={overlayStyle} onClick={() => setModalId(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Lisa tulemus</h3>
            <p style={{ fontWeight: 'bold' }}>{modalNimi}</p>
            <input
              type="number"
              placeholder="Tulemus"
              value={modalTulemus}
              onChange={e => setModalTulemus(e.target.value)}
              min={0}
              autoFocus
              style={{ ...inputStyle, width: '100%', marginBottom: 8 }}
            />
            {modalError && <p style={{ color: 'red', margin: '0 0 8px' }}>{modalError}</p>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setModalId(null)} style={btnStyle('#6b7280')}>Tühista</button>
              <button onClick={handleAddResult} style={btnStyle('#2563eb')}>Salvesta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Styles
const cardStyle: React.CSSProperties = {
  background: '#f1f5f9', borderRadius: 8, padding: '1rem', marginBottom: 16,
}
const inputStyle: React.CSSProperties = {
  padding: '6px 10px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 14, flex: 1, minWidth: 140,
}
const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontWeight: 600 }
const tdStyle: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid #e2e8f0' }
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
}
const modalStyle: React.CSSProperties = {
  background: '#fff', borderRadius: 10, padding: '1.5rem', minWidth: 320, maxWidth: 420, width: '100%',
}
function btnStyle(bg: string): React.CSSProperties {
  return { background: bg, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontSize: 14 }
}
function pageBtn(active: boolean): React.CSSProperties {
  return { padding: '4px 10px', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', background: active ? '#1e293b' : '#fff', color: active ? '#fff' : '#374151', fontWeight: active ? 'bold' : 'normal' }
}

export default HomePage