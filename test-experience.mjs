import assert from 'node:assert/strict';
import {Experience} from './dist/experience.mjs';

const advance = (experience, seconds) => {
  for (let i = 0; i < seconds * 20; i++) experience.tick(.05);
};

const normal = new Experience();
advance(normal, 3);
assert.equal(normal.sim.time, 0);
assert.equal(normal.sim.stats.sent, 0);
normal.play();
advance(normal, 4);
assert(normal.sim.progress > 0);
normal.play();
const stoppedAt = normal.sim.progress;
advance(normal, 2);
assert.equal(normal.sim.progress, stoppedAt);
normal.play();
advance(normal, 55);
assert(normal.completed);
assert(normal.sim.received);
assert(normal.sim.paused);
assert.equal(normal.sim.progress, 1);

normal.toggleNode('R4');
advance(normal, 3);
assert(!normal.sim.route.includes('R4'));
assert(normal.sim.route.length > 0);
normal.play();
assert(!normal.completed);
assert(normal.started);
assert.equal(normal.sim.progress, 0);
assert(normal.sim.nodes.every(node => node.status === 'online'));

const manual = new Experience();
manual.toggleNode('R4');
advance(manual, 10);
assert.equal(manual.sim.progress, 0);
assert(manual.sim.received);
assert(!manual.sim.route.includes('R4'));
manual.play();
advance(manual, 55);
assert(manual.completed);
assert.equal(manual.sim.node('R4').status, 'offline');

const disconnected = new Experience();
disconnected.toggleNode('RSU-01');
advance(disconnected, 4);
assert.deepEqual(disconnected.sim.route, []);
disconnected.toggleNode('RSU-01');
advance(disconnected, 10);
assert(disconnected.sim.received);
assert(disconnected.sim.route.length > 0);
disconnected.reset();
assert.equal(disconnected.sim.time, 0);
assert.equal(disconnected.sim.routeComparison, null);
assert(disconnected.sim.paused);
assert(!disconnected.started);
assert.equal(disconnected.toggleNode('HOSP-01'), false);

console.log('Experience checks passed: idle, start, pause/resume, completion, replay, node failure, recovery and restart.');
