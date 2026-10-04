// Road coordinates match the streets drawn by City. A failed device creates a
// simulated closure at its nearest road checkpoint; this is a teaching scenario.
export const ROAD = [[-42,30],[-20,30],[-20,0],[20,0],[20,-30],[34,-30]];
const XS = [-48,-20,20,48];
const ZS = [0,-30,30];
const EPS = 1e-7;
const distance = (a,b) => Math.hypot(b[0]-a[0],b[1]-a[1]);
const same = (a,b) => distance(a,b) < EPS;
const key = point => point.map(value => Number(value.toFixed(7))).join(',');
export const pathLength = path => path.slice(1).reduce((total,point,i) => total + distance(path[i],point),0);
export const ROAD_SPEED = pathLength(ROAD) / 43;

function onSegment(point,a,b) {
  return Math.abs(distance(a,point) + distance(point,b) - distance(a,b)) < EPS;
}

function simplify(path) {
  const result = [];
  for (const point of path) {
    if (result.length && same(result.at(-1),point)) continue;
    if (result.length > 1 && onSegment(result.at(-1),result.at(-2),point)) result.pop();
    result.push([...point]);
  }
  return result;
}

export function roadCheckpoint(node) {
  // Deterministic ties favor the central east-west street.
  const candidates = [
    ...ZS.map(z => [Math.max(-48,Math.min(48,node.x)),z]),
    ...XS.map(x => [x,Math.max(-30,Math.min(30,node.z))])
  ];
  return candidates.sort((a,b) => distance(a,[node.x,node.z]) - distance(b,[node.x,node.z]))[0];
}

export function streetNames(path) {
  const names = [];
  for (let i = 1; i < path.length; i++) {
    const [a,b] = [path[i-1],path[i]];
    const name = Math.abs(a[1]-b[1]) < EPS
      ? ({'-30':'North road','0':'Central road','30':'South road'})[a[1]]
      : ({'-48':'West bypass','-20':'West avenue','20':'East avenue','48':'East bypass'})[a[0]];
    if (name && names.at(-1) !== name) names.push(name);
  }
  return names;
}

export function planRoadRoute(start,goal,closures = []) {
  if (same(start,goal)) return [[...goal]];
  const points = new Map();
  const add = point => points.set(key(point),[...point]);
  for (const x of XS) for (const z of ZS) add([x,z]);
  closures.forEach(add);
  add(start);
  add(goal);
  const graph = new Map([...points.keys()].map(id => [id,[]]));
  const blocked = new Set(closures.map(key));
  const startId = key(start), goalId = key(goal);
  // A vehicle exactly at a newly failed checkpoint may leave it safely.
  blocked.delete(startId);
  const connect = line => {
    for (let i = 1; i < line.length; i++) {
      const [a,b] = [line[i-1],line[i]];
      const preferred = ROAD.slice(1).some((end,j) => onSegment(a,ROAD[j],end) && onSegment(b,ROAD[j],end));
      // Only resolve equal-length choices in favor of the original city route.
      const cost = distance(a,b) * (preferred ? 1 : 1.000001);
      graph.get(key(a)).push({id:key(b),cost});
      graph.get(key(b)).push({id:key(a),cost});
    }
  };
  for (const z of ZS) connect([...points.values()].filter(p => Math.abs(p[1]-z)<EPS).sort((a,b)=>a[0]-b[0]));
  for (const x of XS) connect([...points.values()].filter(p => Math.abs(p[0]-x)<EPS).sort((a,b)=>a[1]-b[1]));
  const remaining = new Set(graph.keys());
  const costs = new Map([...remaining].map(id => [id,Infinity]));
  const previous = new Map();
  costs.set(startId,0);
  while (remaining.size) {
    const current = [...remaining].sort((a,b)=>costs.get(a)-costs.get(b))[0];
    remaining.delete(current);
    if (!Number.isFinite(costs.get(current)) || current === goalId) break;
    for (const edge of graph.get(current)) {
      if (blocked.has(edge.id) || !remaining.has(edge.id)) continue;
      const cost = costs.get(current) + edge.cost;
      if (cost < costs.get(edge.id)) {
        costs.set(edge.id,cost);
        previous.set(edge.id,current);
      }
    }
  }
  if (!Number.isFinite(costs.get(goalId))) return [];
  const result = [goalId];
  while (result[0] !== startId) result.unshift(previous.get(result[0]));
  return simplify(result.map(id => points.get(id)));
}

export class RoadJourney {
  constructor(nodes) {
    this.position = {x:ROAD[0][0],z:ROAD[0][1],angle:Math.PI/2};
    this.progress = 0;
    this.arrived = false;
    this.revision = 0;
    this.replan(nodes);
  }

  remainingPath() {
    if (this.blocked) return [];
    return simplify([[this.position.x,this.position.z],...this.path.slice(this.index+1)]);
  }

  snapshot() {
    const path = this.remainingPath();
    return {path,position:[this.position.x,this.position.z],streets:streetNames(path),distance:this.blocked?null:pathLength(path),blocked:this.blocked,arrived:this.arrived};
  }

  replan(nodes) {
    this.closures = nodes.filter(n => ['Router','RSU'].includes(n.type) && n.status === 'offline')
      .map(node => ({nodeId:node.id,point:roadCheckpoint(node)}));
    this.path = this.arrived ? [[this.position.x,this.position.z]]
      : planRoadRoute([this.position.x,this.position.z],ROAD.at(-1),this.closures.map(c=>c.point));
    this.blocked = !this.path.length;
    this.index = 0;
    this.travelled = 0;
    this.planLength = pathLength(this.path);
    this.baseProgress = this.progress;
    this.revision++;
  }

  advance(dt) {
    if (this.blocked || this.arrived) return;
    let budget = Math.max(0,dt)*ROAD_SPEED;
    while (budget > EPS && this.index < this.path.length-1) {
      const target = this.path[this.index+1];
      const remaining = distance([this.position.x,this.position.z],target);
      const moved = Math.min(budget,remaining);
      if (remaining > EPS) {
        const dx = target[0]-this.position.x, dz = target[1]-this.position.z;
        this.position.angle = Math.atan2(dx,dz);
        this.position.x += dx*moved/remaining;
        this.position.z += dz*moved/remaining;
      }
      this.travelled += moved;
      budget -= moved;
      if (remaining-moved < EPS) {
        this.position.x = target[0];
        this.position.z = target[1];
        this.index++;
      }
    }
    this.arrived = this.index === this.path.length-1;
    this.progress = this.arrived ? 1 : this.baseProgress+(1-this.baseProgress)*this.travelled/this.planLength;
  }
}
