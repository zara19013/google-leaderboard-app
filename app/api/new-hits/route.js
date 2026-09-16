export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const PROJECT_ID     = 'zendesk-488615';
const PROJECT_NUMBER = '5433699000';
const POOL_ID        = 'vercel-pool';
const PROVIDER_ID    = 'vercel-provider';
const SERVICE_ACCOUNT = 'leaderboard-app-368@zendesk-488615.iam.gserviceaccount.com';
const DATASET        = 'datads_raw';

// Known monthly tables — add new months as they are loaded
const MONTH_TABLE_MAP = {
  '2026-04': 'tw_google_spend_apr2026',
  '2026-05': 'tw_google_spend_may2026',
  '2026-06': 'tw_google_spend_jun2026',
  '2026-07': 'tw_google_spend_jul2026',
  '2026-08': 'tw_google_spend_aug2026',
  '2026-09': 'tw_google_spend_sep2026',
};

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
  const fields = data.schema.fields.map(f => f.name);
  return data.rows.map(row => {
    const obj = {};
    row.f.forEach((cell, i) => {
      const v = cell.v;
      obj[fields[i]] = v === null ? null : (isNaN(v) ? v : Number(v));
    });
    return obj;
  });
}

async function bqQuery(token, query) {
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, useLegacySql: false, timeoutMs: 55000, maxResults: 500 }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  if (!data.jobComplete) {
    const jobId = data.jobReference.jobId;
    let poll;
    do {
      await new Promise(r => setTimeout(r, 1500));
      const pr = await fetch(
        `https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/queries/${jobId}?timeoutMs=15000`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      poll = await pr.json();
    } while (!poll.jobComplete);
    return parseRows(poll);
  }
  return parseRows(data);
}

// Build UNION ALL from recent months (last 2 months to cover milestone crossings near month boundaries)
function buildRecentUnion() {
  const now = new Date();
  const months = [];
  for (let i = 0; i <= 1; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (MONTH_TABLE_MAP[key]) months.push(MONTH_TABLE_MAP[key]);
  }
  if (!months.length) {
    // Fallback: last two known months
    const keys = Object.keys(MONTH_TABLE_MAP).sort().slice(-2);
    keys.forEach(k => months.push(MONTH_TABLE_MAP[k]));
  }
  return months.map(t =>
    `SELECT ad_name, event_date, total_spend FROM \`${PROJECT_ID}.${DATASET}.${t}\``
  ).join('\nUNION ALL\n');
}

function buildNewHitsQuery() {
  const union = buildRecentUnion();
  return `
WITH all_google AS (
  ${union}
),
-- Tier 1: Karen's manual map
gmap AS (
  SELECT ad_name, strategist
  FROM \`${PROJECT_ID}.reporting.google_ad_name_map\`
),
-- Tier 2a: brief ID → strategist from clickup_ready
cu_brief_ids AS (
  SELECT
    REGEXP_EXTRACT(ad_name, r'((?:AOG|OO|RSOO|RSBSO|BSO|CIN)-\\d+)') AS brief_id,
    ANY_VALUE(CASE WHEN UPPER(strategist) NOT IN ('UNKNOWN', 'UNASSIGNED') THEN strategist END) AS strategist
  FROM \`${PROJECT_ID}.${DATASET}.clickup_ready\`
  WHERE REGEXP_EXTRACT(ad_name, r'((?:AOG|OO|RSOO|RSBSO|BSO|CIN)-\\d+)') IS NOT NULL
  GROUP BY brief_id
),
-- Tier 2b: direct ad_name → strategist from clickup_ready
cu_ad_names AS (
  SELECT
    ad_name,
    ANY_VALUE(CASE WHEN UPPER(strategist) NOT IN ('UNKNOWN', 'UNASSIGNED') THEN strategist END) AS strategist
  FROM \`${PROJECT_ID}.${DATASET}.clickup_ready\`
  GROUP BY ad_name
),
ad_daily AS (
  SELECT
    g.ad_name,
    g.event_date,
    SUM(g.total_spend) AS daily_spend
  FROM all_google g
  GROUP BY g.ad_name, g.event_date
),
ad_cumulative AS (
  SELECT
    ad_name,
    event_date,
    SUM(daily_spend) OVER (PARTITION BY ad_name ORDER BY event_date) AS cumulative_spend
  FROM ad_daily
),
hit_5k AS (
  SELECT ad_name, MIN(event_date) AS date_hit_5k
  FROM ad_cumulative
  WHERE cumulative_spend >= 5000
  GROUP BY ad_name
),
hit_20k AS (
  SELECT ad_name, MIN(event_date) AS date_hit_20k
  FROM ad_cumulative
  WHERE cumulative_spend >= 20000
  GROUP BY ad_name
),
ad_totals AS (
  SELECT ad_name, ROUND(SUM(daily_spend), 2) AS total_spend
  FROM ad_daily
  GROUP BY ad_name
),
attributed AS (
  SELECT
    t.ad_name,
    t.total_spend,
    h5.date_hit_5k,
    h20.date_hit_20k,
    CASE
      WHEN COALESCE(
        gmap.strategist,
        cu_brief.strategist,
        cu_ad.strategist,
        REGEXP_EXTRACT(t.ad_name, r'_cs[_ ]*([A-Z][a-zA-Z]+)'),
        REGEXP_EXTRACT(t.ad_name, r'(?i)(?:^|[_ +\\-])(Liran|Farwa|Damia|Isaac|Iason|Tristan|Roman|Julija|Jaouad|Kevin|Owen|Thomas|Lauris|Zayd|Sam|Cosmin|Fotis|Marco|Emilis|Johnny|Lucas|Lukas|Airidas|Neil|Kandy|Adrian|David|Jamil|Mia|Martin|Will|Nina|Oliver|Brian|Aisha|Ezra|Dex|Georgio|Bilal)(?:[_ +\\-]|$)')
      ) IN ('Liran','Farwa','Damia') THEN 'Liran / Farwa'
      WHEN COALESCE(
        gmap.strategist,
        cu_brief.strategist,
        cu_ad.strategist,
        REGEXP_EXTRACT(t.ad_name, r'_cs[_ ]*([A-Z][a-zA-Z]+)'),
        REGEXP_EXTRACT(t.ad_name, r'(?i)(?:^|[_ +\\-])(Liran|Farwa|Damia|Isaac|Iason|Tristan|Roman|Julija|Jaouad|Kevin|Owen|Thomas|Lauris|Zayd|Sam|Cosmin|Fotis|Marco|Emilis|Johnny|Lucas|Lukas|Airidas|Neil|Kandy|Adrian|David|Jamil|Mia|Martin|Will|Nina|Oliver|Brian|Aisha|Ezra|Dex|Georgio|Bilal)(?:[_ +\\-]|$)')
      ) = 'Lukas' THEN 'Lucas'
      ELSE COALESCE(
        gmap.strategist,
        cu_brief.strategist,
        cu_ad.strategist,
        REGEXP_EXTRACT(t.ad_name, r'_cs[_ ]*([A-Z][a-zA-Z]+)'),
        REGEXP_EXTRACT(t.ad_name, r'(?i)(?:^|[_ +\\-])(Liran|Farwa|Damia|Isaac|Iason|Tristan|Roman|Julija|Jaouad|Kevin|Owen|Thomas|Lauris|Zayd|Sam|Cosmin|Fotis|Marco|Emilis|Johnny|Lucas|Lukas|Airidas|Neil|Kandy|Adrian|David|Jamil|Mia|Martin|Will|Nina|Oliver|Brian|Aisha|Ezra|Dex|Georgio|Bilal)(?:[_ +\\-]|$)'),
        CASE
          WHEN REGEXP_CONTAINS(t.ad_name, r'(?i)POD1[^0-9]')  THEN 'Adil Amarsi'
          WHEN REGEXP_CONTAINS(t.ad_name, r'(?i)POD2[^0-9]')  THEN 'Adrian'
          WHEN REGEXP_CONTAINS(t.ad_name, r'(?i)POD3[^0-9]')  THEN 'Airidas'
          WHEN REGEXP_CONTAINS(t.ad_name, r'(?i)POD25')        THEN 'Liran / Farwa'
          WHEN REGEXP_CONTAINS(t.ad_name, r'(?i)POD26')        THEN 'Liran / Farwa'
          WHEN REGEXP_CONTAINS(t.ad_name, r'(?i)POD27')        THEN 'Lucas'
        END
      )
    END AS strategist
  FROM ad_totals t
  JOIN hit_5k h5 ON h5.ad_name = t.ad_name
  LEFT JOIN hit_20k h20 ON h20.ad_name = t.ad_name
  LEFT JOIN gmap ON gmap.ad_name = t.ad_name
  LEFT JOIN cu_brief_ids cu_brief
    ON cu_brief.brief_id = REGEXP_EXTRACT(t.ad_name, r'((?:AOG|OO|RSOO|RSBSO|BSO|CIN)-\\d+)')
  LEFT JOIN cu_ad_names cu_ad ON cu_ad.ad_name = t.ad_name
)
SELECT
  ad_name,
  COALESCE(strategist, 'Unassigned') AS strategist,
  total_spend,
  date_hit_5k,
  date_hit_20k
FROM attributed
WHERE
  date_hit_5k  >= FORMAT_DATE('%Y-%m-%d', DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 3 DAY))
  OR (date_hit_20k IS NOT NULL AND date_hit_20k >= FORMAT_DATE('%Y-%m-%d', DATE_SUB(CURRENT_DATE('America/New_York'), INTERVAL 3 DAY)))
ORDER BY date_hit_5k DESC, total_spend DESC
`;
}

function buildResponse(rows) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 3);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const hits_5k  = {};
  const hits_20k = {};

  for (const row of rows) {
    const strategist = row.strategist || 'Unassigned';
    const entry = {
      ad_name:      row.ad_name,
      strategist,
      total_spend:  row.total_spend,
      date_hit_5k:  row.date_hit_5k,
      date_hit_20k: row.date_hit_20k,
    };
    if (row.date_hit_5k && row.date_hit_5k >= cutoffStr) {
      if (!hits_5k[strategist]) hits_5k[strategist] = [];
      hits_5k[strategist].push(entry);
    }
    if (row.date_hit_20k && row.date_hit_20k >= cutoffStr) {
      if (!hits_20k[strategist]) hits_20k[strategist] = [];
      hits_20k[strategist].push(entry);
    }
  }

  return { hits_5k, hits_20k };
}

export async function GET() {
  const query = buildNewHitsQuery();

  if (process.env.VERCEL) {
    try {
      const token = await getGcpToken();
      const rows  = await bqQuery(token, query);
      return Response.json(buildResponse(rows), { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      console.error(err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  try {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bq = new BigQuery({ projectId: PROJECT_ID });
    const [rows] = await bq.query({ query });
    return Response.json(buildResponse(rows));
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
