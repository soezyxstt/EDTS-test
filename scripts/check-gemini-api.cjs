// Read-only provider smoke test using a synthetic prompt; never prints the API key.
require('@next/env').loadEnvConfig(process.cwd(), true);
(async () => {
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  if (process.argv.includes('--diagnose')) {
    const key = process.env.GEMINI_API_KEY;
    const simple = { contents: [{ parts: [{ text: 'Reply with OK.' }] }] };
    const probes = [
      { name: 'model-metadata', url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`, key },
      { name: 'minimal-generation', url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, key, body: simple },
      { name: 'invalid-key-control', url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, key: 'invalid-synthetic-test-key', body: simple },
    ];
    const results = await Promise.allSettled(probes.map(async (probe) => {
      const started = Date.now();
      const response = await fetch(probe.url, { method: probe.body ? 'POST' : 'GET',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': probe.key },
        ...(probe.body ? { body: JSON.stringify(probe.body) } : {}), signal: AbortSignal.timeout(20000) });
      const data = await response.json();
      return { probe: probe.name, model, httpStatus: response.status, elapsedMs: Date.now() - started,
        server: response.headers.get('server'), errorStatus: data.error?.status,
        errorMessage: data.error?.message?.replaceAll(key, '[redacted]'),
        supportedMethods: data.supportedGenerationMethods, hasCandidates: Boolean(data.candidates?.length) };
    }));
    results.forEach((result) => console.log(JSON.stringify(result.status === 'fulfilled' ? result.value : { failure: result.reason.name, code: result.reason.cause?.code })));
    return;
  }
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Return a JSON object with status set to ok.' }] }], generationConfig: {
      responseFormat: { text: { mimeType: 'APPLICATION_JSON', schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } } },
    } }),
  });
  const data = await response.json();
  console.log(JSON.stringify({ model, httpStatus: response.status, errorStatus: data.error?.status,
    errorMessage: data.error?.message?.replaceAll(process.env.GEMINI_API_KEY, '[redacted]'), hasCandidates: Boolean(data.candidates?.length) }));
  if (!response.ok) process.exitCode = 1;
})().catch((error) => { console.log(JSON.stringify({ failure: error.name, code: error.cause?.code })); process.exitCode = 1; });
