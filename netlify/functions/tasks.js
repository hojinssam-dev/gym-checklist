import { getStore } from '@netlify/blobs';

const SEED_TASKS = [
  {
    id: 'seed-1100',
    time: '11:00',
    tasks: [
      { id: 'seed-1100-1', text: '정수기 주변 청소' },
      { id: 'seed-1100-2', text: '화장실 점검' }
    ]
  },
  {
    id: 'seed-1200',
    time: '12:00',
    tasks: [
      { id: 'seed-1200-1', text: '원판 정리' },
      { id: 'seed-1200-2', text: '기구 위 먼지 닦기' }
    ]
  }
];

function verify(id, pin) {
  const envId = process.env.ADMIN_ID;
  const envPin = process.env.ADMIN_PIN;
  if (!envId || !envPin) return false;
  return id === envId && String(pin) === String(envPin);
}

export default async (req) => {
  const store = getStore('gym-checklist');

  if (req.method === 'GET') {
    const data = await store.get('tasks', { type: 'json' });
    return new Response(JSON.stringify({ tasks: data || SEED_TASKS }), {
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

    const { id, pin, tasks, verifyOnly } = body;

    if (!verify(id, pin)) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }

    if (verifyOnly) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!Array.isArray(tasks)) {
      return new Response(JSON.stringify({ error: 'invalid tasks' }), { status: 400 });
    }

    await store.setJSON('tasks', tasks);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
