import { getStore } from '@netlify/blobs';

function isValidDate(d) {
  return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// 체크 상태는 "그날 하루치 통짜 객체" 대신 항목별로 독립된 키(checks:{date}:{taskId})에 저장함.
// 이렇게 하면 여러 항목을 동시에 체크해도 서로 다른 키에 각각 쓰기 때문에
// "읽고 - 수정하고 - 통째로 다시 쓰기" 과정에서 다른 요청 결과를 덮어쓰는 문제가 생기지 않음.
function keyFor(date, taskId) {
  return `checks:${date}:${encodeURIComponent(taskId)}`;
}

function verify(id, pin) {
  const envId = process.env.ADMIN_ID;
  const envPin = process.env.ADMIN_PIN;
  if (!envId || !envPin) return false;
  return id === envId && String(pin) === String(envPin);
}

export default async (req) => {
  const store = getStore('gym-checklist');
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const date = url.searchParams.get('date');
    if (!isValidDate(date)) {
      return new Response(JSON.stringify({ error: 'invalid date' }), { status: 400 });
    }
    const prefix = `checks:${date}:`;
    const { blobs } = await store.list({ prefix });
    const checks = {};
    for (const b of blobs) {
      const taskId = decodeURIComponent(b.key.slice(prefix.length));
      checks[taskId] = true;
    }
    return new Response(JSON.stringify({ checks }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
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
    const key = keyFor(date, taskId);
    if (checked) {
      await store.setJSON(key, true);
    } else {
      try {
        await store.delete(key);
      } catch (e) {
        // 이미 없는 키를 지우려는 경우는 무시 (이미 체크 해제된 상태와 동일한 결과이므로 문제 없음)
      }
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  if (req.method === 'DELETE') {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400 });
    }
    const { id, pin, date } = body;
    if (!verify(id, pin)) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 });
    }
    if (!isValidDate(date)) {
      return new Response(JSON.stringify({ error: 'invalid date' }), { status: 400 });
    }
    const prefix = `checks:${date}:`;
    const { blobs } = await store.list({ prefix });
    await Promise.all(blobs.map((b) => store.delete(b.key)));
    return new Response(JSON.stringify({ ok: true, deleted: blobs.length }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  }

  return new Response('Method Not Allowed', { status: 405 });
};
