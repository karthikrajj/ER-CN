import {City} from './city.mjs';
import {Experience} from './experience.mjs';
import {mountPages} from './pages.mjs';

const $ = id => document.getElementById(id);
const experience = new Experience();
const sim = experience.sim;
const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
let city;
let lastPaint = 0;
let toastTimer;
let lastDialogHTML = '';

const nodeName = node => node.type === 'Router' ? `Router ${node.id.slice(1)}` : `Antenna ${Number(node.id.slice(-2))}`;
const controllableNodes = sim.nodes.filter(node => ['Router','RSU'].includes(node.type)).sort((a,b) => (a.type === 'Router' ? 0 : 1) - (b.type === 'Router' ? 0 : 1));
$('node-select').innerHTML = controllableNodes.map(node => `<option value="${node.id}">${nodeName(node)} (${node.id})</option>`).join('');
$('node-select').value = 'R4';

function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => $('toast').hidden = true, 3000);
}

function setView(name) {
  city?.view(name);
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === name)));
}

try {
  city = new City($('city'), sim, id => {
    const node = sim.node(id);
    if (!node) return;
    sim.selection = id;
    if (['Router','RSU'].includes(node.type)) {
      $('node-select').value = id;
      paint(true);
    } else {
      toast(node.type === 'Ambulance' ? 'The ambulance sends its location and emergency messages.' : node.type === 'Hospital' ? 'The hospital receives the emergency messages.' : node.type === 'Control center' ? 'The control center passes the alert to the hospital.' : `${node.type} vehicle on the city network.`);
    }
  });
} catch (error) {
  $('scene-error').hidden = false;
  $('scene-error').textContent = 'The 3D city needs WebGL. Enable hardware acceleration in your browser and reload.';
  console.error(error);
}

function reset() {
  experience.reset();
  $('node-select').value = 'R4';
  if ($('route-dialog').open) $('route-dialog').close();
  $('toast').hidden = true;
  clearTimeout(toastTimer);
  setView('City view');
  paint(true);
}

$('play').onclick = () => {
  if (experience.completed) reset();
  experience.play();
  paint(true);
};
$('restart').onclick = reset;
$('node-select').onchange = () => {
  sim.selection = $('node-select').value;
  paint(true);
};
$('node-toggle').onclick = () => {
  experience.toggleNode($('node-select').value);
  if (!city?.follow) setView('City view');
  paint(true);
};
for (const button of document.querySelectorAll('[data-view]')) button.onclick = () => setView(button.dataset.view);
$('compare').onclick = () => {
  renderComparison();
  $('route-dialog').showModal();
};
$('close-dialog').onclick = () => $('route-dialog').close();
$('route-dialog').addEventListener('click', event => {
  if (event.target !== $('route-dialog')) return;
  const bounds = $('route-dialog').getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) $('route-dialog').close();
});

function comparisonPath(snapshot, other) {
  if (!snapshot.path.length) return '<span class="route-empty">No route to the hospital</span>';
  return snapshot.path.map(id => {
    const label = id === 'AMB-01' ? 'Ambulance' : id === 'HOSP-01' ? 'Hospital' : id === 'CTRL' ? 'Control' : id;
    return `<span class="route-node ${other.path.includes(id) ? '' : 'changed'}">${escape(label)}</span>`;
  }).join('<span class="route-arrow" aria-hidden="true">→</span>');
}

function renderComparison() {
  const comparison = sim.routeComparison;
  if (!comparison) return;
  const {before, after, nodeId, action, road} = comparison;
  const pending = sim.time < comparison.readyAt;
  const arrived = road.after.arrived;
  $('route-title').textContent = arrived ? 'The ambulance has already arrived.'
    : road.after.blocked ? 'No open road to the hospital.'
    : road.changed ? 'The ambulance has a new route.' : 'The road route is still clear.';
  const roadRow = (label, snapshot, other, side) => {
    const path = snapshot.arrived ? '<span class="route-empty">At the hospital</span>'
      : snapshot.blocked ? '<span class="route-empty">No open route</span>'
      : snapshot.streets.map(street => `<span class="route-node ${other.streets.includes(street) ? '' : 'changed'}">${escape(street)}</span>`).join('<span class="route-arrow" aria-hidden="true">→</span>');
    return `<section class="route-row ${side}"><div class="route-row-head"><strong>${label}</strong><span>${snapshot.distance === null ? 'Waiting' : `${Math.round(snapshot.distance)} m remaining`}</span></div><div class="route-path">${path}</div></section>`;
  };
  const roadSummary = arrived ? 'Try Run again to start a new journey.'
    : road.after.blocked ? 'The ambulance will wait here. Restore a node to open a road.'
    : road.changed ? `${nodeId} ${action === 'disabled' ? 'is offline' : 'is restored'}. Follow the new amber road line to the hospital.`
    : `${nodeId} ${action === 'disabled' ? 'is offline' : 'is restored'}. The remaining road route already avoids that checkpoint.`;
  const messageRow = (label, snapshot, other, side) => `<section class="route-row ${side}"><div class="route-row-head"><strong>${label}</strong><span>${pending && side === 'after' ? 'Calculating…' : snapshot.path.length ? `${snapshot.delay.toFixed(1)} ms · ${snapshot.hops} connections` : 'Unavailable'}</span></div><div class="route-path">${pending && side === 'after' ? '<span class="route-empty">Choosing an available path…</span>' : comparisonPath(snapshot, other)}</div></section>`;
  const html = roadRow('Road before', road.before, road.after, 'before') + roadRow('Road after', road.after, road.before, 'after')
    + `<p class="comparison-summary ${road.after.blocked ? 'warning' : ''}">${escape(roadSummary)}</p>`
    + `<details class="message-comparison"><summary>Message route</summary>${messageRow('Before',before,after,'before')}${messageRow('After',after,before,'after')}</details>`;
  if (html !== lastDialogHTML) {
    const expanded = $('comparison-content').querySelector('details')?.open;
    $('comparison-content').innerHTML = html;
    if (expanded) $('comparison-content').querySelector('details').open = true;
    lastDialogHTML = html;
  }
}

function paint(force = false) {
  if (!force && performance.now() - lastPaint < 120) return;
  lastPaint = performance.now();
  const running = experience.started && !experience.completed && !sim.paused;
  $('play-label').textContent = experience.completed ? 'Run again' : !experience.started ? 'Start ambulance' : sim.paused ? 'Resume journey' : 'Pause journey';
  $('play-icon').textContent = running ? 'Ⅱ' : '▶';
  $('play-hint').textContent = experience.completed ? 'Try again with a different node.' : experience.started ? 'You can pause at any point.' : 'You control when a failure happens.';
  const node = sim.node($('node-select').value);
  const offline = node.status === 'offline';
  $('node-toggle').textContent = offline ? 'Restore node' : 'Disable node';
  $('node-toggle').classList.toggle('restore', offline);
  const nodeState = `<span></span>${escape(node.id)} is ${offline ? 'offline' : 'online'}`;
  if ($('node-state').innerHTML !== nodeState) $('node-state').innerHTML = nodeState;
  $('node-state').classList.toggle('offline', offline);
  $('compare').hidden = !sim.routeComparison;
  $('progress-label').hidden = !experience.started;
  $('progress-label').textContent = `${Math.round(sim.progress * 100)}%`;
  $('progress-fill').style.width = `${sim.progress * 100}%`;
  let title = 'Ready when you are.';
  let detail = 'Start the ambulance, then try switching off a node.';
  let state = '';
  const comparison = sim.routeComparison;
  const recent = comparison && (!experience.completed || comparison.time >= experience.completedAt)
    && (!experience.started || sim.time - comparison.time < 9);
  if (sim.road.blocked) {
    title = 'No open road to the hospital.';
    detail = 'The ambulance is waiting. Restore a node to open a route.';
    state = 'warning';
  } else if (experience.completed) {
    title = 'Ambulance arrived. Hospital notified.';
    detail = 'Run again to try a different road detour.';
    state = 'active';
  } else if (experience.started && sim.paused) {
    title = recent && comparison.road.changed ? 'New road route ready.' : 'Journey paused.';
    detail = recent && comparison.road.changed ? 'Resume to follow the new amber line to the hospital.' : 'Resume whenever you’re ready.';
  } else if (sim.time < sim.recalcUntil) {
    title = comparison?.road.changed ? 'Rerouting the ambulance…' : 'Updating the message route…';
    detail = comparison?.road.changed ? 'The new amber line avoids the offline node. The ambulance will follow it.' : 'The remaining road route is clear. The network is reconnecting.';
    state = 'warning';
  } else if (recent) {
    title = comparison.road.after.arrived ? 'Ambulance arrived.' : comparison.road.changed
      ? comparison.action === 'restored' ? 'Road route updated.' : 'Ambulance rerouted.'
      : comparison.action === 'restored' ? `${comparison.nodeId} is back online.` : 'This node is off the road route.';
    detail = comparison.road.changed ? 'Follow the new amber line to the hospital.' : 'The ambulance can keep using the current road route.';
    if (!sim.route.length) detail += ' Messages are disconnected.';
    state = 'active';
  } else if (experience.started) {
    title = sim.progress >= 1 ? 'Ambulance arrived. Finishing delivery…' : comparison?.road.changed ? 'The ambulance is taking the detour.' : 'The ambulance is on its way.';
    detail = !sim.route.length ? 'Messages are disconnected. Restore a node to reconnect.'
      : sim.received ? 'The hospital has received the alert. Follow the amber road line.' : 'Amber guides the ambulance. Green carries the emergency messages.';
    state = sim.route.length ? 'active' : 'warning';
  } else if (!sim.route.length) {
    title = 'Messages are disconnected.';
    detail = 'Restore an offline node to reconnect with the hospital.';
    state = 'warning';
  }
  $('status-title').textContent = title;
  $('status-detail').textContent = detail;
  $('status-dot').className = `status-dot ${state}`;
  if ($('route-dialog').open) renderComparison();
}

const pages = mountPages({experience,onReturn:()=>{city?.resize();paint(true);}});

let previousTime = performance.now();
setInterval(() => {
  const now = performance.now();
  let remaining = Math.min(1, (now - previousTime) / 1000);
  previousTime = now;
  while (remaining > 0) {
    const dt = Math.min(.05, remaining);
    experience.tick(dt);
    remaining -= dt;
  }
  paint();
}, 50);
paint(true);

if (document.modelContext?.registerTool) {
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), {once: true});
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'read_network_simulation',
      description: 'Read the local educational journey, current route, node status and delivery counts.',
      inputSchema: {type: 'object', properties: {}, additionalProperties: false},
      annotations: {readOnlyHint: true, untrustedContentHint: false},
      execute: () => ({page: pages.current, started: experience.started, completed: experience.completed, paused: sim.paused, progress: sim.progress, time: sim.time, road: sim.road.snapshot(), ambulance: {...sim.road.position}, roadClosures: sim.road.closures, route: sim.route, stats: {...sim.stats}, hospitalReceived: sim.received, nodes: sim.nodes.map(({id,status}) => ({id,status})), comparison: sim.routeComparison})
    }, {signal: lifecycle.signal})).catch(() => {});
  } catch {}
}
