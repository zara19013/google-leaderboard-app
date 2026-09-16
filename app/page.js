'use client';
import { useState, useEffect, useCallback } from 'react';

const GOOGLE_COLORS = ['#4285F4', '#34A853', '#FBBC05', '#EA4335'];

function googleColor(i) {
  return GOOGLE_COLORS[i % GOOGLE_COLORS.length];
}

function formatSpend(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function rankClass(i) {
  if (i === 0) return 'row-1';
  if (i === 1) return 'row-2';
  if (i === 2) return 'row-3';
  return 'row-other';
}

function rankEmoji(i) {
  if (i === 0) return '🥇';
  if (i === 1) return '🥈';
  if (i === 2) return '🥉';
  return null;
}

const MONTH_LABELS = {
  '2026-09': 'September 2026',
  '2026-08': 'August 2026',
  '2026-07': 'July 2026',
  '2026-06': 'June 2026',
  '2026-05': 'May 2026',
  '2026-04': 'April 2026',
};

// ─── Shared Spinner ───────────────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(66,133,244,0.15)', borderTop: '3px solid #4285F4', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>{label || 'Loading…'}</div>
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ background: 'rgba(255,50,50,0.07)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: 12, padding: '14px 18px', color: '#f87171', fontSize: 13, marginBottom: 24 }}>
      Error: {msg}
    </div>
  );
}

// ─── Leaderboard Tab ──────────────────────────────────────────────────────────
function LeaderboardTab() {
  const [month,   setMonth]   = useState('2026-09');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?month=${month}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [month]);

  const rows     = data?.data || [];
  const maxSpend = rows[0]?.month_spend || 1;
  const months   = data?.available_months || Object.keys(MONTH_LABELS);
  const summary  = data?.summary || {};

  return (
    <>
      {/* Month selector */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
        {months.map(m => (
          <button key={m} onClick={() => setMonth(m)} style={{
            padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', border: 'none',
            background: month === m ? '#4285F4' : 'rgba(255,255,255,0.06)',
            color: month === m ? '#fff' : 'rgba(255,255,255,0.45)',
            boxShadow: month === m ? '0 0 16px rgba(66,133,244,0.4)' : 'none',
          }}>
            {MONTH_LABELS[m] || m}
          </button>
        ))}
      </div>

      {/* Attribution summary */}
      {!loading && summary.total > 0 && (
        <div className="animate-fade-in" style={{
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14, padding: '18px 24px', marginBottom: 20,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Total Google Spend</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#4285F4' }}>{formatSpend(summary.total || 0)}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Attributed</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#34A853' }}>{formatSpend(summary.attributed || 0)}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{summary.pct_attributed ?? 0}% of total</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Unassigned</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#EA4335' }}>{formatSpend(summary.unassigned || 0)}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>naming gaps / PMax</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Attribution Rate</div>
            <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 4,
                width: `${Math.min(summary.pct_attributed || 0, 100)}%`,
                background: 'linear-gradient(90deg, #4285F4, #34A853)',
                transition: 'width 0.8s ease',
              }} />
            </div>
            <div style={{ fontSize: 12, color: '#34A853', fontWeight: 700, marginTop: 6 }}>{summary.pct_attributed ?? 0}%</div>
          </div>
        </div>
      )}

      {loading && <Spinner label="Loading Google leaderboard…" />}
      {error && <ErrorBox msg={error} />}

      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row, i) => {
            const pct   = maxSpend > 0 ? (row.month_spend / maxSpend) * 100 : 0;
            const color = googleColor(i);
            return (
              <div key={row.strategist} className={`${rankClass(i)} animate-fade-in delay-${Math.min(i, 10)}`}
                style={{ borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                  {rankEmoji(i)
                    ? <span style={{ fontSize: 20 }}>{rankEmoji(i)}</span>
                    : <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>#{i + 1}</span>}
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}88` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.strategist}
                  </div>
                </div>
                <div style={{ flex: 2, minWidth: 80, maxWidth: 300 }}>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: color, opacity: 0.8, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
                    {formatSpend(row.month_spend)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          No Google spend data for {MONTH_LABELS[month] || month}
        </div>
      )}

      {!loading && data?.unassigned_spend > 0 && (
        <div style={{ marginTop: 16, padding: '12px 20px', background: 'rgba(234,67,53,0.07)', border: '1px solid rgba(234,67,53,0.15)', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          + {formatSpend(data.unassigned_spend)} from <span style={{ color: '#EA4335', fontWeight: 600 }}>Unassigned</span> — ads with no strategist attribution (Performance Max, numeric IDs, generic names)
        </div>
      )}
    </>
  );
}

// ─── New Hits Tab ─────────────────────────────────────────────────────────────
function NewHitsTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/new-hits', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Finding new Google hits…" />;
  if (error)   return <ErrorBox msg={error} />;

  const hits5k  = data?.hits_5k  || {};
  const hits20k = data?.hits_20k || {};
  const strategists5k  = Object.keys(hits5k).sort();
  const strategists20k = Object.keys(hits20k).sort();

  const hasAny = strategists5k.length > 0 || strategists20k.length > 0;

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(251,188,5,0.08)', border: '1px solid rgba(251,188,5,0.25)', borderRadius: 8 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontSize: 12, color: '#FBBC05', fontWeight: 600 }}>Crossed $5K</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>in last 3 days</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: 'rgba(234,67,53,0.08)', border: '1px solid rgba(234,67,53,0.25)', borderRadius: 8 }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontSize: 12, color: '#EA4335', fontWeight: 600 }}>Crossed $20K</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>in last 3 days</span>
        </div>
      </div>

      {!hasAny && (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          No Google ads crossed milestone thresholds in the last 3 days
        </div>
      )}

      {/* $20K hits */}
      {strategists20k.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>🔥</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#EA4335' }}>Crossed $20K</span>
          </div>
          {strategists20k.map(strategist => (
            <div key={strategist} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{strategist}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hits20k[strategist].map((hit, i) => (
                  <div key={i} style={{ background: 'rgba(234,67,53,0.07)', border: '1px solid rgba(234,67,53,0.2)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hit.ad_name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Hit $20K on {hit.date_hit_20k}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#EA4335' }}>{formatSpend(hit.total_spend)}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* $5K hits */}
      {strategists5k.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>⚡</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FBBC05' }}>Crossed $5K</span>
          </div>
          {strategists5k.map(strategist => (
            <div key={strategist} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{strategist}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hits5k[strategist].map((hit, i) => (
                  <div key={i} style={{ background: 'rgba(251,188,5,0.05)', border: '1px solid rgba(251,188,5,0.18)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hit.ad_name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>Hit $5K on {hit.date_hit_5k}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 800, color: '#FBBC05' }}>{formatSpend(hit.total_spend)}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>total</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Daily Top 5 Tab ──────────────────────────────────────────────────────────
function DailyTop5Tab() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const defaultDate = yesterday.toISOString().split('T')[0];

  const [date,    setDate]    = useState(defaultDate);
  const [input,   setInput]   = useState(defaultDate);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const load = useCallback((d) => {
    setLoading(true);
    setError(null);
    fetch(`/api/daily-top5?date=${d}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const top5     = data?.top5 || [];
  const maxSpend = top5[0]?.day_spend || 1;

  return (
    <div>
      {/* Date picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <input
          type="date"
          className="date-input"
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button onClick={() => { setDate(input); }} style={{
          padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: '#4285F4', color: '#fff', border: 'none',
          boxShadow: '0 0 16px rgba(66,133,244,0.4)',
        }}>
          Load
        </button>
        {data && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            Total Google spend: <span style={{ color: '#4285F4', fontWeight: 700 }}>{formatSpend(data.total_spend || 0)}</span>
            {data.total_ads > 0 && <span> · {data.total_ads.toLocaleString()} ads</span>}
          </div>
        )}
      </div>

      {loading && <Spinner label={`Loading Google spend for ${date}…`} />}
      {error && <ErrorBox msg={error} />}

      {!loading && !error && top5.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          No attributed Google spend found for {date}
        </div>
      )}

      {!loading && !error && top5.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {top5.map((row, i) => {
            const pct   = maxSpend > 0 ? (row.day_spend / maxSpend) * 100 : 0;
            const color = googleColor(i);
            return (
              <div key={row.strategist} className={`${rankClass(i)} animate-fade-in delay-${i}`}
                style={{ borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                  {rankEmoji(i)
                    ? <span style={{ fontSize: 20 }}>{rankEmoji(i)}</span>
                    : <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>#{i + 1}</span>}
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}88` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{row.strategist}</div>
                  {row.ads_running > 0 && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{row.ads_running} ads running</div>
                  )}
                </div>
                <div style={{ flex: 2, minWidth: 80, maxWidth: 260 }}>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: color, opacity: 0.8, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
                    {formatSpend(row.day_spend)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Range Tab ────────────────────────────────────────────────────────────────
function RangeTab() {
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

  const [startInput, setStartInput] = useState(weekAgo);
  const [endInput,   setEndInput]   = useState(today);
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [queried,    setQueried]    = useState(null); // { start, end }

  function run() {
    if (!startInput || !endInput) return;
    setLoading(true);
    setError(null);
    setQueried({ start: startInput, end: endInput });
    fetch(`/api/range?start=${startInput}&end=${endInput}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  const rows     = data?.data || [];
  const maxSpend = rows[0]?.total_spend || 1;

  return (
    <div>
      {/* Date range picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <input type="date" className="date-input" value={startInput} onChange={e => setStartInput(e.target.value)} />
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>to</span>
        <input type="date" className="date-input" value={endInput} onChange={e => setEndInput(e.target.value)} />
        <button onClick={run} style={{
          padding: '8px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          background: '#34A853', color: '#fff', border: 'none',
          boxShadow: '0 0 16px rgba(52,168,83,0.4)',
        }}>
          Load
        </button>
      </div>

      {/* Summary strip */}
      {!loading && data && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Total Spend</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#4285F4' }}>{formatSpend(data.total_spend || 0)}</div>
          </div>
          {data.unassigned_spend > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Unassigned</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#EA4335' }}>{formatSpend(data.unassigned_spend)}</div>
            </div>
          )}
          {data.total_ads > 0 && (
            <div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Ads</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#FBBC05' }}>{data.total_ads.toLocaleString()}</div>
            </div>
          )}
          {queried && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', alignSelf: 'flex-end', marginLeft: 'auto' }}>
              {queried.start} → {queried.end}
            </div>
          )}
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>
          Select a date range and click Load
        </div>
      )}

      {loading && <Spinner label="Querying Google spend for range…" />}
      {error && <ErrorBox msg={error} />}

      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row, i) => {
            const pct   = maxSpend > 0 ? (row.total_spend / maxSpend) * 100 : 0;
            const color = googleColor(i);
            return (
              <div key={row.strategist} className={`${rankClass(i)} animate-fade-in delay-${Math.min(i, 10)}`}
                style={{ borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                  {rankEmoji(i)
                    ? <span style={{ fontSize: 20 }}>{rankEmoji(i)}</span>
                    : <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>#{i + 1}</span>}
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}88` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.strategist}
                  </div>
                  {row.ads_tested > 0 && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{row.ads_tested} ads</div>
                  )}
                </div>
                <div style={{ flex: 2, minWidth: 80, maxWidth: 300 }}>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`, background: color, opacity: 0.8, transition: 'width 0.6s ease' }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 80 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>
                    {formatSpend(row.total_spend)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'leaderboard', label: '📊 Leaderboard' },
  { id: 'new-hits',    label: '🔥 New Hits' },
  { id: 'daily-top5', label: '📅 Daily Top 5' },
  { id: 'range',       label: '📅 Range' },
];

export default function GoogleLeaderboard() {
  const [activeTab, setActiveTab] = useState('leaderboard');

  const today = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#07070f', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", padding: '28px 30px 60px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, fontSize: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #4285F4, #34A853)',
            boxShadow: '0 0 20px rgba(66,133,244,0.35)',
          }}>📊</div>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em' }}>
              <span className="shimmer-google">Google Spend Leaderboard</span>
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
              Google Ads · spend attributed to strategists · {today}
            </p>
          </div>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '6px 14px' }}>
          reporting.google_strategist_leaderboard
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 18px', borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'all 0.15s', border: 'none',
            background: activeTab === tab.id
              ? 'linear-gradient(135deg, rgba(66,133,244,0.3), rgba(52,168,83,0.2))'
              : 'transparent',
            color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
            boxShadow: activeTab === tab.id ? '0 0 16px rgba(66,133,244,0.2)' : 'none',
            borderBottom: activeTab === tab.id ? '2px solid #4285F4' : '2px solid transparent',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'leaderboard' && <LeaderboardTab />}
      {activeTab === 'new-hits'    && <NewHitsTab />}
      {activeTab === 'daily-top5'  && <DailyTop5Tab />}
      {activeTab === 'range'       && <RangeTab />}

      {/* Footer */}
      <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
        Data sourced from Triple Whale · attributed via brief ID, ad name pattern, pod number, and manual map
      </div>
    </div>
  );
}
