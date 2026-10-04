import assert from 'node:assert/strict';
import {Simulation,crc32} from './dist/engine.mjs';
const advance=(s,t)=>{for(let i=0;i<t*20;i++)s.tick(.05)};
const quiet=()=>{const s=new Simulation();s.stream=false;return s};
assert.equal(crc32('123456789'),'CBF43926');
const frame=quiet();frame.createFrame();assert.equal(frame.checkCRC(),'VALID');frame.corrupt();assert.equal(frame.checkCRC(),'ERROR');frame.retransmitFrame();assert.equal(frame.frame.status,'VALID');
const route=quiet();assert(route.route.includes('R4'));let packet=route.send('Test');advance(route,.3);route.failLink();advance(route,12);assert.equal(packet.status,'DELIVERED');assert(!packet.route.slice(1).some((n,i)=>route.link(packet.route[i],n)?.status==='failed'));assert.equal(route.stats.routeChanges,1);
// Node failure removes every incident connection from both routing algorithms.
const nodeFailure=quiet();const rerouted=nodeFailure.send('Emergency alert');advance(nodeFailure,.3);assert(nodeFailure.failNode('R4'));assert(!nodeFailure.routeFor().includes('R4'));assert(!nodeFailure.distanceVector().includes('R4'));assert(nodeFailure.links.filter(l=>l.a==='R4'||l.b==='R4').every(l=>!nodeFailure.linkAvailable(l)));advance(nodeFailure,12);assert.equal(rerouted.status,'DELIVERED');assert(!rerouted.route.includes('R4'));assert(!rerouted.route.slice(1,-1).some(id=>nodeFailure.node(id).type==='Hospital'));assert(nodeFailure.received);nodeFailure.failLink('R2~R4');nodeFailure.restoreNode('R4');assert.equal(nodeFailure.link('R2','R4').status,'failed');nodeFailure.restore();assert(nodeFailure.route.includes('R4'));assert(nodeFailure.nodes.every(n=>n.status==='online'));
// A failed roadside antenna triggers handoff to a different online antenna.
const antenna=quiet();antenna.node('AMB-01').x=-30;antenna.node('AMB-01').z=25;antenna.updateAccess();assert.equal(antenna.connected,'RSU-01');antenna.failNode('RSU-01');assert(antenna.connected&&antenna.connected!=='RSU-01');assert(!antenna.routeFor().includes('RSU-01'));const handoffPacket=antenna.send('Emergency alert');advance(antenna,12);assert.equal(handoffPacket.status,'DELIVERED');
// Packets already inside a failed device are lost; TCP can retry from the source.
const inside=quiet();const held=inside.send('Critical data',{protocol:'TCP'});held.hop=held.route.indexOf('R4');inside.failNode('R4');assert.equal(held.status,'LOST');advance(inside,20);assert(inside.stats.retries>0);assert(inside.confirmed);
// No alternate path is shown when all backbone routers are disabled.
const isolated=quiet();for(const n of isolated.nodes.filter(n=>n.type==='Router'))isolated.failNode(n.id);advance(isolated,3);assert.deepEqual(isolated.route,[]);assert.deepEqual(isolated.distanceVector(),[]);assert.equal(isolated.routeInfo(isolated.route).status,'UNREACHABLE');assert.equal(isolated.send('Blocked message'),null);isolated.restore();assert(isolated.route.length>0);const recovered=isolated.send('Emergency alert');advance(isolated,12);assert.equal(recovered.status,'DELIVERED');isolated.failNode('R4');isolated.reset();assert(isolated.nodes.every(n=>n.status==='online'));assert.equal(isolated.failNode('HOSP-01'),false);
// Before/after measurements are saved at the node change, never recomputed from live traffic.
const comparison=quiet();comparison.failNode('R4');const saved=comparison.routeComparison;
assert.deepEqual(saved.before.path,['AMB-01','RSU-01','R2','R4','CTRL','HOSP-01']);
assert.deepEqual(saved.after.path,['AMB-01','RSU-01','R1','R5','CTRL','HOSP-01']);
assert(Math.abs(saved.before.delay-28.288)<1e-8);assert(Math.abs(saved.after.delay-51.248)<1e-8);
assert.equal(saved.before.load,saved.after.load);assert.equal(saved.before.bandwidth,saved.after.bandwidth);
const originalComparison=JSON.stringify(saved);comparison.load=95;comparison.bandwidth=20;comparison.activate(false);advance(comparison,6);
assert.equal(JSON.stringify(saved),originalComparison);assert.notEqual(comparison.metrics().delay,saved.after.delay);
comparison.restoreNode('R4');assert.equal(comparison.routeComparison.action,'restored');assert.notStrictEqual(comparison.routeComparison,saved);
comparison.failNode('R5');assert.equal(comparison.routeComparison.nodeId,'R5');assert.equal(comparison.failNode('R5'),false);assert.equal(comparison.routeComparison.nodeId,'R5');
comparison.restore();assert.equal(comparison.routeComparison,null);comparison.failNode('R4');comparison.runDemo();assert.equal(comparison.routeComparison,null);
const blockedComparison=quiet();blockedComparison.failNode('RSU-01');assert.equal(blockedComparison.routeComparison.after.delay,null);assert.equal(blockedComparison.routeComparison.after.hops,null);assert.deepEqual(blockedComparison.routeComparison.after.path,[]);
blockedComparison.restoreNode('RSU-01');assert.equal(blockedComparison.routeComparison.before.delay,null);assert(blockedComparison.routeComparison.after.delay>0);
const unchangedComparison=quiet();unchangedComparison.failNode('RSU-06');assert.deepEqual(unchangedComparison.routeComparison.before,unchangedComparison.routeComparison.after);
const udp=quiet();udp.send('GPS',{protocol:'UDP',forceLoss:true});advance(udp,10);assert.equal(udp.stats.lost,1);assert.equal(udp.stats.retries,0);
const tcp=quiet();tcp.connectTCP(()=>tcp.send('Medical data',{protocol:'TCP',forceLoss:true}));advance(tcp,20);assert.equal(tcp.tcp,'ESTABLISHED');assert(tcp.stats.retries>=1);assert(tcp.confirmed);assert.deepEqual(tcp.handshake,['SYN →','← SYN-ACK','ACK →']);
const congestion=quiet();const low=congestion.metrics().delay;congestion.load=95;assert(congestion.metrics().delay>low);for(let i=0;i<20;i++)congestion.send();advance(congestion,1.8);assert(congestion.history.some(h=>h.load===95));
const demo=quiet();demo.runDemo();advance(demo,60.1);assert(demo.complete);assert(demo.received);assert(demo.confirmed);assert.equal(demo.progress,1);assert(demo.stats.routeChanges===1);assert(demo.stats.retries>=1);assert(demo.events.some(e=>e.message.startsWith('Handoff')));const active=demo.metrics().active;assert.equal(demo.stats.sent,demo.stats.delivered+demo.stats.lost+active);assert(demo.nodes.every(n=>n.ip&&n.mac));assert(demo.distanceVector().length>0);
const paused=quiet();paused.paused=true;advance(paused,3);assert.equal(paused.time,0);paused.reset();assert.equal(paused.stats.sent,0);
console.log(JSON.stringify({checks:'CRC, corruption, route failure, in-flight reroute, node disable/restore, saved route comparison, antenna handoff, isolated destination, UDP loss, TCP handshake/retry/ACK, congestion, 60-second demo, handoff, accounting, reset',demo:demo.stats,confirmed:demo.confirmed,elapsed:demo.demoTime},null,2));
