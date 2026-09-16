'use client';
import { useState, useEffect } from 'react';

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

export default function GoogleLeaderboard() {
  const [month,    setMonth]    = useState('2026-09');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/leaderboard?month=${month}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error);
        setData(d);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [month]);

  const rows    = data?.data || [];
  const maxSpend = rows[0]?.month_spend || 1;
  const months  = data?.available_months || Object.keys(MONTH_LABELS);
  const summary = data?.summary || {};

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

      {/* Attribution summary bar */}
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

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16 }}>
          <div style={{ width: 36, height: 36, border: '3px solid rgba(66,133,244,0.15)', borderTop: '3px solid #4285F4', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Loading Google leaderboard…</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: 'rgba(255,50,50,0.07)', border: '1px solid rgba(255,50,50,0.2)', borderRadius: 12, padding: '14px 18px', color: '#f87171', fontSize: 13, marginBottom: 24 }}>
          Error: {error}
        </div>
      )}

      {/* Leaderboard */}
      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((row, i) => {
            const pct = maxSpend > 0 ? (row.month_spend / maxSpend) * 100 : 0;
            const color = googleColor(i);
            return (
              <div key={row.strategist} className={`${rankClass(i)} animate-fade-in delay-${Math.min(i, 10)}`}
                style={{ borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Rank */}
                <div style={{ width: 32, textAlign: 'center', flexShrink: 0 }}>
                  {rankEmoji(i)
                    ? <span style={{ fontSize: 20 }}>{rankEmoji(i)}</span>
                    : <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.25)' }}>#{i + 1}</span>
                  }
                </div>

                {/* Color dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}88` }} />

                {/* Name */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.strategist}
                  </div>
                </div>

                {/* Bar */}
                <div style={{ flex: 2, minWidth: 80, maxWidth: 300 }}>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      width: `${pct}%`,
                      background: color,
                      opacity: 0.8,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                </div>

                {/* Spend */}
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

      {/* Footer */}
      {!loading && data?.unassigned_spend > 0 && (
        <div style={{ marginTop: 16, padding: '12px 20px', background: 'rgba(234,67,53,0.07)', border: '1px solid rgba(234,67,53,0.15)', borderRadius: 10, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          + {formatSpend(data.unassigned_spend)} from <span style={{ color: '#EA4335', fontWeight: 600 }}>Unassigned</span> — ads with no strategist attribution (Performance Max, numeric IDs, generic names)
        </div>
      )}

      <div style={{ marginTop: 40, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: 'rgba(255,255,255,0.18)' }}>
        Data sourced from Triple Whale · attributed via brief ID, ad name pattern, pod number, and manual map
      </div>
    </div>
  );
}
