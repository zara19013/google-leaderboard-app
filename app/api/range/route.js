export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const PROJECT_ID     = 'zendesk-488615';
const PROJECT_NUMBER = '5433699000';
const POOL_ID        = 'vercel-pool';
const PROVIDER_ID    = 'vercel-provider';
const SERVICE_ACCOUNT = 'leaderboard-app-368@zendesk-488615.iam.gserviceaccount.com';
const DATASET        = 'datads_raw';

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
    body: JSON.stringify({ query, useLegacySql: false, timeoutMs: 55000, maxResults: 200 }),
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

// Get all month tables that cover the given date range
function getTablesForRange(start, end) {
  const startMonth = start.substring(0, 7);
  const endMonth   = end.substring(0, 7);
  return Object.entries(MONTH_TABLE_MAP)
    .filter(([month]) => month >= startMonth && month <= endMonth)
    .map(([, table]) => table);
}

function buildRangeQuery(start, end) {
  const tables = getTablesForRange(start, end);
  if (!tables.length) throw new Error(`No Google spend tables found for ${start} – ${end}`);

  const union = tables.map(t =>
    `SELECT ad_name, event_date, total_spend FROM \`${PROJECT_ID}.${DATASET}.${t}\``
  ).join('\nUNION ALL\n');

  return `
WITH all_google AS (
  ${union}
),
filtered AS (
  SELECT ad_name, total_spend
  FROM all_google
  WHERE event_date BETWEEN '${start}' AND '${end}'
    AND total_spend > 0
),
cu_brief_ids AS (
  SELECT
    REGEXP_EXTRACT(ad_name, r'((?:AOG|OO|RSOO|RSBSO|BSO|CIN)-\\d+)') AS brief_id,
    ANY_VALUE(CASE WHEN UPPER(strategist) NOT IN ('UNKNOWN', 'UNASSIGNED') THEN strategist END) AS strategist
  FROM \`${PROJECT_ID}.${DATASET}.clickup_ready\`
  WHERE REGEXP_EXTRACT(ad_name, r'((?:AOG|OO|RSOO|RSBSO|BSO|CIN)-\\d+)') IS NOT NULL
  GROUP BY brief_id
),
cu_ad_names AS (
  SELECT
    ad_name,
    ANY_VALUE(CASE WHEN UPPER(strategist) NOT IN ('UNKNOWN', 'UNASSIGNED') THEN strategist END) AS strategist
  FROM \`${PROJECT_ID}.${DATASET}.clickup_ready\`
  GROUP BY ad_name
),
attr AS (
  SELECT
    f.ad_name,
    f.total_spend,
    CASE
      WHEN COALESCE(
        cu_brief.strategist, cu_ad.strategist,
        REGEXP_EXTRACT(f.ad_name, r'_cs[_ ]*([A-Z][a-zA-Z]+)'),
        REGEXP_EXTRACT(f.ad_name, r'(?i)(?:^|[_ +\\-])(Liran|Farwa|Damia|Isaac|Iason|Tristan|Roman|Julija|Jaouad|Kevin|Owen|Thomas|Lauris|Zayd|Sam|Cosmin|Fotis|Marco|Emilis|Johnny|Lucas|Lukas|Airidas|Neil|Kandy|Adrian|David|Jamil|Mia|Martin|Will|Nina|Oliver|Brian|Aisha|Ezra|Dex|Georgio|Bilal)(?:[_ +\\-]|$)')
      ) IN ('Liran','Farwa','Damia') THEN 'Liran / Farwa'
      WHEN COALESCE(
        cu_brief.strategist, cu_ad.strategist,
        REGEXP_EXTRACT(f.ad_name, r'_cs[_ ]*([A-Z][a-zA-Z]+)'),
        REGEXP_EXTRACT(f.ad_name, r'(?i)(?:^|[_ +\\-])(Liran|Farwa|Damia|Isaac|Iason|Tristan|Roman|Julija|Jaouad|Kevin|Owen|Thomas|Lauris|Zayd|Sam|Cosmin|Fotis|Marco|Emilis|Johnny|Lucas|Lukas|Airidas|Neil|Kandy|Adrian|David|Jamil|Mia|Martin|Will|Nina|Oliver|Brian|Aisha|Ezra|Dex|Georgio|Bilal)(?:[_ +\\-]|$)')
      ) = 'Lukas' THEN 'Lucas'
      ELSE COALESCE(
        cu_brief.strategist, cu_ad.strategist,
        REGEXP_EXTRACT(f.ad_name, r'_cs[_ ]*([A-Z][a-zA-Z]+)'),
        REGEXP_EXTRACT(f.ad_name, r'(?i)(?:^|[_ +\\-])(Liran|Farwa|Damia|Isaac|Iason|Tristan|Roman|Julija|Jaouad|Kevin|Owen|Thomas|Lauris|Zayd|Sam|Cosmin|Fotis|Marco|Emilis|Johnny|Lucas|Lukas|Airidas|Neil|Kandy|Adrian|David|Jamil|Mia|Martin|Will|Nina|Oliver|Brian|Aisha|Ezra|Dex|Georgio|Bilal)(?:[_ +\\-]|$)'),
        CASE
          WHEN REGEXP_CONTAINS(f.ad_name, r'(?i)POD1[^0-9]')  THEN 'Adil Amarsi'
          WHEN REGEXP_CONTAINS(f.ad_name, r'(?i)POD2[^0-9]')  THEN 'Adrian'
          WHEN REGEXP_CONTAINS(f.ad_name, r'(?i)POD3[^0-9]')  THEN 'Airidas'
          WHEN REGEXP_CONTAINS(f.ad_name, r'(?i)POD25')        THEN 'Liran / Farwa'
          WHEN REGEXP_CONTAINS(f.ad_name, r'(?i)POD26')        THEN 'Liran / Farwa'
          WHEN REGEXP_CONTAINS(f.ad_name, r'(?i)POD27')        THEN 'Lucas'
        END
      )
    END AS strategist
  FROM filtered f
  LEFT JOIN cu_brief_ids cu_brief
    ON cu_brief.brief_id = REGEXP_EXTRACT(f.ad_name, r'((?:AOG|OO|RSOO|RSBSO|BSO|CIN)-\\d+)')
  LEFT JOIN cu_ad_names cu_ad ON cu_ad.ad_name = f.ad_name
)
SELECT
  COALESCE(strategist, 'Unassigned') AS strategist,
  ROUND(SUM(total_spend), 2)         AS total_spend,
  COUNT(DISTINCT ad_name)            AS ads_tested
FROM attr
GROUP BY COALESCE(strategist, 'Unassigned')
ORDER BY total_spend DESC
`;
}

function buildTotalQuery(start, end) {
  const tables = getTablesForRange(start, end);
  if (!tables.length) return null;
  const union = tables.map(t =>
    `SELECT total_spend, ad_name FROM \`${PROJECT_ID}.${DATASET}.${t}\``
  ).join('\nUNION ALL\n');
  return `
SELECT
  ROUND(SUM(total_spend), 2) AS total_spend,
  COUNT(DISTINCT ad_name)    AS total_ads
FROM (${union})
WHERE total_spend > 0
`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const start = searchParams.get('start');
  const end   = searchParams.get('end');

  if (!start || !end) {
    return Response.json({ error: 'start and end params required' }, { status: 400 });
  }
  if (start > end) {
    return Response.json({ error: 'start must be before end' }, { status: 400 });
  }

  let rangeQuery, totalQuery;
  try {
    rangeQuery = buildRangeQuery(start, end);
    totalQuery = buildTotalQuery(start, end);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }

  if (process.env.VERCEL) {
    try {
      const token = await getGcpToken();
      const [rows, totals] = await Promise.all([
        bqQuery(token, rangeQuery),
        totalQuery ? bqQuery(token, totalQuery) : Promise.resolve([]),
      ]);
      const known    = rows.filter(r => r.strategist !== 'Unassigned');
      const unassigned = rows.find(r => r.strategist === 'Unassigned');
      return Response.json({
        start, end,
        data:             known,
        unassigned_spend: unassigned?.total_spend || 0,
        total_spend:      totals[0]?.total_spend  || 0,
        total_ads:        totals[0]?.total_ads    || 0,
      }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (err) {
      console.error(err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  try {
    const { BigQuery } = await import('@google-cloud/bigquery');
    const bq = new BigQuery({ projectId: PROJECT_ID });
    const [[rows], [totals]] = await Promise.all([
      bq.query({ query: rangeQuery }),
      totalQuery ? bq.query({ query: totalQuery }) : Promise.resolve([[{}]]),
    ]);
    const known      = rows.filter(r => r.strategist !== 'Unassigned');
    const unassigned = rows.find(r => r.strategist === 'Unassigned');
    return Response.json({
      start, end,
      data:             known,
      unassigned_spend: unassigned?.total_spend || 0,
      total_spend:      totals[0]?.total_spend  || 0,
      total_ads:        totals[0]?.total_ads    || 0,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
