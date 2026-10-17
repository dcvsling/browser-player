import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Transpile the focused TypeScript module so tests also run on the CI's Node 20.
const source = await readFile(new URL('../src/player-update.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { checkForPlayerUpdate, createPlayerUpdateAction } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

class Worker extends EventTarget {
  constructor(state = 'installing') { super(); this.state = state; this.messages = []; }
  change(state) { this.state = state; this.dispatchEvent(new Event('statechange')); }
  postMessage(message) { this.messages.push(message); queueMicrotask(() => this.change('activated')); }
}
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const registration = (patch = {}) => ({ installing: null, waiting: null, update: async () => {}, ...patch });

test('does not report latest until the network check completes', async () => {
  let finish;
  let done = false;
  const reg = registration({ update: () => new Promise(resolve => { finish = resolve; }) });
  const check = checkForPlayerUpdate(reg, () => {}, () => {}).then(result => { done = true; return result; });
  await tick();
  assert.equal(done, false);
  finish();
  assert.equal(await check, 'latest');
});

test('waits for installation, saves settings, then activates waiting update', async () => {
  const worker = new Worker();
  const events = [];
  const reg = registration({ installing: worker });
  const check = checkForPlayerUpdate(reg, () => events.push('save'), () => events.push('updating'));
  await tick();
  assert.deepEqual(worker.messages, []);
  assert.deepEqual(events, ['updating']);
  reg.waiting = worker;
  reg.installing = null;
  worker.change('installed');
  assert.equal(await check, 'updated');
  assert.deepEqual(events, ['updating', 'updating', 'save']);
  assert.deepEqual(worker.messages, [{ type: 'SKIP_WAITING' }]);
});

test('activates an update already waiting before the click', async () => {
  const worker = new Worker('installed');
  assert.equal(await checkForPlayerUpdate(registration({ waiting: worker }), () => {}, () => {}), 'updated');
  assert.equal(worker.messages.length, 1);
});

test('failed install is an error, never latest', async () => {
  const worker = new Worker();
  const check = checkForPlayerUpdate(registration({ installing: worker }), () => {}, () => {});
  const rejected = assert.rejects(check, /安裝失敗/);
  await tick();
  worker.change('redundant');
  await rejected;
});

test('network failure, hung check and hung install reject', async () => {
  await assert.rejects(checkForPlayerUpdate(registration({ update: async () => { throw new Error('offline'); } }), () => {}, () => {}), /offline/);
  await assert.rejects(checkForPlayerUpdate(registration({ update: () => new Promise(() => {}) }), () => {}, () => {}, 5), /逾時/);
  await assert.rejects(checkForPlayerUpdate(registration({ installing: new Worker() }), () => {}, () => {}, 5), /逾時/);
});

test('activation timeout is retryable, and does not report latest', async () => {
  const worker = new Worker('installed');
  worker.postMessage = () => {};
  await assert.rejects(checkForPlayerUpdate(registration({ waiting: worker }), () => {}, () => {}, 5), /逾時/);
});

test('duplicate clicks are ignored; a failed check can be retried', async () => {
  let checks = 0;
  let fail;
  const states = [];
  const reg = registration({ update: () => { checks++; return new Promise((resolve, reject) => { fail = reject; }); } });
  const action = createPlayerUpdateAction({ getRegistration: async () => reg, beforeActivate: () => {}, onState: state => states.push(state), onUpdated: () => assert.fail('must not reload') });
  const first = action.check();
  await tick();
  await action.check();
  assert.equal(checks, 1);
  assert.equal(action.busy, true);
  fail(new Error('offline'));
  await first;
  assert.equal(action.busy, false);
  assert.deepEqual(states, ['checking', 'error']);
  reg.update = async () => { checks++; };
  await action.check();
  assert.deepEqual(states, ['checking', 'error', 'checking', 'latest']);
  assert.equal(checks, 2);
});

test('unsupported or failed registration shows error and can retry', async () => {
  const states = [];
  const action = createPlayerUpdateAction({ getRegistration: async () => undefined, beforeActivate: () => {}, onState: state => states.push(state), onUpdated: () => {} });
  await action.check();
  await action.check();
  assert.deepEqual(states, ['checking', 'error', 'checking', 'error']);
});

test('failed state persistence prevents activation', async () => {
  const worker = new Worker('installed');
  await assert.rejects(checkForPlayerUpdate(registration({ waiting: worker }), () => { throw new Error('quota'); }, () => {}), /quota/);
  assert.equal(worker.messages.length, 0);
});

test('successful update reloads once and never marks old page latest', async () => {
  const states = [];
  let reloads = 0;
  const action = createPlayerUpdateAction({ getRegistration: async () => registration({ waiting: new Worker('installed') }), beforeActivate: () => {}, onState: state => states.push(state), onUpdated: () => reloads++ });
  await action.check();
  assert.deepEqual(states, ['checking', 'updating']);
  assert.equal(reloads, 1);
});
