import { getStore } from '@netlify/blobs';

function isValidDate(d) {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

export default async (req) => {
  const store = getStore('gym-checklist');
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const date = url.searchParams.get('date');
    if (!isValidDate(date)) {
      return new Response(JSON.stringify({ error: 'invalid date' }), { status: 400 });
    }
    const data = await store.get(`checks:${date}`, { type: 'json' });
    return new Response(JSON.stringify({ checks: data || {} }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'POST') {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400 });
    }
    const { date, taskId, checked } = body;
    if (!isValidDate(date) || !taskId) {
      return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400 });
    }
    const key = `checks:${date}`;
    const current = (await store.get(key, { type: 'json' })) || {};
    if (checked) {
      current[taskId] = true;
    } else {
      delete current[taskId];
    }
    await store.setJSON(key, current);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
