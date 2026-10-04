import {Simulation} from './engine.mjs';

const advance = (simulation,seconds) => {
  for (let i=0;i<seconds*20;i++) simulation.tick(.05);
};

// Isolated examples never mutate the user's 3D journey.
export function failureExample() {
  const example = new Simulation();
  example.stream=false;
  example.activate(false);
  advance(example,20);
  example.failNode('R4');
  const disabled=structuredClone(example.routeComparison);
  example.restoreNode('R4');
  return {disabled,restored:structuredClone(example.routeComparison)};
}

export function compareDelivery() {
  const udp=new Simulation(), tcp=new Simulation();
  for (const simulation of [udp,tcp]) {
    simulation.stream=false;
    // Isolate the deliberate loss from random background loss for this lesson.
    simulation.lossRate=()=>0;
  }
  udp.send('Lesson message',{protocol:'UDP',forceLoss:true});
  tcp.connectTCP(()=>tcp.send('Lesson message',{protocol:'TCP',forceLoss:true}));
  advance(udp,20);advance(tcp,20);
  const result = simulation => ({
    lost:simulation.stats.lost,retries:simulation.stats.retries,
    delivered:simulation.packets.filter(p=>p.kind==='Lesson message'&&p.status==='DELIVERED').length,
    acknowledged:simulation.confirmed,handshake:[...simulation.handshake]
  });
  return {udp:result(udp),tcp:result(tcp)};
}

export function loadEstimate(load) {
  const simulation=new Simulation();
  simulation.load=Math.max(0,Math.min(100,Number(load)||0));
  const route=simulation.routeFor();
  return {load:simulation.load,delay:simulation.routeInfo(route).delay,capacity:simulation.bandwidth};
}
