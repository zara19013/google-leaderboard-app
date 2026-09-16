export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const PROJECT_ID     = 'zendesk-488615';
const PROJECT_NUMBER = '5433699000';
const POOL_ID        = 'vercel-pool';
const PROVIDER_ID    = 'vercel-provider';
const SERVICE_ACCOUNT = 'leaderboard-app-368@zendesk-488615.iam.gserviceaccount.com';

async function getGcpToken() {
  const { getVercelOidcToken } = await import('@vercel/functions/oidc');
  const vercelToken = await getVercelOidcToken();
  const stsRes = await fetch('https://sts.googleapis.com/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:           'urn:ietf:params:oauth:grant-type:token-exchange',
      audience:             `//iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/providers/${PROVIDER_ID}`,
      requested_token_type: 'urn:ietf:params:oauth:token-type:access_token',
      subject_token:        vercelToken,
      subject_token_type:   'urn:ietf:params:oauth:token-type:id_token',
      scope:                'https://www.googleapis.com/auth/cloud-platform',
    }),
  });
  const sts = await stsRes.json();
  if (!sts.access_token) throw new Error(`STS failed: ${JSON.stringify(sts)}`);
  const impRes = await fetch(
    `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SERVICE_ACCOUNT}:generateAccessToken`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${sts.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/bigquery.readonly'] }),
    }
  );
  const imp = await impRes.json();
  if (!imp.accessToken) throw new Error(`SA impersonation failed: ${JSON.stringify(imp)}`);
  return imp.accessToken;
}

function parseRows(data) {
  if (!data.rows) return [];
  const fields = data.schema.fields.map(f => ({ name: f.name, type: f.type }));
  return data.rows.map(row => {
    const obj = {};
    row.f.forEach((cell, i) => {
      const { name, type } = fields[i];
      const v = cell.v;
      if (v === null) { obj[name] = null; }
      else if (type === 'STRING') { obj[name] = v; }
      else { obj[name] = isNaN(v) ? v : Number(v); }
    });
    return obj;
  });
}

async function bqRaw(token, query) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, useLegacySql: false, timeoutMs: 30000, maxResults: 500 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.jobComplete) {
    const jobId = data.jobReference.jobId;
    let poll;
    do {
      await new Promise(r => setTimeout(r, 1000));
      const pr = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries/${jobId}?timeoutMs=10000`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      poll = await pr.json();
    } while (!poll.jobComplete);
    return parseRows(poll);
  }
  return parseRows(data);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || '2026-09';

  const leaderboardQuery = `
    SELECT
      strategist,
      ROUND(SUM(month_spend), 2) AS month_spend
    FROM \`${PROJECT_ID}.reporting.google_strategist_leaderboard\`
    WHERE month = '${month}'
    GROUP BY strategist
    ORDER BY month_spend DESC
  `;

  const summaryQuery = `
    SELECT
      month,
      ROUND(SUM(CASE WHEN strategist != 'Unassigned' THEN month_spend ELSE 0 END), 0) AS attributed,
      ROUND(SUM(CASE WHEN strategist  = 'Unassigned' THEN month_spend ELSE 0 END), 0) AS unassigned,
      ROUND(SUM(month_spend), 0) AS total,
      ROUND(100 * SUM(CASE WHEN strategist != 'Unassigned' THEN month_spend ELSE 0 END) / NULLIF(SUM(month_spend), 0), 1) AS pct_attributed
    FROM \`${PROJECT_ID}.reporting.google_strategist_leaderboard\`
    GROUP BY month
    ORDER BY month DESC
    LIMIT 10
  `;

  try {
    if (process.env.VERCEL) {
      const token = await getGcpToken();
      const [rows, summaryRows] = await Promise.all([
        bqRaw(token, leaderboardQuery),
        bqRaw(token, summaryQuery),
      ]);
      const known    = rows.filter(r => r.strategist !== 'Unassigned');
      const unknown  = rows.find(r => r.strategist === 'Unassigned');
      const total    = rows.reduce((s, r) => s + (r.month_spend || 0), 0);
      const summary  = summaryRows.find(r => r.month === month) || {};
      return Response.json({ data: known, unassigned_spend: unknown?.month_spend || 0, total_spend: total, summary, available_months: summaryRows.map(r => r.month) }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const { BigQuery } = await import('@google-cloud/bigquery');
    const bq = new BigQuery({ projectId: PROJECT_ID });
    const [[rows], [summaryRows]] = await Promise.all([
      bq.query({ query: leaderboardQuery }),
      bq.query({ query: summaryQuery }),
    ]);
    const known   = rows.filter(r => r.strategist !== 'Unassigned');
    const unknown = rows.find(r => r.strategist === 'Unassigned');
    const total   = rows.reduce((s, r) => s + (r.month_spend || 0), 0);
    const summary = summaryRows.find(r => r.month === month) || {};
    return Response.json({ data: known, unassigned_spend: unknown?.month_spend || 0, total_spend: total, summary, available_months: summaryRows.map(r => r.month) });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
