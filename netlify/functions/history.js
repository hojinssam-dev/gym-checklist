import { getStore } from '@netlify/blobs';

function verify(id, pin) {
  const envId = process.env.ADMIN_ID;
  const envPin = process.env.ADMIN_PIN;
  if (!envId || !envPin) return false;
  return id === envId && String(pin) === String(envPin);
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400 });
  }

  const { id, pin, days } = body;
  if (!verify(id, pin)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
  }

  const store = getStore('gym-checklist');
  const limit = Math.min(Math.max(days || 30, 1), 90);

  // 키 형태: checks:{date}:{taskId}  (예: checks:2026-09-09:ab12cd3)
  const { blobs } = await store.list({ prefix: 'checks:' });

  const records = {};
  for (const b of blobs) {
    const rest = b.key.slice('checks:'.length); // "{date}:{taskId}"
    const sepIndex = rest.indexOf(':');
    if (sepIndex === -1) continue;
    const date = rest.slice(0, sepIndex);
    const taskId = decodeURIComponent(rest.slice(sepIndex + 1));
    if (!records[date]) records[date] = {};
    records[date][taskId] = true;
  }

  const limitedDates = Object.keys(records).sort().reverse().slice(0, limit);
  const limitedRecords = {};
  for (const date of limitedDates) {
    limitedRecords[date] = records[date];
  }

  return new Response(JSON.stringify({ records: limitedRecords }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
