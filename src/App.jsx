import { useState, useRef, useEffect, useCallback } from 'react'
import { loadFullScreenAd, showFullScreenAd, IAP } from '@apps-in-toss/web-framework'

const API = 'https://www.suzip.kr'
const AD_GROUP_ID = 'ait.v2.live.846d3662c7f949e6'
const SAJU_SKU = 'ait.0000028855.611ca6b3.397b5483ea.7384409555'

const HINTS = ['망원동', '성수동', '연남동', '잠실동', '한남동', '분당구']
const CAT_ICON = { 교통: '🚇', 학군: '📚', 분위기: '🏘️', 이슈: '📣' }

// 년간·년지 계산
const CHEONGAN    = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const CHEONGAN_KO = ['갑목','을목','병화','정화','무토','기토','경금','신금','임수','계수']
const JIJI        = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
const OHAENG_KO_MAP = { '甲':'목','乙':'목','丙':'화','丁':'화','戊':'토','己':'토','庚':'금','辛':'금','壬':'수','癸':'수' }

function getYearGan(year) { return CHEONGAN[(year - 4 + 4000) % 10] }
function getYearJi(year)  { return JIJI[(year - 4 + 4000) % 12] }

// 타임아웃 포함 fetch
async function fetchWithTimeout(url, ms = 55000) {
  const ctrl = new AbortController()
  const tid  = setTimeout(() => ctrl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    clearTimeout(tid)
    return r.json()
  } catch (e) {
    clearTimeout(tid)
    if (e.name === 'AbortError') throw new Error('서버가 잠시 바빠요. 잠시 후 다시 시도해주세요.')
    throw e
  }
}

// AI 고지 모달
function AiNotice({ onConfirm }) {
  return (
    <div className="notice-overlay">
      <div className="notice-sheet">
        <div className="notice-icon">🤖</div>
        <div className="notice-title">AI가 요약한 동네 이야기예요</div>
        <p className="notice-body">
          이 서비스는 인터넷(블로그·카페·뉴스)에 올라온 글을 AI가 자동으로 수집·요약해요.
          실제 사실과 다를 수 있으니 참고용으로만 활용해주세요.
        </p>
        <button className="notice-btn" onClick={onConfirm}>확인했어요</button>
      </div>
    </div>
  )
}

// ── 사주 입력 화면 ──────────────────────────────────────
function SajuInput({ onBack, onPreview }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear]     = useState('')
  const [month, setMonth]   = useState('')
  const [day, setDay]       = useState('')
  const [si, setSi]         = useState('')
  const [gender, setGender] = useState('male')

  const SI_LIST = [
    { value: '자', label: '자시 (23:00~01:00)' },
    { value: '축', label: '축시 (01:00~03:00)' },
    { value: '인', label: '인시 (03:00~05:00)' },
    { value: '묘', label: '묘시 (05:00~07:00)' },
    { value: '진', label: '진시 (07:00~09:00)' },
    { value: '사', label: '사시 (09:00~11:00)' },
    { value: '오', label: '오시 (11:00~13:00)' },
    { value: '미', label: '미시 (13:00~15:00)' },
    { value: '신', label: '신시 (15:00~17:00)' },
    { value: '유', label: '유시 (17:00~19:00)' },
    { value: '술', label: '술시 (19:00~21:00)' },
    { value: '해', label: '해시 (21:00~23:00)' },
  ]

  const years  = Array.from({ length: 80 }, (_, i) => currentYear - 15 - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days   = Array.from({ length: 31 }, (_, i) => i + 1)

  const canSubmit = year && month && day

  function handleSubmit() {
    if (!canSubmit) return
    const yearGan = getYearGan(Number(year))
    onPreview({ year, month, day, si, gender, yearGan })
  }

  return (
    <div className="screen saju-screen">
      <div className="saju-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="saju-header-title">사주 지역 궁합</div>
      </div>

      <div className="saju-form-group">
        <div className="saju-form-label">생년월일</div>
        <div className="saju-row">
          <select className="saju-select" value={year} onChange={e => setYear(e.target.value)}>
            <option value="">년도</option>
            {years.map(y => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select className="saju-select" value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">월</option>
            {months.map(m => <option key={m} value={m}>{m}월</option>)}
          </select>
          <select className="saju-select" value={day} onChange={e => setDay(e.target.value)}>
            <option value="">일</option>
            {days.map(d => <option key={d} value={d}>{d}일</option>)}
          </select>
        </div>
      </div>

      <div className="saju-form-group">
        <div className="saju-form-label">태어난 시 (모르면 건너뛰어도 돼요)</div>
        <select className="saju-select" style={{ width: '100%' }} value={si} onChange={e => setSi(e.target.value)}>
          <option value="">시 모름</option>
          {SI_LIST.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      <div className="saju-form-group">
        <div className="saju-form-label">성별</div>
        <div className="gender-row">
          <button className={`gender-btn ${gender === 'male' ? 'active' : ''}`} onClick={() => setGender('male')}>남성</button>
          <button className={`gender-btn ${gender === 'female' ? 'active' : ''}`} onClick={() => setGender('female')}>여성</button>
        </div>
      </div>

      <button className="saju-cta-btn" disabled={!canSubmit} onClick={handleSubmit}>
        내 사주 확인하기
      </button>

      {/* 훅킹 포인트: 샘플 미리보기 */}
      <div style={{ marginTop: 28, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text2)', marginBottom: 14, textAlign: 'center', letterSpacing: '0.05em' }}>
          이런 결과가 나와요 (샘플)
        </div>

        {/* 샘플 카드 */}
        <div style={{ border: '1.5px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>

          {/* 사주 분석 요약 */}
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#fff' }}>甲木</div>
              <div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>신강 · 용신 水</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>
                  木이 과다해 水로 설기해야 균형
                </div>
              </div>
              <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 12px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>타이밍</div>
                <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', textAlign: 'center' }}>88점</div>
              </div>
            </div>
          </div>

          {/* 1순위 지역 상세 */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: 'var(--text2)' }}>1순위</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)' }}>마포구</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--blue)', marginLeft: 'auto' }}>95점</span>
            </div>
            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 700, marginBottom: 6 }}>
              麻浦(마포) — 浦자에 水변, 한강 포구의 물기운
            </div>
            <div style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8 }}>
              甲木에게 水는 자식 오행이자 에너지 순환 통로. 한강이 옆에 있으면 과도한 목기가 자연스럽게 흘러내려 일상 속 답답함이 해소됨
            </div>
            {/* 점수 breakdown 미니 */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[['오행궁합','#2563eb',24],['지명오행','#7c3aed',23],['지형','#0891b2',24],['생활','#16a34a',24]].map(([label, color, score]) => (
                <div key={label} style={{ flex: 1, background: color+'12', borderRadius: 8, padding: '4px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: color, fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: color }}>{score}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 나머지 지역 블러 */}
          <div style={{ padding: '10px 16px', display: 'flex', gap: 8, filter: 'blur(3px)', pointerEvents: 'none' }}>
            {['용산구 85점', '영등포구 76점'].map(t => (
              <div key={t} style={{ flex: 1, background: 'var(--bg)', borderRadius: 10, padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--text2)', textAlign: 'center' }}>{t}</div>
            ))}
          </div>

          {/* 더 보기 */}
          <div style={{ padding: '8px 16px 12px', background: 'var(--bg)', fontSize: 11, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.6 }}>
            + 대운·세운 · 각 지역 지형·생활 에너지 분석 · 궁합 아파트 목록 · 주의 시기
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text2)', marginTop: 10 }}>
          내 사주로 분석하면 결과가 달라져요
        </div>
      </div>
    </div>
  )
}

// ── 사주 미리보기 (분석 시작 전) ──────────────────────────────
function SajuPreview({ birthData, onBack, onResult }) {
  const [paying, setPaying]   = useState(false)
  const [error, setError]     = useState(null)
  const [countdown, setCountdown] = useState(null)
  const adReadyRef = useRef(false)

  const { year, month, day, si, gender, yearGan } = birthData
  const ohaeng  = OHAENG_KO_MAP[yearGan] || ''
  const ganName = CHEONGAN_KO[CHEONGAN.indexOf(yearGan)] || ''
  const yearJi  = getYearJi(Number(year))

  const DUMMY_REGIONS = ['마포구', '용산구', '성동구']

  // 진입 시 전면광고 미리 로드 (분석 시작 시 즉시 표시 가능하도록)
  useEffect(() => {
    loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (d) => { if (d.type === 'loaded') adReadyRef.current = true },
      onError: () => {},
    })
  }, [])

  // 카운트다운 타이머 — fetchWithTimeout(55s)가 먼저 에러 처리하도록 58초로 여유 둠
  useEffect(() => {
    if (!paying) { setCountdown(null); return }
    setCountdown(58)
    const iv = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(iv)
          setPaying(false)
          setError('서버가 잠시 바빠요. 잠시 후 다시 시도해주세요.')
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(iv)
  }, [paying])

  async function handlePay() {
    setPaying(true)
    setError(null)

    // IAP 미지원 환경 모두 bypass — 토스 앱 webview 포함
    // .ait 로컬 번들은 hostname이 '' 또는 localhost일 수 있음
    const h = location.hostname
    const isDev = !h
      || h === 'localhost'
      || h === '127.0.0.1'
      || h.includes('vercel.app')
      || h.includes('toss.im')
      || h.includes('sugunsugun')

    if (isDev) {
      // 분석 시작과 동시에 전면광고 노출 — 대기 시간을 광고로 채움
      if (adReadyRef.current) {
        showFullScreenAd({ options: { adGroupId: AD_GROUP_ID }, onEvent: () => {}, onError: () => {} })
        adReadyRef.current = false
      }
      try {
        const res = await fetchWithTimeout(
          `${API}/api/saju?year=${year}&month=${month}&day=${day}&si=${si || ''}&gender=${gender}`
        )
        if (res.error) { setError(res.error); return }
        onResult(res)
      } catch (e) {
        setError(e.message || '분석 중 오류가 발생했어요. 다시 시도해주세요.')
      } finally {
        setPaying(false)
      }
      return
    }

    // 토스 앱 환경: IAP 결제 후 API 호출
    IAP.createOneTimePurchaseOrder({
      sku: SAJU_SKU,
      processProductGrant: async ({ orderId }) => {
        try {
          const res = await fetchWithTimeout(
            `${API}/api/saju?year=${year}&month=${month}&day=${day}&si=${si || ''}&gender=${gender}&orderId=${orderId}`
          )
          if (res.error) {
            setError('분석 중 오류가 발생했어요. 다시 시도해주세요.')
            return false
          }
          onResult(res)
          return true
        } catch (e) {
          setError(e.message || '오류가 발생했어요. 다시 시도해주세요.')
          return false
        } finally {
          setPaying(false)
        }
      },
      onError: () => {
        setError('결제 중 오류가 발생했어요. 다시 시도해주세요.')
        setPaying(false)
      },
    })
  }

  return (
    <div className="screen saju-screen">
      <div className="saju-header">
        <button className="back-btn" onClick={onBack}>←</button>
        <div className="saju-header-title">내 사주 미리보기</div>
      </div>

      <div className="saju-preview-card">
        <div className="saju-ilgan-label">{year}년생 · 사주 원국</div>
        <div className="saju-ilgan">{yearGan}{yearJi}</div>
        <div className="saju-ilgan-sub">{ganName} · {ohaeng} 기운</div>

        {/* 원국 4주 표 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'center' }}>
          {[
            { label: '年柱', gan: yearGan, ji: yearJi, free: true },
            { label: '月柱', gan: '?', ji: '?', free: false },
            { label: '日柱', gan: '?', ji: '?', free: false },
            { label: '時柱', gan: '?', ji: '?', free: false },
          ].map(col => (
            <div key={col.label} style={{
              flex: 1, background: col.free ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.06)',
              borderRadius: 10, padding: '10px 4px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 6 }}>{col.label}</div>
              <div style={{ fontSize: col.free ? 22 : 18, fontWeight: 900, color: col.free ? '#fff' : 'rgba(255,255,255,0.25)', lineHeight: 1.3 }}>
                {col.gan}
              </div>
              <div style={{ fontSize: col.free ? 20 : 16, fontWeight: 700, color: col.free ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                {col.ji}
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
          월·일·시주는 전체 분석에서 확인돼요
        </div>
      </div>

      <div className="saju-blur-section">
        <div className="saju-blur-title">궁합 지역 Top 3</div>
        <div className="saju-blur-rows">
          {DUMMY_REGIONS.map((gu, i) => (
            <div key={gu} className="saju-blur-row">
              <span className="saju-blur-gu">{i + 1}위 {gu}</span>
              <span className="saju-blur-score">{95 - i * 6}점</span>
            </div>
          ))}
        </div>
        <div className="saju-blur-overlay">
          <div className="saju-blur-lock">🔒</div>
          <div className="saju-blur-msg">분석하면 확인할 수 있어요</div>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: '12px 16px', background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
          <div style={{ fontSize: 13, color: '#DC2626', fontWeight: 700, marginBottom: 6 }}>{error}</div>
          <button
            onClick={() => { setError(null); handlePay() }}
            style={{ fontSize: 13, color: '#DC2626', background: 'none', border: '1px solid #FCA5A5', borderRadius: 8, padding: '6px 14px', fontFamily: 'inherit', cursor: 'pointer', fontWeight: 600 }}
          >
            다시 시도
          </button>
        </div>
      )}

      {paying && countdown !== null && (
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: 'var(--blue-lt)', borderRadius: 40,
            padding: '10px 20px',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--blue)', color: '#fff',
              fontSize: 15, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              {countdown}
            </div>
            <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 700 }}>
              AI가 사주를 분석하고 있어요
            </span>
          </div>
        </div>
      )}

      <button className="saju-pay-btn" onClick={handlePay} disabled={paying}>
        {paying
          ? `분석 중... (${countdown ?? ''}초)`
          : '광고 보고 무료로 분석받기'}
      </button>
      <div className="saju-pay-note">
        광고 시청 후 추천 지역 Top 3 · 용신 해석 · 궁합 아파트 결과 제공
      </div>
    </div>
  )
}

// ── 섹션 카드 공통 ──────────────────────────────────────
function SectionCard({ label, children, accent }) {
  return (
    <div style={{ border: `1.5px solid ${accent ? accent + '40' : 'var(--border)'}`, borderRadius: 16, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '10px 16px', background: accent ? accent + '12' : 'var(--bg)', fontSize: 12, fontWeight: 800, color: accent || 'var(--text2)', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ padding: '14px 16px', background: '#fff' }}>{children}</div>
    </div>
  )
}

function InfoRow({ label, value, sub }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 13, color: 'var(--text2)', flexShrink: 0, marginRight: 12 }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2, lineHeight: 1.5 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── 사주 결과 화면 ──────────────────────────────────────
function SajuResult({ result, onBack }) {
  const s = result.saju || {}
  const t = result.timing || {}

  return (
    <div className="screen" style={{ paddingBottom: 48 }}>
      <div className="saju-result-hero">
        <div className="saju-result-ilgan">{result.ilgan}</div>
        <div className="saju-result-yong">{s.sinkang || ''} · 용신 {s.yongshin || result.yongshin}</div>
        <div className="saju-result-summary">{result.summary}</div>
      </div>

      <div style={{ padding: '16px 20px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="back-btn" style={{ padding: 0 }} onClick={onBack}>←</button>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>사주 지역 궁합 리포트</span>
      </div>

      <div style={{ padding: '0 16px' }}>

        {result.fourPillars && (
          <SectionCard label="사주 원국 (만세력 계산)" accent="#1e3a8a">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {[
                ['년주', result.fourPillars.year],
                ['월주', result.fourPillars.month],
                ['일주', result.fourPillars.day],
                ['시주', result.fourPillars.hour || '—'],
              ].map(([label, val]) => (
                <div key={label} style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1e3a8a', letterSpacing: 1 }}>
                    {val?.split(' ')[0]}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text2)' }}>{val?.match(/\(([^)]+)\)/)?.[1] || ''}</div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        <SectionCard label="사주 분석" accent="#2563eb">
          <InfoRow label="오행 분포" value={s.ohaengDist || '—'} />
          <InfoRow label="신강·신약" value={s.sinkang || '—'} sub={s.sinkangReason} />
          <InfoRow label="용신" value={s.yongshin || result.yongshin || '—'} sub={s.yongShinReason} />
        </SectionCard>

        {(s.daewon || s.sewon) && (
          <SectionCard label="현재 대운·세운 흐름" accent="#7c3aed">
            {s.daewon && <InfoRow label="대운" value={s.daewon} sub={s.daewonDesc} />}
            {s.sewon && <InfoRow label="세운" value={s.sewon} sub={s.sewonDesc} />}
          </SectionCard>
        )}

        {t.reason && (
          <SectionCard label="지금 이사·계약 타이밍" accent={t.isGoodYear ? '#16a34a' : '#dc2626'}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{t.isGoodYear ? '✅' : '⚠️'}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: t.isGoodYear ? '#16a34a' : '#dc2626' }}>
                {t.isGoodYear ? '좋은 타이밍이에요' : '신중하게 접근하세요'}
              </span>
              {t.timingScore && <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 800, color: '#2563eb' }}>{t.timingScore}점</span>}
            </div>
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7 }}>{t.reason}</p>
            {t.bestMonths && <p style={{ fontSize: 12, color: 'var(--text2)', marginTop: 8 }}>추천 시기: {t.bestMonths}</p>}
          </SectionCard>
        )}

        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text2)', marginBottom: 10, marginTop: 4 }}>궁합 지역 TOP 3</div>

        {(result.regions || []).map((region, i) => {
          const sb = region.scoreBreakdown || {}
          const SCORE_LABELS = {
            ohaengMatch:  { label: '오행 궁합', color: '#2563eb' },
            jimingOhaeng: { label: '지명 오행', color: '#7c3aed' },
            landscape:    { label: '지형 에너지', color: '#0891b2' },
            lifeEnergy:   { label: '생활 에너지', color: '#16a34a' },
          }
          return (
            <div key={region.gu} className="saju-region-card" style={{ marginBottom: 14 }}>
              {/* 헤더 */}
              <div className="saju-region-top">
                <div>
                  <span style={{ fontSize: 11, color: 'var(--text2)', marginRight: 6 }}>{i + 1}순위</span>
                  <span className="saju-region-name">{region.gu}</span>
                </div>
                <div className="saju-region-score">{region.score}점</div>
              </div>

              {/* 지명 */}
              {region.jiming && (
                <div style={{ padding: '8px 18px 12px', fontSize: 12, color: '#7c3aed', fontWeight: 700 }}>
                  {region.jiming}
                </div>
              )}

              {/* 왜 이 동네인가 */}
              {region.whyThisGu && (
                <div style={{ padding: '0 18px 14px', fontSize: 13, color: 'var(--text)', lineHeight: 1.7, borderBottom: '1px solid var(--border)' }}>
                  {region.whyThisGu}
                </div>
              )}

              {/* 점수 breakdown */}
              {Object.keys(sb).length > 0 && (
                <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(sb).map(([key, val]) => {
                    const meta = SCORE_LABELS[key] || { label: key, color: 'var(--blue)' }
                    return (
                      <div key={key}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: meta.color, background: meta.color + '18', padding: '2px 8px', borderRadius: 8 }}>
                            {meta.label}
                          </span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: meta.color, marginLeft: 'auto' }}>
                            {val.score}점
                          </span>
                        </div>
                        {val.reason && (
                          <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.65 }}>{val.reason}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* 일상 에너지 */}
              {region.dailyLife && (
                <div style={{ padding: '0 18px 12px', borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text2)', marginBottom: 4 }}>일상 에너지</div>
                  <p style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.65 }}>{region.dailyLife}</p>
                </div>
              )}

              {/* vs 비교 */}
              {region.vsOther && (
                <div style={{ padding: '0 18px 12px', fontSize: 11, color: 'var(--text2)', fontStyle: 'italic' }}>
                  {region.vsOther}
                </div>
              )}

              {/* 아파트 */}
              {region.apts?.length > 0 && (
                <div className="saju-apt-list">
                  {region.apts.slice(0, 3).map(apt => (
                    <div key={apt.name} className="saju-apt-item">
                      <div>
                        <div className="saju-apt-name">{apt.name}</div>
                        <div className="saju-apt-info">{apt.dong} · {apt.year}년 · {apt.units?.toLocaleString()}세대</div>
                      </div>
                      <div className="saju-apt-price">{apt.avg}억</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {result.regionComparison && (
          <SectionCard label="지역별 비교 요약" accent="#0891b2">
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.75 }}>{result.regionComparison}</p>
          </SectionCard>
        )}

        {result.warning?.reason && (
          <SectionCard label={`⚠️ 주의 시기 — ${result.warning.year}`} accent="#dc2626">
            <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.7, marginBottom: 8 }}>{result.warning.reason}</p>
            <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 700, lineHeight: 1.6 }}>대비 전략: {result.warning.action}</p>
          </SectionCard>
        )}

        {result.finalVerdict && (
          <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', borderRadius: 16, padding: '20px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.7)', marginBottom: 10, letterSpacing: '0.05em' }}>최종 판단</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.75 }}>{result.finalVerdict}</p>
          </div>
        )}

        <button className="saju-suzip-btn" style={{ width: '100%', margin: '4px 0 14px' }} onClick={() => window.open('https://suzip.kr', '_blank')}>
          suzip.kr에서 단지 상세 보기 →
        </button>

        <p className="disclaimer">
          사주명리학을 기반으로 AI가 분석한 참고 자료예요.{'\n'}
          실제 부동산 결정은 전문가 상담을 병행하세요.
        </p>
      </div>
    </div>
  )
}

// ── 딥링크 → 초기 화면 매핑 ─────────────────────────────
// 토스 푸시·앱인토스 광고에서 intoss://sugunsugun/<screenName>으로 진입 시
// pathname / hash / query 어느 형식이든 대응
const SCREEN_MAP = {
  'saju':         'saju-input',
  'saju-input':   'saju-input',
  'home':         'home',
  '':             'home',
}
function getInitialView() {
  try {
    const path = (window.location.pathname || '').replace(/^\/+|\/+$/g, '').toLowerCase()
    if (SCREEN_MAP[path] !== undefined) return SCREEN_MAP[path]
    const hash = (window.location.hash || '').replace(/^#\/?/, '').toLowerCase()
    if (SCREEN_MAP[hash] !== undefined) return SCREEN_MAP[hash]
    const screen = new URLSearchParams(window.location.search).get('screen')?.toLowerCase()
    if (screen && SCREEN_MAP[screen] !== undefined) return SCREEN_MAP[screen]
  } catch {}
  return 'home'
}

// ── 메인 앱 ─────────────────────────────────────────────
export default function App() {
  const [view, setView]           = useState(getInitialView) // home | saju-input | saju-preview | saju-result
  const [query, setQuery]         = useState('')
  const [suggestions, setSugg]    = useState([])
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState(null)
  const [sajuBirth, setSajuBirth] = useState(null)
  const [sajuResult, setSajuResult] = useState(null)
  const [showNotice, setShowNotice] = useState(() => {
    try { return !localStorage.getItem('soozip-ai-noticed') } catch { return true }
  })

  const inputRef    = useRef(null)
  const debounceRef = useRef(null)
  const adReadyRef  = useRef(false)

  useEffect(() => {
    loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (d) => { if (d.type === 'loaded') adReadyRef.current = true },
      onError: () => {},
    })
  }, [])

  function handleNoticeConfirm() {
    try { localStorage.setItem('soozip-ai-noticed', '1') } catch {}
    setShowNotice(false)
  }

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 1) { setSugg([]); return }
    const q = query
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`).then(r => r.json())
        setSugg(Array.isArray(res) ? res.slice(0, 6) : [])
      } catch {}
    }, 300)
  }, [query])

  async function handleSearch(name, dong = '') {
    const q = name.trim()
    if (!q) return
    setSugg([])
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      let neighborhood = dong
      if (!neighborhood) {
        const searchRes = await fetch(`${API}/api/search?q=${encodeURIComponent(q)}`).then(r => r.json()).catch(() => [])
        const apt = Array.isArray(searchRes) && searchRes.length > 0 ? searchRes[0] : null
        neighborhood = apt?.addr?.split(' ').find(p => p.endsWith('동') || p.endsWith('읍') || p.endsWith('면')) || q
      }
      const vibeRes = await fetch(
        `${API}/api/vibe?aptName=${encodeURIComponent(q)}&location=${encodeURIComponent(neighborhood)}`
      ).then(r => r.json()).catch(() => null)

      setResult({ neighborhood, vibe: vibeRes })

      if (adReadyRef.current) {
        showFullScreenAd({ options: { adGroupId: AD_GROUP_ID }, onEvent: () => {}, onError: () => {} })
        adReadyRef.current = false
      }
    } catch {
      setError('이야기를 불러오지 못했어요. 잠시 후 다시 시도해주세요.')
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

  // ── 사주 화면 분기 ──
  if (view === 'saju-input') {
    return (
      <SajuInput
        onBack={() => setView('home')}
        onPreview={(birth) => { setSajuBirth(birth); setView('saju-preview') }}
      />
    )
  }
  if (view === 'saju-preview' && sajuBirth) {
    return (
      <SajuPreview
        birthData={sajuBirth}
        onBack={() => setView('saju-input')}
        onResult={(res) => { setSajuResult(res); setView('saju-result') }}
      />
    )
  }
  if (view === 'saju-result' && sajuResult) {
    return (
      <SajuResult
        result={sajuResult}
        onBack={() => setView('home')}
      />
    )
  }

  // ── 동네 결과 화면 ──
  if (result) {
    return (
      <div className="screen">
        {showNotice && <AiNotice onConfirm={handleNoticeConfirm} />}
        <header className="result-header">
          <button className="back-btn" onClick={handleBack}>←</button>
          <div className="result-header-info">
            <div className="result-apt-name">{result.neighborhood} 수군수군</div>
            <div className="result-apt-loc">동네 사람들의 이야기</div>
          </div>
        </header>

        <div className="result-body">
          <div className="vibe-section">
            <div className="ai-badge-row">
              <span className="section-badge">수군수군</span>
              <span className="ai-label">AI 자동 요약</span>
            </div>
            {result.vibe?.summary && <div className="vibe-summary">{result.vibe.summary}</div>}
            {result.vibe?.categories?.filter(c => c.lines.length > 0).map(cat => (
              <div key={cat.label} className="vibe-row">
                <div className="vibe-row-label">
                  <span className="vibe-row-icon">{CAT_ICON[cat.label] || '💬'}</span>
                  <span>{cat.label}</span>
                </div>
                <div className="vibe-row-lines">
                  {cat.lines.map((line, i) => <p key={i} className="vibe-line">"{line}"</p>)}
                </div>
              </div>
            ))}
            {!result.vibe?.categories?.some(c => c.lines.length > 0) && (
              <div className="empty-text">아직 이야기가 없네요</div>
            )}
          </div>
          <p className="disclaimer">
            위 내용은 AI가 인터넷 글을 자동 수집·요약한 결과예요.{'\n'}
            실제 사실과 다를 수 있으며 생활 참고용으로만 활용해주세요.
          </p>
        </div>
      </div>
    )
  }

  // ── 홈 화면 ──
  return (
    <div className="screen screen-home">
      {showNotice && <AiNotice onConfirm={handleNoticeConfirm} />}

      <div className="home-hero">
        <div className="home-logo">수군수군 우리동네</div>
        <div className="home-sub">우리 동네, 사람들은<br />뭐라고 수군거릴까?</div>
      </div>

      <div className="search-wrap">
        <div className="search-box">
          <input
            ref={inputRef}
            className="search-input"
            type="text"
            placeholder="동네나 아파트 이름으로 검색해봐요"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onInput={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSugg([]); handleSearch(query) } }}
            autoComplete="off"
          />
          {query && <button className="search-clear" onClick={() => { setQuery(''); setSugg([]) }}>×</button>}
        </div>
        <button className="search-btn" onClick={() => handleSearch(query)}>검색</button>

        {suggestions.length > 0 && (
          <ul className="sugg-list">
            {suggestions.map(apt => {
              const dong = apt.addr?.split(' ').find(p => p.endsWith('동') || p.endsWith('읍') || p.endsWith('면')) || ''
              return (
                <li key={apt.kaptCode} className="sugg-item"
                  onPointerDown={e => { e.preventDefault(); setQuery(apt.kaptName); handleSearch(apt.kaptName, dong) }}>
                  <span className="sugg-name">{apt.kaptName}</span>
                  {apt.kaptdaCnt && <span className="sugg-cnt">{apt.kaptdaCnt.toLocaleString()}세대</span>}
                  <span className="sugg-addr">{apt.addr?.split(' ').slice(1, 4).join(' ')}</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="loading-msg">동네 이야기 모으는 중이에요...</div>}

      <div className="hints">
        {HINTS.map(h => (
          <button key={h} className="hint-chip" onClick={() => { setQuery(h); handleSearch(h) }}>{h}</button>
        ))}
      </div>

      {/* 사주 지역 궁합 배너 */}
      <button className="saju-banner" onClick={() => setView('saju-input')}>
        <span className="saju-banner-icon">🔮</span>
        <div className="saju-banner-text">
          <div className="saju-banner-title">사주로 찾는 내 지역 궁합</div>
          <div className="saju-banner-sub">생년월일 입력하면 맞는 서울 동네 알려드려요</div>
        </div>
        <span className="saju-banner-arrow">›</span>
      </button>

      <div className="home-ai-notice">
        🤖 인터넷 정보를 AI가 자동 요약해드려요
      </div>
    </div>
  )
}
