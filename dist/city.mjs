import * as T from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {along} from './engine.mjs';

export class City {
 constructor(host,sim,onSelect){
  this.host=host;this.sim=sim;this.onSelect=onSelect;this.scene=new T.Scene();this.scene.background=new T.Color('#aac5ce');this.scene.fog=new T.Fog('#aac5ce',210,400);
  this.camera=new T.PerspectiveCamera(42,1,.1,600);this.camera.position.set(102,112,126);
  this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;host.appendChild(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.075;this.controls.minDistance=22;this.controls.maxDistance=235;this.controls.maxPolarAngle=Math.PI*.47;this.controls.target.set(0,0,-2);this.controls.addEventListener('start',()=>{this.follow=false;this.cameraGoal=null});
  this.ambient=new T.HemisphereLight(0xe2f6ff,0x526d68,2.1);this.scene.add(this.ambient);this.sun=new T.DirectionalLight(0xffe6c9,3);this.sun.position.set(-45,95,55);this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-85,right:85,top:85,bottom:-85,near:1,far:220});this.sun.shadow.normalBias=.03;this.scene.add(this.sun);
  this.materials=new Map();this.unitBox=new T.BoxGeometry(1,1,1);this.unitCylinder=new T.CylinderGeometry(1,1,1,12);this.nodes=new Map();this.labels=[];this.pins=[];this.coverage=[];this.linkMeshes=new Map();this.packetMeshes=new Map();this.clickables=[];this.cars=[];this.signals=[];this.failedMarks=new Map();this.offlineMarks=new Map();this.labelVisible=false;this.coverageVisible=false;this.networkVisible=true;this.networkMode=false;this.night=false;this.follow=false;
  this.build();this.buildPins();new ResizeObserver(()=>this.resize()).observe(host);this.resize();
  this.renderer.domElement.addEventListener('pointerdown',e=>this.down=[e.clientX,e.clientY]);this.renderer.domElement.addEventListener('pointerup',e=>{if(!this.down||Math.hypot(e.clientX-this.down[0],e.clientY-this.down[1])>5)return;const r=this.renderer.domElement.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);let o=ray.intersectObjects([...this.clickables,...this.packetMeshes.values()],true)[0]?.object;while(o&&!o.userData.id)o=o.parent;if(o)this.onSelect(o.userData.id)});
  this.animate();
 }
 mat(color,glow=false){const key=color+glow;if(!this.materials.has(key))this.materials.set(key,new T.MeshStandardMaterial({color,roughness:.78,metalness:.08,...(glow?{emissive:color,emissiveIntensity:.3}:{})}));return this.materials.get(key)}
 box(w,h,d,color,x=0,y=0,z=0,parent=this.scene,glow=false){const m=new T.Mesh(this.unitBox,this.mat(color,glow));m.scale.set(w,h,d);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 cyl(r,h,color,x,y,z,parent=this.scene){const m=new T.Mesh(this.unitCylinder,this.mat(color));m.scale.set(r,h,r);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
 label(text,color='#d4eaf1'){const c=document.createElement('canvas');c.width=384;c.height=80;const ctx=c.getContext('2d');ctx.fillStyle='#193644ed';ctx.beginPath();ctx.roundRect(1,1,382,78,12);ctx.fill();ctx.strokeStyle=color;ctx.stroke();ctx.fillStyle=color;ctx.font=text.length>14?'600 29px Arial':'600 44px Arial';ctx.textAlign='center';ctx.fillText(text,192,51);const s=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),transparent:true,depthTest:false}));s.scale.set(19,3.95,1);s.renderOrder=8;this.labels.push(s);return s}
 vehicle(color,type){const g=new T.Group();this.box(2.6,1.35,5.2,color,0,1.4,0,g);this.box(2.55,1.55,3.2,color,0,2.8,-.85,g);this.box(2.4,.9,1.7,color,0,2.1,1.6,g);this.box(2.22,.85,.14,'#355663',0,2.7,.8,g);this.box(2.2,.13,1.3,'#d6e7e6',0,3.17,1.5,g);
  for(const x of [-1.36,1.36]){this.box(.08,.75,1.2,'#355663',x,2.5,.1,g);this.box(.08,.34,4.6,type==='Ambulance'?'#e27859':type==='Police'?'#e9efef':color,x,1.3,0,g);for(const z of [-1.65,1.65]){const w=this.cyl(.66,.35,'#283c44',x,.66,z,g);w.rotation.z=Math.PI/2;const hub=this.cyl(.3,.37,'#b3c2c5',x,.66,z,g);hub.rotation.z=Math.PI/2}if(type==='Ambulance'){this.box(.1,1,.27,'#d85d4f',x,2.75,-1.5,g);this.box(.1,.27,1,'#d85d4f',x,2.75,-1.5,g)}}
  for(const x of [-.85,.85]){this.box(.5,.33,.15,'#fff5cf',x,1.75,2.67,g,true);this.box(.35,.3,.15,'#d95150',x,1.5,-2.67,g,true)}this.box(2,.18,.18,'#7b959d',0,.95,2.73,g);
  if(type){g.userData.flash=[];this.box(2,.15,.8,'#e0e8e4',0,3.67,-.2,g);for(const x of [-.65,.65]){g.userData.flash.push(this.box(.75,.34,.65,x<0?'#f45952':'#548cdd',x,3.89,-.2,g,true))}}
  if(type==='Ambulance'){this.box(.42,.1,1.6,'#d8514f',0,3.62,-1.5,g);this.box(1.6,.1,.42,'#d8514f',0,3.62,-1.5,g)}
  if(type==='Fire'){for(const x of [-.7,.7])this.box(.13,.2,3.5,'#c8d4d7',x,3.7,-.3,g);for(let z=-1.8;z<1.6;z+=.6)this.box(1.5,.13,.13,'#c8d4d7',0,3.7,z,g)}return g;
 }
 tree(x,z,size=1){this.cyl(.18,2,'#947d61',x,1,z);const crown=new T.Mesh(new T.IcosahedronGeometry(1.8*size,1),this.mat('#609983'));crown.position.set(x,3.1*size,z);crown.castShadow=true;this.scene.add(crown)}
 build(){
  this.box(112,2.2,107,'#6b98a3',0,-1.5,0);this.box(110,.5,105,'#bfcdc5',0,-.2,0);this.box(107,.12,102,'#91b5a3',0,.08,0);
  for(const x of [-48,-20,20,48]){this.box(10,.2,101,'#d5dcd5',x,.15,0);this.box(8,.22,101,'#526b75',x,.28,0);for(let z=-48;z<50;z+=5)this.box(.15,.02,2,'#e4dfbc',x,.405,z)}
  for(const z of [-30,0,30]){this.box(106,.2,10,'#d5dcd5',0,.18,z);this.box(106,.23,8,'#526b75',0,.31,z);for(let x=-50;x<52;x+=5)this.box(2,.02,.15,'#e4dfbc',x,.445,z)}
  for(const x of [-20,20])for(const z of [-30,0,30]){this.box(8,.05,8,'#526b75',x,.46,z);for(let a=-2.5;a<=2.5;a+=1){this.box(.52,.03,2.1,'#ebeee1',x+a,.5,z+5);this.box(2.1,.03,.52,'#ebeee1',x+5,.5,z+a)}this.cyl(.16,5.2,'#587d88',x+5.5,2.8,z+5.5);this.box(.8,1.6,.65,'#244551',x+5.5,5.3,z+5.5);const bulb=new T.Mesh(new T.SphereGeometry(.25,10,8),this.mat('#ed675b',true));bulb.position.set(x+5.5,5.75,z+5.9);this.scene.add(bulb);this.signals.push({bulb,x,z})}
  // Low buildings keep the road and emergency vehicle in sight.
  const blocks=[[-36,-15,7],[-34,14,5],[-9,14,8],[6,15,6],[36,14,7],[-34,44,5],[-6,44,9],[9,43,6],[36,43,5]];
  for(const [x,z,h] of blocks){this.box(13,.45,14,'#d0dbd3',x,.5,z);this.box(10,h,10,'#d2ded9',x,h/2+.75,z);this.box(10.7,.4,10.7,'#b0c8c6',x,h+.9,z);for(let y=2;y<h;y+=2.6){this.box(8.8,1.1,.08,'#548590',x,y,z+5.06);this.box(.08,1.1,8.8,'#6895a0',x+5.06,y,z)}this.box(2.8,1.2,2,'#8da9af',x+2,h+1.7,z-2);this.box(2,2.1,.1,'#4c7580',x,1.8,z+5.1)}
  // Small park and planted verges.
  this.box(22,.16,16,'#7fae91',1,.6,-16);this.box(2,.03,15,'#d0d9c6',1,.7,-16);for(const [x,z] of [[-7,-21],[8,-21],[-7,-12],[8,-12],[-41,-22],[-41,22],[-12,24],[10,24],[31,23],[42,23],[-40,46],[30,47],[42,47],[-11,36],[12,36],[-44,-45],[-31,-46]])this.tree(x,z,1.1);
  for(const [x,z] of [[-5,-17],[5,-15]])this.box(2,.6,.7,'#b2936e',x,1,z);
  for(const x of [-25,25])for(const z of [-22,8,24]){this.cyl(.12,6,'#627f88',x,3.4,z);this.box(1.9,.14,.5,'#eff2da',x+.5,6.4,z,this.scene,true)}
  // Rebuild only when a route changes, using the same path as vehicle movement.
  this.roadGroup=new T.Group();this.scene.add(this.roadGroup);
  this.roadArrow=new T.ConeGeometry(.8,1.9,3);
  this.updateRoad();
  for(const n of this.sim.nodes){const g=new T.Group();g.position.set(n.x,.45,n.z);g.userData.id=n.id;let height=8;
   if(['Ambulance','Police','Fire'].includes(n.type)){const v=this.vehicle(n.type==='Ambulance'?'#f5f4e8':n.type==='Police'?'#5380a0':'#d47357',n.type);v.scale.setScalar(n.type==='Ambulance'?1.2:.9);g.add(v)}
   else if(n.type==='RSU'){this.box(2,.6,2,'#dbe9df',0,.35,0,g);this.cyl(.19,9,'#7595a1',0,4.7,0,g);this.box(.9,2.1,.45,'#f2f3df',0,8,0,g);for(let y=7.6;y<9;y+=.5)this.box(2,.12,.12,'#77beb4',0,y,0,g,true);let ring=new T.Mesh(new T.RingGeometry(n.radius-.15,n.radius,64),new T.MeshBasicMaterial({color:0x27b899,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false}));ring.rotation.x=-Math.PI/2;ring.position.y=.11;g.add(ring);this.coverage.push({ring,id:n.id});height=12}
   else if(n.type==='Router'){this.box(3.3,2.6,3.3,'#3d8190',0,1.6,0,g);this.box(3.6,.22,3.6,'#9fddd1',0,3,0,g);for(let y=1;y<2.8;y+=.7)this.box(2.6,.13,.14,'#b9edda',0,y,1.7,g,true);this.cyl(.15,2.2,'#537f8c',1,4,0,g);height=7}
   else if(n.type==='Hospital'){this.box(16,.6,13,'#d9e5d9',0,.4,-3.7,g);this.box(13,7.5,9,'#f2f0da',0,4,-4,g);this.box(14,.45,10,'#b2d2c3',0,8,-4,g);this.box(8,.5,3,'#88bdaa',0,3.3,1.3,g);this.box(5,2.9,.18,'#518b90',0,1.9,.6,g);for(const x of [-4.8,-2.9,2.9,4.8])this.box(1.2,1.5,.12,'#6d9c9e',x,5,.6,g);this.box(3.2,.68,.15,'#dc665a',0,6,.69,g);this.box(.68,3.2,.15,'#dc665a',0,6,.7,g);this.box(.8,.14,4,'#d7655a',0,8.32,-4,g);this.box(4,.14,.8,'#d7655a',0,8.32,-4,g);height=12}
   else {this.box(16,.6,10,'#d1ddd7',0,.4,0,g);this.box(16,8,.6,'#7da6b0',0,4,-4.6,g);this.box(.6,8,10,'#7da6b0',-8,4,0,g);for(const x of [-5,0,5]){this.box(3,1.5,1.8,'#afc5be',x,1.5,0,g);this.box(2.3,1,.15,'#55a8b5',x,2.8,-.5,g,true);this.cyl(.65,1.2,'#567985',x,1.2,2,g)}this.box(11,4,.2,'#347d95',0,4.8,-4.2,g,true);for(let x=-4;x<=4;x+=2)this.box(.1,2.8,.1,'#aadcd7',x,4.8,-4.03,g,true);height=12}
   const label=this.label(n.id);label.position.y=height;g.add(label);this.scene.add(g);this.nodes.set(n.id,g);this.clickables.push(g);
  }
  for(let i=0;i<20;i++){const car=this.vehicle(['#e9c496','#85b3b2','#bf9286','#a6b4ba','#ebdfb7'][i%5]);car.scale.setScalar(.64);this.cars.push(car);this.scene.add(car)}
  this.selectionRing=new T.Mesh(new T.RingGeometry(3.8,4.25,48),new T.MeshBasicMaterial({color:0xf4a159,side:T.DoubleSide}));this.selectionRing.rotation.x=-Math.PI/2;this.scene.add(this.selectionRing);
 }
 buildPins(){for(const [id,text,cls] of [['AMB-01','✚ Ambulance','ambulance'],['HOSP-01','✚ Meridian Hospital','hospital'],['CTRL','Control center','control']]){const el=document.createElement('button');el.className=`map-pin ${cls}`;el.textContent=text;el.setAttribute('aria-label',`Inspect ${text.replace('✚ ','')}`);el.onclick=()=>this.onSelect(id);document.getElementById('map-pins').append(el);this.pins.push({id,el})}}
 resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.zoom=Math.min(1.12,w/h*1.05);this.camera.updateProjectionMatrix()}
 position(id){const n=this.sim.node(id);return new T.Vector3(n?.x||0,n?.type==='RSU'?11:n?.type==='Hospital'?12:n?.type==='Control center'?13:7,n?.z||0)}
 curve(a,b){const start=this.position(a),end=this.position(b),mid=start.clone().add(end).multiplyScalar(.5);mid.y=Math.max(start.y,end.y)+Math.min(13,start.distanceTo(end)*.22);return new T.QuadraticBezierCurve3(start,mid,end)}
 view(name){this.follow=name==='Follow ambulance';this.networkMode=name==='Network view';let target=new T.Vector3(0,0,-2),offset=new T.Vector3(102,112,126);if(name==='Top view')offset.set(0,170,.01);if(this.networkMode)offset.set(75,135,95);const id=this.follow||name==='Ambulance view'?'AMB-01':name==='Hospital view'?'HOSP-01':name==='Control center'?'CTRL':null;if(id){target=this.position(id);offset.set(25,32,40)}this.cameraGoal=target.clone().add(offset);this.targetGoal=target}
 setDay(day){this.night=!day;this.host.classList.toggle('night-scene',!day);this.scene.background.set(day?'#aac5ce':'#183744');this.scene.fog.color.copy(this.scene.background);this.ambient.intensity=day?2.1:.8;this.sun.intensity=day?3:.7;for(const [key,m] of this.materials)if(key.endsWith('true'))m.emissiveIntensity=day?.3:1.6}
 updateRoad(){
  const road=this.sim.road;
  if(this.drawnRoad===road&&this.roadRevision===road.revision)return;
  this.drawnRoad=road;this.roadRevision=road.revision;
  this.roadGroup.clear();
  const path=road.path;
  for(let i=1;i<path.length;i++){
   const [a,b]=[path[i-1],path[i]],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
   const stripe=this.box(.85,.06,len,'#efa62b',(a[0]+b[0])/2,.56,(a[1]+b[1])/2,this.roadGroup,true);
   stripe.rotation.y=Math.atan2(b[0]-a[0],b[1]-a[1]);
   for(let t=4;t<len;t+=9){
    const arrow=new T.Mesh(this.roadArrow,this.mat('#ffd47b',true));
    arrow.rotation.x=Math.PI/2;arrow.rotation.z=-stripe.rotation.y;
    arrow.position.set(a[0]+(b[0]-a[0])*t/len,.66,a[1]+(b[1]-a[1])*t/len);
    this.roadGroup.add(arrow);
   }
  }
  for(const {point:[x,z]} of road.closures){
   for(const angle of [-Math.PI/4,Math.PI/4]){
    const mark=this.box(.65,.09,4.6,'#dc5d4d',x,.64,z,this.roadGroup,true);
    mark.rotation.y=angle;
   }
  }
 }
 updateNetwork(){const s=this.sim,selected=new Set(s.route.slice(1).map((n,i)=>s.link(s.route[i],n)?.id)),ids=new Set(s.links.map(l=>l.id));
  for(const [id,m] of this.linkMeshes)if(!ids.has(id)){this.scene.remove(m);m.geometry.dispose();m.material.dispose();this.linkMeshes.delete(id)}
  for(const l of s.links){const signature=[l.a,l.b,this.sim.node(l.a)?.x.toFixed(1),this.sim.node(l.a)?.z.toFixed(1),this.sim.node(l.b)?.x.toFixed(1),this.sim.node(l.b)?.z.toFixed(1)].join('|');let m=this.linkMeshes.get(l.id);if(!m){m=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({transparent:true,depthWrite:false}));this.scene.add(m);this.linkMeshes.set(l.id,m)}if(m.userData.signature!==signature){m.geometry.dispose();m.geometry=new T.TubeGeometry(this.curve(l.a,l.b),24,.14,5,false);m.userData.signature=signature}const fail=!s.linkAvailable(l);m.material.color.set(fail?'#d76150':selected.has(l.id)?'#19886c':s.effectiveLoad()>70?'#d0932e':'#558897');m.material.opacity=fail?.65:selected.has(l.id)?.95:.26;m.visible=this.networkVisible&&(this.networkMode||selected.has(l.id)||fail);
   if(l.status==='failed'&&!this.failedMarks.has(l.id)){const mark=this.label('×  Connection broken','#ffb5a0');mark.userData.failure=true;mark.position.copy(this.curve(l.a,l.b).getPoint(.5));mark.position.y+=3;mark.scale.set(18,3.5,1);this.scene.add(mark);this.failedMarks.set(l.id,mark)}if(this.failedMarks.has(l.id))this.failedMarks.get(l.id).visible=l.status==='failed'&&this.networkVisible;
  }
  const active=s.packets.filter(p=>['IN FLIGHT','QUEUED','REROUTING'].includes(p.status)),activeIds=new Set(active.map(p=>p.id));for(const [id,g] of this.packetMeshes)if(!activeIds.has(id)){this.scene.remove(g);g.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});this.packetMeshes.delete(id)}
  for(const p of active){let g=this.packetMeshes.get(p.id);if(!g){g=new T.Group();g.userData.id=p.id;const geom=p.kind==='ACK'?new T.OctahedronGeometry(1):p.priority==='CRITICAL'?new T.ConeGeometry(1.1,2.2,4):p.protocol==='TCP'?new T.BoxGeometry(1.4,1.4,1.4):new T.SphereGeometry(.85,10,8);const color=p.kind==='ACK'?0x32865d:p.priority==='CRITICAL'?0xe17c51:p.protocol==='TCP'?0xb4822e:0x217f9e;g.add(new T.Mesh(geom,new T.MeshBasicMaterial({color})));for(let i=1;i<5;i++)g.add(new T.Mesh(new T.SphereGeometry(.43,6,6),new T.MeshBasicMaterial({color,transparent:true,opacity:(5-i)/6})));this.scene.add(g);this.packetMeshes.set(p.id,g)}const a=p.route[p.hop],b=p.route[p.hop+1]||a,curve=this.curve(a,b),point=curve.getPoint(p.progress);g.position.copy(point);g.children[0].rotation.y=s.time*2;for(let i=1;i<g.children.length;i++)g.children[i].position.copy(curve.getPoint(Math.max(0,p.progress-i*.055)).sub(point));g.visible=this.networkVisible;}
  if(!this.p2pLine){this.p2pLine=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({color:0xe6ad53}));this.scene.add(this.p2pLine)}this.p2pLine.visible=s.p2pUntil>s.time;if(this.p2pLine.visible){this.p2pLine.geometry.dispose();this.p2pLine.geometry=new T.TubeGeometry(this.curve('AMB-01','POL-01'),20,.16,5,false)}
 }
 animate(){requestAnimationFrame(()=>this.animate());if(!this.host.clientWidth||!this.host.clientHeight)return;const s=this.sim;
  for(const [id,g] of this.nodes){const n=s.node(id);const offline=n.status==='offline';if(offline!==g.userData.offline){g.traverse(o=>{if(o.isMesh){if(!o.userData.onlineMaterial)o.userData.onlineMaterial=o.material;o.material=offline?this.mat('#75818a'):o.userData.onlineMaterial}});g.userData.offline=offline}if(offline&&!this.offlineMarks.has(id)){const marker=new T.Group();const label=this.label(`× ${id} OFFLINE`,'#ffb4a1');label.userData.failure=true;label.position.y=7;label.scale.set(24,5,1);marker.add(label);const ring=new T.Mesh(new T.TorusGeometry(3,.3,8,40),new T.MeshBasicMaterial({color:'#df725c'}));ring.rotation.x=Math.PI/2;marker.add(ring);marker.position.copy(this.position(id));this.scene.add(marker);this.offlineMarks.set(id,marker)}if(this.offlineMarks.has(id))this.offlineMarks.get(id).visible=offline;if(['Ambulance','Police','Fire'].includes(n.type)){g.position.set(n.x,.45,n.z);g.rotation.y=n.angle??Math.PI/2;g.children[0].userData.flash?.forEach((m,i)=>m.visible=!s.emergency||Math.floor(s.time*7+i)%2===0)}}
  this.cars.forEach((g,i)=>{g.visible=i<s.traffic;const path=i%2?[[-46,32],[-18,32],[-18,2],[46,2],[46,-28],[22,-28],[22,32],[-46,32]]:[[18,47],[18,28],[-22,28],[-22,-32],[46,-32],[46,-2],[18,-2],[18,47]];const p=along(path,(s.time*.006+i/20)%1);g.position.set(p.x,.45,p.z);g.rotation.y=p.angle});
  for(const signal of this.signals){const n=s.node('AMB-01'),priority=s.emergency&&Math.hypot(n.x-signal.x,n.z-signal.z)<20;signal.bulb.material=this.mat(priority||Math.floor(s.time/6)%2===0?'#75ba8b':'#e97863',true)}
  this.updateRoad();this.updateNetwork();for(const l of this.labels)if(!l.userData.failure)l.visible=this.labelVisible||this.networkMode;for(const {ring,id} of this.coverage){ring.visible=this.coverageVisible&&s.node(id).status==='online';ring.material.opacity=id===s.connected?.5:.14}
  const n=s.node(s.selection);this.selectionRing.visible=!!n;if(n)this.selectionRing.position.set(n.x,.64,n.z);
  if(this.follow){this.targetGoal=this.position('AMB-01');this.cameraGoal=this.targetGoal.clone().add(new T.Vector3(25,32,40))}if(this.cameraGoal){this.camera.position.lerp(this.cameraGoal,.07);this.controls.target.lerp(this.targetGoal,.07);if(!this.follow&&this.camera.position.distanceTo(this.cameraGoal)<.2)this.cameraGoal=null}this.controls.update();
  const w=this.host.clientWidth,h=this.host.clientHeight;for(const {id,el} of this.pins){const projected=this.position(id).add(new T.Vector3(0,4,0)).project(this.camera);el.hidden=this.networkMode||projected.z>1||Math.abs(projected.x)>.95||Math.abs(projected.y)>.9;el.style.left=`${(projected.x*.5+.5)*w}px`;el.style.top=`${(-projected.y*.5+.5)*h}px`}
  this.renderer.render(this.scene,this.camera);
 }
}
