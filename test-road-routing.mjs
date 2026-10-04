import assert from 'node:assert/strict';
import {Experience} from './dist/experience.mjs';
import {ROAD,ROAD_SPEED,roadCheckpoint} from './dist/road-routing.mjs';

const advance = (experience,seconds,inspect=()=>{}) => {
  for (let i=0;i<seconds*20;i++) {experience.tick(.05);inspect();}
};
const position = experience => {
  const {x,z} = experience.sim.node('AMB-01');
  return [x,z];
};
const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const crosses = (path,point) => path.slice(1).some((end,i) =>
  Math.abs(distance(path[i],point)+distance(point,end)-distance(path[i],end))<1e-6);
const safeArrival = experience => {
  let previous=position(experience), progress=experience.sim.progress;
  advance(experience,120,()=>{
    const current=position(experience);
    assert(distance(previous,current)<=ROAD_SPEED*.05+1e-6,'A road change must never teleport the ambulance');
    assert([-48,-20,20,48].some(x=>Math.abs(x-current[0])<1e-6) || [-30,0,30].some(z=>Math.abs(z-current[1])<1e-6),'Movement stays on drawn streets');
    assert(experience.sim.progress>=progress,'Journey progress stays monotonic');
    for(const closure of experience.sim.road.closures) {
      assert(!crosses([previous,current],closure.point),'Vehicle must not cross a failed checkpoint');
    }
    previous=current;progress=experience.sim.progress;
  });
  assert(experience.completed,'The detour must still reach the hospital and finish delivery');
  assert.deepEqual(position(experience),[34,-30]);
};

const normal=new Experience();
assert.deepEqual(normal.sim.road.path,ROAD);
normal.play();advance(normal,43);
assert.equal(normal.sim.progress,1);
assert.deepEqual(position(normal),[34,-30]);

// A failure before departure changes the plan without starting the vehicle.
const before=new Experience();
before.toggleNode('R4');
assert(before.sim.routeComparison.road.changed);
assert(!crosses(before.sim.road.path,roadCheckpoint(before.sim.node('R4'))));
const frozen=JSON.stringify(before.sim.routeComparison);
advance(before,3);
assert.deepEqual(position(before),ROAD[0]);
before.play();safeArrival(before);
assert.equal(JSON.stringify(before.sim.routeComparison),frozen);

// On the affected street, the vehicle reverses from its exact current position.
const midRoad=new Experience();midRoad.play();advance(midRoad,20);
const atFailure=position(midRoad);
assert.equal(atFailure[1],0);
midRoad.toggleNode('R4');
assert.deepEqual(position(midRoad),atFailure);
assert(midRoad.sim.road.path[1][0]<atFailure[0]);
advance(midRoad,1);
assert.deepEqual(position(midRoad),atFailure,'Hold position during route recalculation');
safeArrival(midRoad);

// A checkpoint behind the ambulance does not cause an unnecessary U-turn.
const behind=new Experience();behind.play();advance(behind,29);
behind.toggleNode('R4');
assert(!behind.sim.routeComparison.road.changed);
safeArrival(behind);

// Antenna failure also changes physical travel, including an initial U-turn.
const antenna=new Experience();antenna.toggleNode('RSU-01');
assert.equal(antenna.sim.road.path[1][0],-48);
antenna.play();safeArrival(antenna);

// Closures on both sides trap the vehicle; restoring one opens a route again.
const trapped=new Experience();trapped.toggleNode('R4');trapped.play();advance(trapped,25);
const trappedAt=position(trapped);
assert(trappedAt[1]<-13 && trappedAt[1]>-25);
trapped.toggleNode('R1');trapped.toggleNode('RSU-04');
assert(trapped.sim.road.blocked);
const trappedProgress=trapped.sim.progress;
advance(trapped,5);
assert.deepEqual(position(trapped),trappedAt);
assert.equal(trapped.sim.progress,trappedProgress);
trapped.toggleNode('RSU-04');
assert(!trapped.sim.road.blocked);
assert.deepEqual(position(trapped),trappedAt);
safeArrival(trapped);

// Paused route editing and restoration preserve vehicle position and progress.
const paused=new Experience();paused.play();advance(paused,8);paused.play();
const pausedAt=position(paused), pausedProgress=paused.sim.progress;
paused.toggleNode('R4');advance(paused,4);
assert(paused.sim.paused);
assert.deepEqual(position(paused),pausedAt);
paused.toggleNode('R4');
assert.equal(paused.sim.progress,pausedProgress);
assert.deepEqual(position(paused),pausedAt);
paused.play();safeArrival(paused);
paused.toggleNode('R4');advance(paused,5);
assert.deepEqual(position(paused),[34,-30]);
assert(paused.sim.road.arrived);
paused.reset();
assert.deepEqual(paused.sim.road.path,ROAD);
assert.deepEqual(paused.sim.road.closures,[]);

console.log('Road routing checks passed: normal arrival, pre-start failure, moving U-turn, no teleporting, road-only motion, offline checkpoint avoidance, frozen comparison, passed checkpoints, antenna detour, blocked journey, restoration, pause and reset.');
