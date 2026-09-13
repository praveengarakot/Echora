const endpoint = process.env.MIDNIGHT_INDEXER_URL || 'http://127.0.0.1:8088/api/v4/graphql';
for (let attempt = 1; attempt <= 120; attempt += 1) {
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: '{ blocks(limit: 1) { height } }' }) });
    const payload = await response.json();
    if (payload.data?.blocks?.[0]?.height >= 0) { console.log('Local Midnight indexer is ready.'); process.exit(0); }
  } catch { /* retry */ }
  console.log(`Waiting for local network (${attempt}/120)…`);
  await new Promise((resolve) => setTimeout(resolve, 5000));
}
console.error('Local network did not become ready.'); process.exit(1);
