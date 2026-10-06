// Node 24+: node scripts/check-program-fields.cjs
const assert = require('node:assert/strict');
require('node:module').registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.endsWith(".ts") && specifier.startsWith("./") && !require("node:path").extname(specifier)) specifier += ".ts";
  return next(specifier === '@/lib/demo-session' ? new URL('../lib/demo-session.ts', require('node:url').pathToFileURL(__filename)).href : specifier, context);
} });
process.env.NODE_ENV = 'development';
const { DEMO_PROGRAMS, readDemoPrograms } = require('../lib/demo-data.ts');
const storage = new Map();
global.window = { localStorage: {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
} };
const key = 'franchise-prototype:programs:v2';
const programs = structuredClone(DEMO_PROGRAMS);
for (const program of programs) {
  program.fields.find((field) => field.id === 'businessProfile').label = 'Profil bisnis atau CV';
  program.fields = program.fields.filter((field) => field.id !== 'siteArea');
}
storage.set(key, JSON.stringify(programs));
for (const program of readDemoPrograms()) {
  assert.equal(program.fields.find((field) => field.id === 'businessProfile').label, 'Profil bisnis');
  assert.equal(program.fields.filter((field) => /CV/.test(field.label)).length, 1);
  assert.ok(!program.fields.some((field) => field.id === 'siteArea'), 'Keep admin-deleted fields removed');
}
const saved = storage.get(key);
readDemoPrograms();
assert.equal(storage.get(key), saved, 'Migration is idempotent');
programs[0].fields.find((field) => field.id === 'businessProfile').label = 'Dokumen usaha khusus';
storage.set(key, JSON.stringify(programs));
assert.equal(readDemoPrograms()[0].fields.find((field) => field.id === 'businessProfile').label, 'Dokumen usaha khusus');
console.log('PASS: legacy label fixed, one CV field, custom fields preserved, idempotent');
