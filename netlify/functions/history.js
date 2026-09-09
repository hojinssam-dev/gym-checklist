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

  const { blobs } = await store.list({ prefix: 'checks:' });
  const dates = blobs
    .map((b) => b.key.replace('checks:', ''))
    .sort()
    .reverse()
    .slice(0, limit);

  const records = {};
  for (const date of dates) {
    records[date] = (await store.get(`checks:${date}`, { type: 'json' })) || {};
  }

  return new Response(JSON.stringify({ records }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
