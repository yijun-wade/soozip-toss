import { useState, useRef, useEffect } from 'react'

const API = 'https://www.suzip.kr'

const HINTS = ['반포자이', '마포래미안푸르지오', '잠실엘스', '은마아파트', '망원동', '성수동']

const CAT_ICON = { 교통: '🚇', 학군: '📚', 분위기: '🏘️', 이슈: '📣' }

export default function App() {
  const [query, setQuery]           = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSugg, setShowSugg]     = useState(false)
  const [result, setResult]         = useState(null)   // { aptNm, location, vibe, stories }
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  const inputRef   = useRef(null)
  const debounceRef = useRef(null)
  const abortRef   = useRef(null)

  // 자동완성
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 1) { setSuggestions([]); setShowSugg(false); return }
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const res = await fetch(`${API}/api/search?q=${encodeURIComponent(query)}`, { signal: ctrl.signal })
        .then(r => r.json()).catch(e => e.name === 'AbortError' ? null : [])
      if (res !== null) {
        setSuggestions(Array.isArray(res) ? res.slice(0, 6) : [])
        setShowSugg(true)
      }
    }, 200)
  }, [query])

  async function handleSearch(aptName, locationHint = '') {
    if (!aptName.trim()) return
    setShowSugg(false)
    setSuggestions([])
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // 검색으로 단지 정보 확인
      const searchRes = await fetch(`${API}/api/search?q=${encodeURIComponent(aptName)}`)
        .then(r => r.json()).catch(() => [])
      const apt = Array.isArray(searchRes) && searchRes.length > 0 ? searchRes[0] : null
      const dong = apt?.addr?.split(' ').find(p => p.endsWith('동') || p.endsWith('읍')) || locationHint || ''
      const displayName = apt?.kaptName || aptName
      const location = apt?.addr?.split(' ').slice(1, 4).join(' ') || ''

      // vibe + stories 병렬 호출
      const [vibeRes, storiesRes] = await Promise.all([
        fetch(`${API}/api/vibe?aptName=${encodeURIComponent(displayName)}&location=${encodeURIComponent(dong)}`)
          .then(r => r.json()).catch(() => null),
        fetch(`${API}/api/stories?aptName=${encodeURIComponent(displayName)}&location=${encodeURIComponent(dong)}`)
          .then(r => r.json()).catch(() => []),
      ])

      setResult({
        aptNm: displayName,
        location,
        vibe: vibeRes,
        stories: Array.isArray(storiesRes) ? storiesRes.slice(0, 5) : [],
      })
    } catch {
      setError('정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    setResult(null)
    setQuery('')
    setError(null)
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // 결과 화면
  if (result) {
    return (
      <div className="screen">
        <header className="result-header">
          <button className="back-btn" onClick={handleBack}>←</button>
          <div className="result-header-info">
            <div className="result-apt-name">{result.aptNm}</div>
            {result.location && <div className="result-apt-loc">{result.location}</div>}
          </div>
        </header>

        <div className="result-body">
          {/* 수근수근 */}
          <div className="vibe-section">
            <div className="section-badge">수근수근</div>

            {result.vibe?.summary && (
              <div className="vibe-summary">{result.vibe.summary}</div>
            )}

            {result.vibe?.categories?.filter(c => c.lines.length > 0).map(cat => (
              <div key={cat.label} className="vibe-row">
                <div className="vibe-row-label">
                  <span className="vibe-row-icon">{CAT_ICON[cat.label] || '💬'}</span>
                  <span>{cat.label}</span>
                </div>
                <div className="vibe-row-lines">
                  {cat.lines.map((line, i) => (
                    <p key={i} className="vibe-line">"{line}"</p>
                  ))}
                </div>
              </div>
            ))}

            {!result.vibe?.categories?.some(c => c.lines.length > 0) && (
              <div className="empty-text">아직 소문이 없네요</div>
            )}
          </div>

          {/* 블로그 후기 */}
          {result.stories.length > 0 && (
            <div className="stories-section">
              <div className="section-label">블로그 · 카페 후기</div>
              {result.stories.map((s, i) => (
                <a key={i} className="story-item" href={s.link} target="_blank" rel="noopener noreferrer">
                  <div className="story-title">{s.title}</div>
                  {s.description && <div className="story-desc">{s.description}</div>}
                  <div className="story-meta">{s.source}{s.date ? ` · ${s.date}` : ''}</div>
                </a>
              ))}
            </div>
          )}

          <p className="disclaimer">인터넷 정보를 AI가 요약한 내용이에요. 직접 임장해보는 게 제일 정확해요.</p>
        </div>
      </div>
    )
  }

  // 홈 화면
  return (
    <div className="screen screen-home">
      <div className="home-hero">
        <div className="home-logo">수근수근</div>
        <div className="home-sub">마음에 둔 아파트,<br />동네 소문 모아드려요</div>
      </div>

      <div className="search-wrap">
        <div className="search-box">
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="아파트 이름으로 검색해봐요"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setShowSugg(false); handleSearch(query) } }}
            autoComplete="off"
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); setSuggestions([]); setShowSugg(false) }}>×</button>
          )}
        </div>
        <button className="search-btn" onClick={() => handleSearch(query)}>검색</button>

        {showSugg && suggestions.length > 0 && (
          <ul className="sugg-list">
            {suggestions.map(apt => (
              <li key={apt.kaptCode} className="sugg-item"
                onPointerDown={e => { e.preventDefault(); setQuery(apt.kaptName); handleSearch(apt.kaptName) }}>
                <span className="sugg-name">{apt.kaptName}</span>
                <span className="sugg-addr">{apt.addr?.split(' ').slice(1, 4).join(' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-msg">소문 수집 중이에요...</div>}

      <div className="hints">
        {HINTS.map(h => (
          <button key={h} className="hint-chip" onClick={() => { setQuery(h); handleSearch(h) }}>{h}</button>
        ))}
      </div>
    </div>
  )
}
