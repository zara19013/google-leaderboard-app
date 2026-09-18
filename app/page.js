'use client';
import { useState, useEffect, useRef } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const G = { blue: '#4285F4', green: '#34A853', yellow: '#FBBC05', red: '#EA4335' };
const GOOGLE_COLORS = [G.blue, G.green, G.yellow, G.red];
const MONTH_NAMES   = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_LABELS  = {
  '2026-09': 'Sep 2026', '2026-08': 'Aug 2026', '2026-07': 'Jul 2026',
  '2026-06': 'Jun 2026', '2026-05': 'May 2026', '2026-04': 'Apr 2026',
};

function gColor(i) { return GOOGLE_COLORS[i % 4]; }

function fmt(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function initials(name) {
  const parts = (name || '').split(/[\s/]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0] || '?')[0].toUpperCase();
}

function rowClass(i) {
  if (i === 0) return 'row-gold';
  if (i === 1) return 'row-silver';
  if (i === 2) return 'row-bronze';
  return 'row-default';
}

// ─── Custom DatePicker ────────────────────────────────────────────────────────
function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const parsed = value ? value.split('-').map(Number) : null;
  const [vy, setVy] = useState(parsed?.[0] || new Date().getFullYear());
  const [vm, setVm] = useState(parsed?.[1] || new Date().getMonth() + 1);

  useEffect(() => {
    if (!open) return;
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const todayStr = new Date().toISOString().split('T')[0];
  const display  = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Pick date';
  const firstDay = new Date(vy, vm - 1, 1).getDay();
  const daysInMo = new Date(vy, vm, 0).getDate();
  const cells    = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMo }, (_, i) => i + 1)];

  function pick(d) {
    onChange(`${vy}-${String(vm).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    setOpen(false);
  }
  function prev() { if (vm === 1) { setVm(12); setVy(y => y-1); } else setVm(m => m-1); }
  function next() { if (vm === 12) { setVm(1); setVy(y => y+1); } else setVm(m => m+1); }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        background: open ? 'rgba(66,133,244,0.12)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${open ? 'rgba(66,133,244,0.6)' : 'rgba(255,255,255,0.1)'}`,
        borderRadius: 12, padding: '10px 16px', color: '#fff', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, fontFamily: 'inherit',
        transition: 'all 0.2s', boxShadow: open ? '0 0 0 3px rgba(66,133,244,0.18)' : 'none',
        whiteSpace: 'nowrap',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={G.blue} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {display}
        <svg width="10" height="6" viewBox="0 0 10 6" style={{ opacity: 0.4, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M1 1l4 4 4-4" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', left: 0, zIndex: 300,
          background: '#0e0e1a', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18, padding: '18px', width: 272,
          boxShadow: '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(66,133,244,0.1)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            {[{ fn: prev, label: '‹' }, null, { fn: next, label: '›' }].map((x, i) => x
              ? <button key={i} onClick={x.fn} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', width: 30, height: 30, borderRadius: 8, fontSize: 16, fontFamily: 'inherit', transition: 'all 0.15s' }}>{x.label}</button>
              : <span key={i} style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{MONTH_NAMES[vm-1]} {vy}</span>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 8 }}>
            {['S','M','T','W','T','F','S'].map((d,i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.18)', paddingBottom: 4 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i}/>;
              const ds = `${vy}-${String(vm).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
              const sel = ds === value, tod = ds === todayStr;
              return (
                <button key={i} onClick={() => pick(d)} style={{
                  background: sel ? G.blue : tod ? 'rgba(66,133,244,0.2)' : 'transparent',
                  border: tod && !sel ? `1px solid rgba(66,133,244,0.45)` : '1px solid transparent',
                  borderRadius: 8, color: sel ? '#fff' : tod ? '#7baaf7' : 'rgba(255,255,255,0.65)',
                  cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 400,
                  padding: '7px 2px', textAlign: 'center', fontFamily: 'inherit',
                  boxShadow: sel ? '0 0 14px rgba(66,133,244,0.45)' : 'none',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.background = tod ? 'rgba(66,133,244,0.2)' : 'transparent'; }}
                >{d}</button>
              );
            })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
            <button onClick={() => { onChange(todayStr); setOpen(false); }} style={{ background: 'rgba(66,133,244,0.12)', border: '1px solid rgba(66,133,244,0.25)', color: G.blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: '5px 18px', borderRadius: 8, fontFamily: 'inherit' }}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function Spinner({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 280, gap: 18 }}>
      <div style={{ position: 'relative', width: 44, height: 44 }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(66,133,244,0.08)' }}/>
        <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid transparent', borderTopColor: G.blue, animation: 'spin 0.8s linear infinite' }}/>
        <div style={{ position: 'absolute', inset: 6, borderRadius: '50%', border: '2px solid transparent', borderTopColor: G.green, animation: 'spin 1.2s linear infinite reverse' }}/>
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{label || 'Loading…'}</div>
    </div>
  );
}

function Err({ msg }) {
  return (
    <div style={{ background: 'rgba(234,67,53,0.07)', border: '1px solid rgba(234,67,53,0.2)', borderRadius: 14, padding: '16px 20px', color: '#f87171', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      {msg}
    </div>
  );
}

function StatCard({ label, value, sub, color, bar }) {
  return (
    <div style={{ padding: '20px 22px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, borderTop: `2px solid ${color}40` }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color, letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>{sub}</div>}
      {bar !== undefined && (
        <div style={{ marginTop: 10 }}>
          <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(bar, 100)}%`, background: `linear-gradient(90deg, ${G.blue}, ${G.green})`, transition: 'width 1s cubic-bezier(.16,1,.3,1)' }}/>
          </div>
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }) {
  if (rank === 0) return <div style={{ fontSize: 22, lineHeight: 1 }}>🥇</div>;
  if (rank === 1) return <div style={{ fontSize: 22, lineHeight: 1 }}>🥈</div>;
  if (rank === 2) return <div style={{ fontSize: 22, lineHeight: 1 }}>🥉</div>;
  return (
    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
      {rank + 1}
    </div>
  );
}

function Avatar({ name, color, size = 38 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size / 2.5, flexShrink: 0,
      background: `${color}22`,
      border: `1.5px solid ${color}55`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, color,
      boxShadow: `0 0 16px ${color}22`,
    }}>
      {initials(name)}
    </div>
  );
}

function LeaderRow({ row, i, spendKey, maxSpend }) {
  const color = gColor(i);
  const spend = row[spendKey] || 0;
  const pct   = maxSpend > 0 ? (spend / maxSpend) * 100 : 0;
  return (
    <div className={`${rowClass(i)} animate-fade-up delay-${Math.min(i, 10)}`}
      style={{ borderRadius: 16, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <RankBadge rank={i} />
      </div>
      <Avatar name={row.strategist} color={color} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {row.strategist}
        </div>
        {row.ads_running > 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{row.ads_running} ads</div>}
        {row.ads_tested  > 0 && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{row.ads_tested} ads</div>}
      </div>
      <div style={{ flex: 2, minWidth: 80, maxWidth: 280 }}>
        <div style={{ height: 7, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 4,
            width: `${pct}%`,
            background: i < 3
              ? `linear-gradient(90deg, ${color}cc, ${color})`
              : color,
            boxShadow: i === 0 ? `0 0 12px ${color}88` : 'none',
            transition: 'width 0.8s cubic-bezier(.16,1,.3,1)',
          }}/>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 82 }}>
        <div style={{ fontSize: 17, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em' }}>
          {fmt(spend)}
        </div>
      </div>
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
    setLoading(true); setError(null);
    fetch(`/api/leaderboard?month=${month}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [month]);

  const rows     = data?.data || [];
  const maxSpend = rows[0]?.month_spend || 1;
  const months   = data?.available_months || Object.keys(MONTH_LABELS);
  const s        = data?.summary || {};

  return (
    <>
      {/* Month pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 26 }}>
        {months.map(m => (
          <button key={m} onClick={() => setMonth(m)} style={{
            padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
            cursor: 'pointer', border: 'none', transition: 'all 0.18s',
            background: month === m
              ? `linear-gradient(135deg, ${G.blue}cc, ${G.blue})`
              : 'rgba(255,255,255,0.05)',
            color: month === m ? '#fff' : 'rgba(255,255,255,0.4)',
            boxShadow: month === m ? `0 4px 20px ${G.blue}44` : 'none',
            transform: month === m ? 'scale(1.04)' : 'scale(1)',
          }}>
            {MONTH_LABELS[m] || m}
          </button>
        ))}
      </div>

      {/* Stats grid */}
      {!loading && s.total > 0 && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Google Spend" value={fmt(s.total || 0)} color={G.blue} />
          <StatCard label="Attributed" value={fmt(s.attributed || 0)} sub={`${s.pct_attributed ?? 0}% of total`} color={G.green} />
          <StatCard label="Unassigned" value={fmt(s.unassigned || 0)} sub="PMax / no attribution" color={G.red} />
          <StatCard label="Attribution Rate" value={`${s.pct_attributed ?? 0}%`} color={G.green} bar={s.pct_attributed || 0} />
        </div>
      )}

      {loading && <Spinner label="Loading Google leaderboard…" />}
      {error   && <Err msg={error} />}

      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rows.map((row, i) => <LeaderRow key={row.strategist} row={row} i={i} spendKey="month_spend" maxSpend={maxSpend} />)}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
          No data for {MONTH_LABELS[month] || month}
        </div>
      )}

      {!loading && data?.unassigned_spend > 0 && (
        <div style={{ marginTop: 14, padding: '12px 18px', background: 'rgba(234,67,53,0.06)', border: '1px solid rgba(234,67,53,0.14)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: G.red }}>●</span>
          <span>{fmt(data.unassigned_spend)} unassigned — Performance Max, numeric IDs, generic names</span>
        </div>
      )}
    </>
  );
}

// ─── New Hits Tab ─────────────────────────────────────────────────────────────
const CU_ICON = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.27 10.41L6 13.14l4.62-6.02c.41-.54 1.18-.64 1.72-.23.54.41.64 1.18.23 1.72L7.13 15.9c-.22.29-.55.47-.91.49-.36.02-.71-.13-.95-.4L3 12.65c-.43-.5-.37-1.27.13-1.7.5-.43 1.27-.37 1.7.13l-.56-.67zM12 5l4.62 6.02L20 8.27l-4.62-6.02L12 5zm3.96 9.79L12 18.62l-3.96-3.83c-.47-.46-.48-1.22-.02-1.69.46-.47 1.22-.48 1.69-.02L12 15.17l2.29-2.09c.47-.46 1.23-.45 1.69.02.46.47.45 1.23-.02 1.69z"/>
  </svg>
);

function HitCard({ hit, color, threshold }) {
  return (
    <div style={{
      background: `${color}08`,
      border: `1px solid ${color}25`,
      borderRadius: 14,
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 14,
      transition: 'border-color 0.2s',
    }}>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: `${color}15`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
      }}>
        {threshold === 20000 ? '🔥' : '⚡'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {hit.ad_name}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>
          Hit {threshold === 20000 ? '$20K' : '$5K'} on <span style={{ color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>{threshold === 20000 ? hit.date_hit_20k : hit.date_hit_5k}</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {hit.task_url && (
          <a href={hit.task_url} target="_blank" rel="noreferrer" title={hit.task_name || 'Open in ClickUp'} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px',
            background: 'rgba(122,93,255,0.14)', border: '1px solid rgba(122,93,255,0.28)',
            borderRadius: 8, color: '#a78bfa', fontSize: 11, fontWeight: 700,
            textDecoration: 'none', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>
            {CU_ICON} ClickUp
          </a>
        )}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color, letterSpacing: '-0.01em' }}>{fmt(hit.total_spend)}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>total</div>
        </div>
      </div>
    </div>
  );
}

function StrategistGroup({ strategist, hits, color, threshold }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <Avatar name={strategist} color={color} size={30} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{strategist}</span>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, padding: '2px 8px' }}>{hits.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, paddingLeft: 40 }}>
        {hits.map((hit, i) => <HitCard key={i} hit={hit} color={color} threshold={threshold} />)}
      </div>
    </div>
  );
}

function NewHitsTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch('/api/new-hits', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner label="Scanning for new Google milestones…" />;
  if (error)   return <Err msg={error} />;

  const hits5k  = data?.hits_5k  || {};
  const hits20k = data?.hits_20k || {};
  const s5  = Object.keys(hits5k).sort();
  const s20 = Object.keys(hits20k).sort();

  if (!s5.length && !s20.length) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
        <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>No milestones crossed in the last 3 days</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>Check back tomorrow</div>
      </div>
    );
  }

  return (
    <div>
      {/* Milestone legend */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
        {[{ icon: '🔥', label: '$20K', color: G.red, count: Object.values(hits20k).flat().length },
          { icon: '⚡', label: '$5K',  color: G.yellow, count: Object.values(hits5k).flat().length }]
          .filter(x => x.count > 0)
          .map(x => (
            <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: `${x.color}0d`, border: `1px solid ${x.color}30`, borderRadius: 12 }}>
              <span style={{ fontSize: 16 }}>{x.icon}</span>
              <span style={{ fontSize: 13, color: x.color, fontWeight: 700 }}>Crossed {x.label}</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>{x.count}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>in last 3 days</span>
            </div>
          ))}
      </div>

      {s20.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <SectionHeading icon="🔥" label="Crossed $20K" color={G.red} />
          {s20.map((s, si) => <StrategistGroup key={s} strategist={s} hits={hits20k[s]} color={gColor(si)} threshold={20000} />)}
        </div>
      )}
      {s5.length > 0 && (
        <div>
          <SectionHeading icon="⚡" label="Crossed $5K" color={G.yellow} />
          {s5.map((s, si) => <StrategistGroup key={s} strategist={s} hits={hits5k[s]} color={gColor(si)} threshold={5000} />)}
        </div>
      )}
    </div>
  );
}

function SectionHeading({ icon, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${color}20` }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ fontSize: 16, fontWeight: 800, color }}>{label}</span>
    </div>
  );
}

// ─── Daily Top 5 Tab ──────────────────────────────────────────────────────────
function DailyTop5Tab() {
  const yd = new Date(); yd.setDate(yd.getDate() - 1);
  const [date,    setDate]    = useState(yd.toISOString().split('T')[0]);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/daily-top5?date=${date}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [date]);

  const top5     = data?.top5 || [];
  const maxSpend = top5[0]?.day_spend || 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 26, flexWrap: 'wrap' }}>
        <DatePicker value={date} onChange={setDate} />
        {data && !loading && (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Total spend </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: G.blue }}>{fmt(data.total_spend || 0)}</span>
            </div>
            {data.total_ads > 0 && (
              <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Ads running </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: G.green }}>{data.total_ads.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {loading && <Spinner label={`Loading Google spend for ${date}…`} />}
      {error   && <Err msg={error} />}

      {!loading && !error && top5.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>
          No attributed spend found for {date}
        </div>
      )}

      {!loading && !error && top5.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {top5.map((row, i) => <LeaderRow key={row.strategist} row={row} i={i} spendKey="day_spend" maxSpend={maxSpend} />)}
        </div>
      )}
    </div>
  );
}

// ─── Range Tab ────────────────────────────────────────────────────────────────
function RangeTab() {
  const today   = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const [start,   setStart]   = useState(weekAgo);
  const [end,     setEnd]     = useState(today);
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [label,   setLabel]   = useState(null);

  function run() {
    if (!start || !end) return;
    setLoading(true); setError(null);
    setLabel(`${start} → ${end}`);
    fetch(`/api/range?start=${start}&end=${end}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  const rows     = data?.data || [];
  const maxSpend = rows[0]?.total_spend || 1;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26, flexWrap: 'wrap' }}>
        <DatePicker value={start} onChange={setStart} />
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 18, fontWeight: 300 }}>→</span>
        <DatePicker value={end} onChange={setEnd} />
        <button onClick={run} style={{
          padding: '10px 22px', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
          background: `linear-gradient(135deg, ${G.green}cc, ${G.green})`,
          color: '#fff', boxShadow: `0 4px 20px ${G.green}44`, transition: 'all 0.2s',
        }}>
          Load
        </button>
      </div>

      {!loading && data && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total Spend" value={fmt(data.total_spend || 0)} color={G.blue} sub={label} />
          {data.unassigned_spend > 0 && <StatCard label="Unassigned" value={fmt(data.unassigned_spend)} color={G.red} />}
          {data.total_ads > 0 && <StatCard label="Ads" value={data.total_ads.toLocaleString()} color={G.yellow} />}
        </div>
      )}

      {!loading && !data && !error && (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <div style={{ fontSize: 40, marginBottom: 14, opacity: 0.4 }}>📅</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)' }}>Pick a date range and click Load</div>
        </div>
      )}

      {loading && <Spinner label="Querying Google spend…" />}
      {error   && <Err msg={error} />}

      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {rows.map((row, i) => <LeaderRow key={row.strategist} row={row} i={i} spendKey="total_spend" maxSpend={maxSpend} />)}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'leaderboard', label: 'Leaderboard', icon: '📊' },
  { id: 'new-hits',    label: 'New Hits',    icon: '🔥' },
  { id: 'daily-top5', label: 'Daily Top 5', icon: '📅' },
  { id: 'range',       label: 'Range',       icon: '📅' },
];

// ─── Auth gate ────────────────────────────────────────────────────────────────
const ALLOWED = [
  'zara@incubatorlab.ai',
  'farwa@incubatorlab.ai',
  'zaydpe@gmail.com',
  'zaydzayd@resilia.shop',
  'karenhardwick@incubatorlab.ai',
];
const STORAGE_KEY = 'gl_auth_email';

function LoginGate({ onAuth }) {
  const [email,  setEmail]  = useState('');
  const [error,  setError]  = useState('');
  const [shake,  setShake]  = useState(false);

  function attempt() {
    const trimmed = email.trim().toLowerCase();
    if (ALLOWED.includes(trimmed)) {
      localStorage.setItem(STORAGE_KEY, trimmed);
      onAuth(trimmed);
    } else {
      setError('Email not recognised. Access restricted.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  }

  function onKey(e) { if (e.key === 'Enter') attempt(); }

  return (
    <div style={{ minHeight: '100vh', background: '#080810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>
      {/* Ambient blobs */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(66,133,244,0.1) 0%, transparent 70%)', pointerEvents: 'none', animation: 'blob 12s ease infinite' }}/>
      <div style={{ position: 'fixed', bottom: -150, right: -150, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,168,83,0.07) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      <div className="animate-fade-up" style={{
        width: '100%', maxWidth: 420, margin: '0 24px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, padding: '44px 40px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        animation: shake ? 'shake 0.5s ease' : undefined,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 36 }}>
          <div style={{ position: 'relative', marginBottom: 20 }}>
            <div style={{ position: 'absolute', inset: -3, borderRadius: 22, background: 'conic-gradient(from 0deg, #4285F4, #34A853, #FBBC05, #EA4335, #4285F4)', animation: 'ringRotate 4s linear infinite', opacity: 0.7 }}/>
            <div style={{ position: 'absolute', inset: -1, borderRadius: 20, background: '#080810' }}/>
            <div className="icon-wrap" style={{ position: 'relative', width: 62, height: 62, borderRadius: 18, fontSize: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg, rgba(66,133,244,0.25), rgba(52,168,83,0.15))', border: '1px solid rgba(66,133,244,0.35)' }}>📊</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="title-eyebrow" style={{ textAlign: 'center', marginBottom: 6 }}>Google Ads · Spend Attribution</div>
            <h1 style={{ margin: 0, lineHeight: 1.05 }}>
              <div className="title-sub-word" style={{ textAlign: 'center' }}>Google</div>
              <div className="title-main" style={{ fontSize: 34, textAlign: 'center' }}>LEADERBOARD</div>
            </h1>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(66,133,244,0.4), rgba(52,168,83,0.3), transparent)', marginBottom: 32 }}/>

        {/* Form */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            Work Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
            onKeyDown={onKey}
            placeholder="you@incubatorlab.ai"
            autoFocus
            style={{
              width: '100%', padding: '13px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${error ? 'rgba(234,67,53,0.5)' : 'rgba(255,255,255,0.1)'}`,
              borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 500,
              fontFamily: 'inherit', outline: 'none',
              transition: 'all 0.2s',
              boxShadow: error ? '0 0 0 3px rgba(234,67,53,0.1)' : 'none',
            }}
            onFocus={e => { e.target.style.borderColor = 'rgba(66,133,244,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(66,133,244,0.12)'; }}
            onBlur={e => { e.target.style.borderColor = error ? 'rgba(234,67,53,0.5)' : 'rgba(255,255,255,0.1)'; e.target.style.boxShadow = 'none'; }}
          />
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#f87171', fontWeight: 500 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}
        </div>

        <button onClick={attempt} style={{
          width: '100%', marginTop: 20, padding: '14px',
          borderRadius: 12, fontSize: 14, fontWeight: 800, cursor: 'pointer', border: 'none',
          background: 'linear-gradient(135deg, #4285F4, #34A853)',
          color: '#fff', letterSpacing: '0.02em',
          boxShadow: '0 4px 24px rgba(66,133,244,0.4)',
          transition: 'all 0.2s', fontFamily: 'inherit',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(66,133,244,0.5)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(66,133,244,0.4)'; }}
        >
          Access Leaderboard →
        </button>

        <div style={{ marginTop: 20, fontSize: 11, color: 'rgba(255,255,255,0.15)', textAlign: 'center' }}>
          Restricted to Incubator Lab team members
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-5px); }
          80%      { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('leaderboard');
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' });

  // Check localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && ALLOWED.includes(saved)) setAuthed(true);
  }, []);

  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} />;

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#fff', fontFamily: "'Inter', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* Ambient background glow */}
      <div style={{ position: 'fixed', top: -200, left: -200, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(66,133,244,0.08) 0%, transparent 70%)', pointerEvents: 'none', animation: 'blob 12s ease infinite' }}/>
      <div style={{ position: 'fixed', top: -100, right: -200, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,168,83,0.06) 0%, transparent 70%)', pointerEvents: 'none', animation: 'blob 16s ease infinite reverse' }}/>
      <div style={{ position: 'fixed', bottom: -200, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(234,67,53,0.05) 0%, transparent 70%)', pointerEvents: 'none' }}/>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 960, margin: '0 auto', padding: '32px 28px 80px' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>

            {/* Left: icon + title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>

              {/* Animated icon */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                {/* Rotating gradient ring */}
                <div style={{
                  position: 'absolute', inset: -3, borderRadius: 22,
                  background: 'conic-gradient(from 0deg, #4285F4, #34A853, #FBBC05, #EA4335, #4285F4)',
                  animation: 'ringRotate 4s linear infinite',
                  opacity: 0.7,
                }}/>
                {/* Inner mask */}
                <div style={{
                  position: 'absolute', inset: -1, borderRadius: 20,
                  background: '#080810',
                }}/>
                {/* Icon box */}
                <div className="icon-wrap" style={{
                  position: 'relative',
                  width: 62, height: 62, borderRadius: 18, fontSize: 28,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(145deg, rgba(66,133,244,0.25) 0%, rgba(52,168,83,0.15) 100%)',
                  border: '1px solid rgba(66,133,244,0.35)',
                }}>📊</div>
              </div>

              {/* Text */}
              <div>
                <div className="title-eyebrow">Google Ads · Spend Attribution</div>
                <h1 style={{ margin: 0, lineHeight: 1.05 }}>
                  <div className="title-sub-word">Google</div>
                  <span className="title-main">LEADERBOARD</span>
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: G.green, boxShadow: `0 0 10px ${G.green}` }} className="pulse-dot"/>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500, letterSpacing: '0.01em' }}>
                    Strategist spend · {today}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: BQ badge */}
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '8px 14px', fontFamily: 'monospace', letterSpacing: '0.02em', alignSelf: 'flex-start', marginTop: 4 }}>
              reporting.google_strategist_leaderboard
            </div>
          </div>

          {/* Divider */}
          <div style={{ marginTop: 28, height: 1, background: 'linear-gradient(90deg, rgba(66,133,244,0.4) 0%, rgba(52,168,83,0.3) 30%, rgba(251,188,5,0.2) 60%, transparent 100%)' }}/>
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 32, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 5, width: 'fit-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', border: 'none', transition: 'all 0.2s',
              background: tab === t.id
                ? 'linear-gradient(135deg, rgba(66,133,244,0.25), rgba(52,168,83,0.15))'
                : 'transparent',
              color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.35)',
              boxShadow: tab === t.id ? '0 4px 20px rgba(66,133,244,0.15), inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
              outline: tab === t.id ? `1px solid rgba(66,133,244,0.25)` : '1px solid transparent',
            }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'leaderboard' && <LeaderboardTab />}
        {tab === 'new-hits'    && <NewHitsTab />}
        {tab === 'daily-top5'  && <DailyTop5Tab />}
        {tab === 'range'       && <RangeTab />}

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[G.blue, G.red, G.yellow, G.green].map((c, i) => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: c, opacity: 0.6 }}/>)}
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.15)' }}>
            Data from Triple Whale · attributed via brief ID, ad name, pod number, and manual map
          </span>
        </div>
      </div>
    </div>
  );
}
