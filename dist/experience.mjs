import {Simulation} from './engine.mjs';

// One manual journey. The network engine remains the source of routing and delivery data.
export class Experience {
  constructor() {
    this.sim = new Simulation();
    this.reset();
  }

  reset() {
    this.sim.reset();
    this.sim.stream = false;
    this.sim.paused = true;
    this.started = false;
    this.completed = false;
    this.completedAt = null;
    this.arrivedAt = null;
  }

  play() {
    if (this.completed) this.reset();
    if (!this.started) {
      this.started = true;
      this.sim.activate();
      this.sim.stream = true;
      this.sim.paused = false;
    } else {
      this.sim.paused = !this.sim.paused;
    }
  }

  toggleNode(id) {
    const node = this.sim.node(id);
    if (!node || !['Router', 'RSU'].includes(node.type)) return false;
    if (node.status === 'offline') this.sim.restoreNode(id);
    else this.sim.failNode(id);
    this.sim.selection = id;
    // Editing a route while paused must not restart the vehicle.
    if (!this.started || this.completed) this.sim.paused = false;
    this.sim.stream = true;
    this.sim.schedule(2.1, () => this.sim.send('Emergency alert', {protocol: 'UDP'}));
    return true;
  }

  tick(dt) {
    this.sim.tick(dt);
    if (!this.started || this.completed || this.sim.progress < 1) return;
    this.arrivedAt ??= this.sim.time;
    this.sim.stream = false;
    // Let the last messages arrive before stopping the journey.
    if (this.sim.received && (this.sim.metrics().active === 0 || this.sim.time - this.arrivedAt >= 5)) {
      this.completed = true;
      this.completedAt = this.sim.time;
      this.sim.paused = true;
    }
  }
}
