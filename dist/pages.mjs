import {Simulation,crc32} from './engine.mjs';
import {roadCheckpoint} from './road-routing.mjs';
import {concepts,phases,journeySteps} from './learning-data.mjs';
import {failureExample,compareDelivery,loadEstimate} from './learning-models.mjs';

const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = id => document.getElementById(id);
const pageNames = {simulation:'Simulation',how:'How it works',failure:'Node failure',concepts:'Concepts',guide:'Guide'};
const intro = (eyebrow,title,description) => `<header class="page-intro"><span class="eyebrow">${eyebrow}</span><h1 tabindex="-1">${title}</h1><p>${description}</p></header>`;
const nextLink = (href,label) => `<a class="text-link" href="#${href}">${label} <span aria-hidden="true">↗</span></a>`;
const routeChips = (path,offlineId=null) => path.length ? path.map((id,i)=>`${i?'<span class="flow-arrow" aria-hidden="true">→</span>':''}<span class="flow-node ${id===offlineId?'offline':''}"><i></i>${escape(id)}${id===offlineId?' <small>offline</small>':''}</span>`).join('') : '<p class="empty-route">No connected path to the hospital.</p>';

export function mountPages({experience,onReturn}) {
  const sim=experience.sim;
  const root=$('learning-page');
  const example=failureExample();
  let page='simulation', phase='foundation', search='', journeyStep=0;
  let source='example', failureStage=2, restoredExample=false;
  let corrupt=false, transportResult=null, networkLoad=32, bits='10110010';

  function navigate() {
    const requested=location.hash.slice(1).split('/')[0]||'simulation';
    const next=Object.hasOwn(pageNames,requested)?requested:'simulation';
    if (next!=='simulation') {
      sim.paused=true;
      $('route-dialog').close();
      $('toast').hidden=true;
    }
    if (next==='failure'&&page!=='failure') {
      source=sim.routeComparison?'latest':'example';
      failureStage=2;
    }
    page=next;
    $('simulation-page').hidden=page!=='simulation';
    root.hidden=page==='simulation';
    $('restart').hidden=page!=='simulation';
    document.body.classList.toggle('reading-page',page!=='simulation');
    document.querySelectorAll('[data-page]').forEach(link=>{
      if(link.dataset.page===page)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    document.title=`${pageNames[page]} — Emergency Route`;
    if(page==='simulation')onReturn();
    else render();
    window.scrollTo(0,0);
    if(page!=='simulation')root.querySelector('h1')?.focus({preventScroll:true});
  }

  function render() {
    root.innerHTML=({how:howPage,failure:failurePage,concepts:conceptPage,guide:guidePage})[page]()
      + `<footer class="page-footer"><span>Emergency Route · Educational prototype</span>${nextLink('simulation','Back to the 3D city')}</footer>`;
    if(page==='how')bindHow();
    if(page==='failure')bindFailure();
    if(page==='concepts')bindConcepts();
  }

  function howPage() {
    return intro('THE BIG PICTURE','One emergency. Two journeys.','The ambulance travels on roads. Its alert travels through a network. Follow both from the same starting point.')
    + `<section class="two-journeys"><article><span class="line-label amber">THE VEHICLE</span><h2>Get to the hospital.</h2><div class="simple-journey"><span>Ambulance</span><b>→</b><span>Roads</span><b>→</b><span>Hospital</span></div><p>The amber line is a physical road route. A failed checkpoint can make the ambulance turn onto another street.</p></article><article><span class="line-label green">THE MESSAGE</span><h2>Send the alert ahead.</h2><div class="simple-journey"><span>Ambulance</span><b>→</b><span>Network</span><b>→</b><span>Hospital</span></div><p>Green connections carry packets between devices. Messages can arrive well before the vehicle does.</p></article></section>
    <section class="lesson-section"><div class="section-title"><div><span class="eyebrow">FOLLOW A MESSAGE</span><h2>From alert to arrival.</h2></div><span class="subtle">Choose a step to explore</span></div><div class="message-walkthrough"><div class="walkthrough-steps" role="group" aria-label="Message journey steps">${journeySteps.map((step,i)=>`<button data-journey-step="${i}" aria-pressed="${journeyStep===i}"><span>0${i+1}</span>${step.title}</button>`).join('')}</div><article id="step-explanation" class="step-explanation" aria-live="polite">${stepContent()}</article></div></section>
    <section class="lesson-section"><div class="section-title"><div><span class="eyebrow">MEET THE NETWORK</span><h2>Every device has a job.</h2></div>${nextLink('concepts','Explore the concepts')}</div><div class="device-grid">${[
      ['01','Ambulance','Creates alerts and location updates. Its nearest available antenna changes as it moves.'],
      ['02','Roadside antenna','Provides the vehicle’s wireless connection. In the city, these are labeled RSU-01 to RSU-06.'],
      ['03','Router','Forwards messages through the available network. R1, R2, R4 and R5 provide alternative paths.'],
      ['04','Control center & hospital','The control center relays the selected path; the destination hospital receives the alert.']
    ].map(([n,title,text])=>`<article><span>${n}</span><h3>${title}</h3><p>${text}</p></article>`).join('')}</div></section>
    <aside class="reading-callout"><strong>Why does a network failure change a road?</strong><p>That coupling is a rule of this project: each node controls a nearby road checkpoint. A real router outage does not automatically close a street.</p>${nextLink('failure','See exactly what changes')}</aside>`;
  }

  function stepContent() {
    const step=journeySteps[journeyStep];
    return `<span class="lesson-badge">${step.layer} layer · ${step.unit}</span><h3>${step.title}</h3><p class="large-copy">${step.text}</p><div class="message-sample">${step.sample}</div><p>${step.detail}</p><span class="subtle">Step ${journeyStep+1} of ${journeySteps.length}</span>`;
  }
  function bindHow() {
    root.querySelectorAll('[data-journey-step]').forEach(button=>button.onclick=()=>{
      journeyStep=Number(button.dataset.journeyStep);
      root.querySelectorAll('[data-journey-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.journeyStep)===journeyStep)));
      $('step-explanation').innerHTML=stepContent();
    });
  }

  function comparison() {return source==='latest'&&sim.routeComparison ? sim.routeComparison : restoredExample?example.restored:example.disabled;}
  function failurePage() {
    const c=comparison();
    const isRestore=c.action==='restored';
    return intro('WHEN SOMETHING GOES WRONG','A node changes. The routes adapt.','See what happens to the road journey and the message path, one step at a time.')
    + `<div class="failure-toolbar"><div class="pill-switch" role="group" aria-label="Comparison source"><button data-source="example" aria-pressed="${source==='example'}">Worked example</button><button data-source="latest" aria-pressed="${source==='latest'}" ${!sim.routeComparison?'disabled':''}>Your latest change</button></div>${nextLink('simulation','Try it in 3D')}</div>
    <p class="source-note">${source==='latest'?`Saved from your journey at ${c.time.toFixed(1)} s · ${escape(c.nodeId)} ${c.action}. The journey is paused while you read.`:`Worked example · Router 4 ${isRestore?'restored':'disabled'} after 20 simulated seconds. Your journey is unchanged.`}</p>
    ${!sim.routeComparison?'<p class="subtle">Disable a node in the city to unlock “Your latest change”.</p>':''}
    <div class="failure-steps" role="group" aria-label="Failure stages">${['Before the change',isRestore?'Node restored':'Node disabled','Routes recalculated'].map((label,i)=>`<button data-failure-stage="${i}" aria-pressed="${failureStage===i}"><span>0${i+1}</span>${label}</button>`).join('')}</div>
    <div id="failure-result" aria-live="polite">${failureResult()}</div>
    <div class="failure-actions">${source==='example'?`<button class="page-button secondary" id="restore-example">${restoredExample?'Show disable example':'Show recovery example'}</button>`:''}<span class="subtle">The before and after measurements use the same vehicle position.</span></div>
    <section class="lesson-section"><div class="section-title"><div><span class="eyebrow">THE DECISION</span><h2>What the engine actually does.</h2></div></div><ol class="explanation-list"><li><strong>Remove the unavailable device.</strong><p>Every network link touching an offline node becomes unusable. Its nearby road checkpoint also closes under the project’s demo rule.</p></li><li><strong>Find two available paths.</strong><p>Road routing minimizes distance on the drawn streets. Message routing minimizes a modeled cost from delay, loss, load and hops. The destination stays the same.</p></li><li><strong>Continue from the current position.</strong><p>The ambulance holds briefly, then follows the new amber line without teleporting. A packet approaching a failed node attempts to reroute; a packet already inside it is lost.</p></li><li><strong>Recover when a node returns.</strong><p>Restoration makes its links and checkpoint available again. Both routes are recalculated, but the vehicle stays where it is.</p></li></ol></section>
    <div class="edge-cases"><article><h3>What if there is no route?</h3><p>No open road: the ambulance waits. No network path: messages cannot reach the hospital. Restore a relevant node to recover.</p></article><article><h3>Why did my road stay the same?</h3><p>The failed checkpoint may be behind the ambulance or off its remaining route. There is no need for a detour when the road ahead is still clear.</p></article></div>`;
  }

  function roadMap(snapshot,c) {
    const project = point => [30+(point[0]+48)*3,30+(point[1]+30)*3];
    const pointString = point => project(point).join(',');
    const start=c.road.before.position||c.road.before.path[0]||c.road.after.path[0];
    const node=new Simulation().node(c.nodeId);
    const closure=node?roadCheckpoint(node):null;
    const showClosure=failureStage===0?c.action==='restored':c.action==='disabled';
    const road= snapshot.path;
    return `<svg class="road-diagram" viewBox="0 0 348 246" role="img" aria-label="${snapshot.blocked?'No open road':failureStage===0?'Road route before the change':'Road route after the node change'}"><rect width="348" height="246" rx="14" fill="#edf2ec"/>${[-48,-20,20,48].map(x=>`<path d="M ${project([x,-30]).join(' ')} V 210" stroke="#d0dacf" stroke-width="9"/>`).join('')}${[-30,0,30].map(z=>`<path d="M 30 ${project([0,z])[1]} H 318" stroke="#d0dacf" stroke-width="9"/>`).join('')}
      <text x="120" y="18" class="map-street">NORTH ROAD</text><text x="124" y="237" class="map-street">SOUTH ROAD</text>
      ${road.length>1?`<polyline points="${road.map(pointString).join(' ')}" fill="none" stroke="${failureStage===1?'#b8a887':'#d99531'}" stroke-width="4" stroke-linejoin="round" ${failureStage===1?'stroke-dasharray="5 5"':''}/>`:''}
      ${showClosure&&closure?`<g transform="translate(${pointString(closure)})"><circle r="9" fill="#fff5ee" stroke="#c6654e"/><path d="M -3 -3 L 3 3 M -3 3 L 3 -3" stroke="#ba5543" stroke-width="2"/><text y="-15" text-anchor="middle" class="map-fault">${escape(c.nodeId)} offline</text></g>`:''}
      ${start?`<g transform="translate(${pointString(start)})"><circle r="7" fill="#fff" stroke="#b77d29" stroke-width="2"/><text y="20" text-anchor="middle" class="map-street">AMBULANCE</text></g>`:''}
      <g transform="translate(${pointString([34,-30])})"><rect x="-7" y="-7" width="14" height="14" rx="3" fill="#2f6655"/><path d="M -4 0 H 4 M 0 -4 V 4" stroke="white" stroke-width="2"/><text y="24" text-anchor="middle" class="map-street">HOSPITAL</text></g></svg>`;
  }

  function failureResult() {
    const c=comparison(), after=failureStage===2;
    const road=after?c.road.after:c.road.before, network=after?c.after:c.before;
    const pending=failureStage===1, restored=c.action==='restored';
    const title=failureStage===0?'Both routes before the change.':pending?`${c.nodeId} is ${restored?'online again':'now offline'}.`
      :c.road.after.blocked?'The ambulance needs an open road.':c.road.after.arrived?'The ambulance is already at the hospital.':c.road.changed?restored?'The restored route is available.':'The ambulance has another way through.':'The remaining road is still clear.';
    const detail=failureStage===0?'These are the road and message paths at the instant before the node changed.'
      :pending?restored?'The node and its connections are available again. Recovery is recalculated immediately; the previous paths are shown for context.':'The model updates availability and holds the ambulance during recalculation. The old paths are shown here for context.'
      :!c.after.path.length?'The message path is disconnected. Road availability is a separate result.':c.road.changed?'The amber route changes; the green message path is recalculated independently.':'The message route is recalculated even when the road does not need to change.';
    return `<div class="result-heading"><h2>${escape(title)}</h2><p>${detail}</p></div><div class="failure-grid"><article class="route-study"><div class="study-heading"><span class="line-label amber">AMBULANCE ROUTE</span><strong>${pending?'Recalculating':road.distance===null?'No open road':`${Math.round(road.distance)} m`}</strong></div>${roadMap(road,c)}<p>${road.arrived?'At the hospital':road.streets.length?road.streets.map(escape).join(' → '):'Restore a checkpoint to continue.'}</p></article><article class="route-study message-study"><div class="study-heading"><span class="line-label green">MESSAGE PATH</span><strong>${pending?'Recalculating':network.delay===null?'Disconnected':`${network.delay.toFixed(1)} ms`}</strong></div><div class="network-chain ${pending?'pending-chain':''}">${routeChips(network.path,pending&&!restored?c.nodeId:null)}</div><div class="message-study-note"><strong>${pending?'Connections are changing':network.path.length?`${network.hops} connections to the hospital`:'No usable connection'}</strong><p>${pending?restored?'The restored node is eligible for message routing again.':'Packets cannot use the unavailable node. A new path is being selected.':'This is the estimated message delay, not the ambulance’s travel time.'}</p></div></article></div>`;
  }
  function bindFailure() {
    root.querySelectorAll('[data-source]').forEach(button=>button.onclick=()=>{source=button.dataset.source;render();});
    root.querySelectorAll('[data-failure-stage]').forEach(button=>button.onclick=()=>{
      failureStage=Number(button.dataset.failureStage);
      root.querySelectorAll('[data-failure-stage]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.failureStage)===failureStage)));
      $('failure-result').innerHTML=failureResult();
    });
    if($('restore-example'))$('restore-example').onclick=()=>{restoredExample=!restoredExample;failureStage=2;render();};
  }

  function conceptPage() {
    const selected=phases.find(p=>p.id===phase);
    return intro('THE LEARNING LIBRARY','Understand what you’re seeing.',`${concepts.length} short explanations across the five project phases. Open a concept for its meaning, an example and what this prototype actually models.`)
    + `<div class="concept-tools"><label class="search-box"><span>Search all concepts</span><input type="search" id="concept-search" placeholder="Try CRC, TCP, routing…" value="${escape(search)}" autocomplete="off"></label><p class="subtle">In the city · Interactive example · Concept only</p></div>
    <div class="phase-tabs" role="group" aria-label="Concept phases">${phases.map((p,i)=>`<button data-phase="${p.id}" aria-pressed="${phase===p.id}"><span>0${i+1}</span>${p.name}</button>`).join('')}</div>
    <div class="concept-heading"><div><span class="eyebrow">${selected.subtitle}</span><h2>${selected.name}</h2><p>${selected.intro}</p></div><span id="concept-count" class="lesson-badge" aria-live="polite"></span></div>
    <div id="concept-results" class="concept-list"></div><section class="concept-lab" aria-labelledby="lab-title">${labContent()}</section>
    <aside class="reading-callout compact"><strong>A model, not a protocol stack.</strong><p>“Concept only” topics are explained for the project syllabus. They are not claimed as working features of the city.</p>${nextLink('guide','Read the project scope and references')}</aside>`;
  }

  function filterConcepts() {
    const query=search.trim().toLowerCase();
    const matches=concepts.filter(c=>query?`${c.title} ${c.definition} ${c.example}`.toLowerCase().includes(query):c.phase===phase);
    $('concept-count').textContent=`${matches.length} ${query?'matches across all phases':'concepts'}`;
    $('concept-results').innerHTML=matches.length?matches.map(c=>`<details class="concept-item"><summary><span>${escape(c.title)}</span><span class="concept-mode">${c.mode}</span></summary><div><p>${escape(c.definition)}</p><p class="concept-example"><strong>In this project</strong>${escape(c.example)}</p></div></details>`).join(''):`<div class="empty-search"><h3>No matching concepts.</h3><p>Try a shorter word, such as “route”, “frame” or “loss”.</p><button class="page-button secondary" id="clear-search">Clear search</button></div>`;
    if($('clear-search'))$('clear-search').onclick=()=>{search='';$('concept-search').value='';filterConcepts();$('concept-search').focus();};
  }

  function labContent() {
    if(phase==='foundation')return `<span class="eyebrow">TRY THE IDEA</span><h2 id="lab-title">More load. More delay.</h2><p>Change the synthetic network load and see the engine’s estimated delay for the same stationary ambulance.</p><label class="range-label" for="load-example">Network load <strong id="load-value">${networkLoad}%</strong></label><input id="load-example" type="range" min="0" max="100" value="${networkLoad}"><div id="load-result" class="lab-result" aria-live="polite"></div><details class="mini-lesson"><summary>See how bits can become a signal</summary><label for="signal-bits">Eight bits, using 0 and 1</label><input id="signal-bits" value="${bits}" maxlength="8" pattern="[01]{1,8}" inputmode="numeric" aria-describedby="signal-help"><p id="signal-help">Unipolar NRZ sketch: high = 1, low = 0. Not a radio waveform.</p><div id="signal-result" aria-live="polite"></div></details>`;
    if(phase==='link')return `<span class="eyebrow">TRY THE IDEA</span><h2 id="lab-title">Can you spot a damaged message?</h2><p>A frame carries the sender’s check value. The receiver recomputes it from the data that arrives.</p><div class="lab-buttons"><button class="page-button" id="corrupt-message">Corrupt message</button><button class="page-button secondary" id="restore-message">Restore message</button></div><div id="crc-result" aria-live="polite"></div><p class="subtle">CRC detects errors; the Restore button stands for obtaining the original data again. CRC cannot repair the payload.</p>`;
    if(phase==='routing')return `<span class="eyebrow">TRY THE IDEA</span><h2 id="lab-title">Remove one node. Keep the destination.</h2><p>Compare the road distance, message hops and estimated delay before and after Router 4 fails.</p>${nextLink('failure','Open the failure walkthrough')}`;
    if(phase==='transport')return `<span class="eyebrow">TRY THE IDEA</span><h2 id="lab-title">Lose the same message twice.</h2><p>Run two isolated examples: one UDP and one TCP. Each deliberately loses its first data packet; random background loss is disabled for this lesson.</p><button class="page-button" id="compare-protocols">${transportResult?'Run comparison again':'Compare UDP and TCP'}</button><div id="transport-result" aria-live="polite">${transportContent()}</div><p class="subtle">Results come from the project’s simplified engine after 20 simulated seconds. Your 3D journey is not affected.</p>`;
    return `<span class="eyebrow">CONNECT THE IDEAS</span><h2 id="lab-title">One alert, different layers.</h2><p>The application gives a message meaning. Transport defines delivery behavior, IP provides addressing, and local links carry frames.</p><div class="layer-stack"><span><b>Application</b>Emergency alert</span><span><b>Transport</b>UDP in the main journey</span><span><b>Internet</b>Ambulance IP → hospital IP</span><span><b>Link</b>Next-hop frame and CRC example</span></div>${nextLink('how','Follow the full message journey')}`;
  }

  function transportContent() {
    if(!transportResult)return '<p class="lab-placeholder">Run the comparison to see which message gets delivered.</p>';
    return `<div class="protocol-results">${['udp','tcp'].map(protocol=>{const r=transportResult[protocol];return `<article><span class="lesson-badge">${protocol.toUpperCase()}</span><h3>${r.delivered?'Delivered after retry':'Lost without retry'}</h3><p>${r.lost} data packet lost · ${r.retries} ${r.retries===1?'retry':'retries'} · ${r.delivered} message delivered</p><p>${protocol==='tcp'?`${r.handshake.join(' · ')}<br>${r.acknowledged?'Data acknowledgement received.':'No data acknowledgement.'}`:'No handshake. UDP does not automatically retransmit this datagram.'}</p></article>`;}).join('')}</div>`;
  }

  function bindConcepts() {
    $('concept-search').oninput=event=>{search=event.target.value;filterConcepts();};
    root.querySelectorAll('[data-phase]').forEach(button=>button.onclick=()=>{
      phase=button.dataset.phase;search='';render();
      root.querySelector(`[data-phase="${phase}"]`).focus({preventScroll:true});
    });
    filterConcepts();
    if(phase==='foundation'){
      const updateLoad=()=>{const r=loadEstimate(networkLoad);$('load-value').textContent=`${r.load}%`;$('load-result').innerHTML=`<strong>${r.delay.toFixed(1)} <small>ms estimated delay</small></strong><span>Link capacity stays ${r.capacity} Mbps. This is not measured throughput.</span>`;};
      $('load-example').oninput=event=>{networkLoad=Number(event.target.value);updateLoad();};updateLoad();
      const updateSignal=()=>{
        bits=$('signal-bits').value;
        if(!/^[01]{1,8}$/.test(bits)){$('signal-result').textContent='Enter one to eight bits using only 0 and 1.';return;}
        const points=bits.split('').flatMap((bit,i)=>[[20+i*40,bit==='1'?25:75],[60+i*40,bit==='1'?25:75]]);
        $('signal-result').innerHTML=`<svg class="signal-diagram" viewBox="0 0 360 108" role="img" aria-label="Signal for bits ${bits}"><path d="M 20 25 H 340 M 20 75 H 340" stroke="#d4dfd6"/><polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#2e6657" stroke-width="3"/>${bits.split('').map((bit,i)=>`<text x="${40+i*40}" y="101" text-anchor="middle">${bit}</text>`).join('')}</svg>`;
      };$('signal-bits').oninput=updateSignal;updateSignal();
    }
    if(phase==='link'){
      const updateCRC=()=>{
        const original='EMERGENCY|AMB-01|CRITICAL|HOSP-01',received=corrupt?original.replace('CRITICAL','CRITIC@L'):original;
        const sent=crc32(original),checked=crc32(received);
        $('crc-result').innerHTML=`<div class="frame-example"><div><span>Source MAC</span><code>02:1A:2B:3C:4D:01</code></div><div><span>Next-hop MAC</span><code>02:1A:2B:3C:4D:04</code></div><div class="frame-payload"><span>Received payload</span><code>${received}</code></div><div><span>Sent CRC-32</span><code>${sent}</code></div><div><span>Receiver’s CRC-32</span><code>${checked}</code></div></div><p class="crc-status ${corrupt?'damaged':''}">${sent===checked?'✓ Values match — no change detected.':'× CRC mismatch — corruption detected.'}</p>`;
        $('corrupt-message').disabled=corrupt;$('restore-message').disabled=!corrupt;
      };$('corrupt-message').onclick=()=>{corrupt=true;updateCRC();};$('restore-message').onclick=()=>{corrupt=false;updateCRC();};updateCRC();
    }
    if(phase==='transport')$('compare-protocols').onclick=()=>{transportResult=compareDelivery();$('transport-result').innerHTML=transportContent();$('compare-protocols').textContent='Run comparison again';};
  }

  function guidePage() {
    return intro('YOUR PROJECT GUIDE','Start small. Explain it clearly.','A quick demo plan, answers to common questions and an honest view of what this prototype includes.')
    + `<section class="guide-start"><div><span class="eyebrow">A SHORT DEMONSTRATION</span><h2>Show the whole idea in four steps.</h2><p>Keep the city visible first. Use the learning pages when you want to explain a result.</p>${nextLink('simulation','Open the simulation')}</div><ol class="demo-steps"><li><strong>Start the ambulance.</strong><p>Point out the amber road and green message connections.</p></li><li><strong>Disable Router 4 early.</strong><p>Do this before it passes the central checkpoint. Watch the road route change.</p></li><li><strong>Open Node failure.</strong><p>Choose Your latest change. Compare the actual road routes and message delays from that moment.</p></li><li><strong>Return and restore.</strong><p>Resume the journey, or restore the node to show recovery. Continue until the ambulance reaches the hospital.</p></li></ol></section>
    <section class="lesson-section"><div class="section-title"><div><span class="eyebrow">HELP</span><h2>Questions you might have.</h2></div></div><div class="faq-list">${[
      ['Will opening a page reset my journey?','No. Moving between these pages pauses the simulation and keeps the vehicle position, disabled nodes and latest comparison in memory. Return to Simulation and press Resume journey. Reloading the browser starts a fresh session.'],
      ['Why does the ambulance keep its route for some failures?','Only checkpoints affecting the remaining road need a detour. An offline node behind the ambulance or on another road can leave the current route usable. Messages may still change paths independently.'],
      ['Why does the hospital receive an alert before the ambulance arrives?','Messages travel through network links while the vehicle follows roads. Delivery of the alert and physical arrival are separate events. The animations use expanded time to make them visible.'],
      ['What do the colors mean?','Amber marks the selected road route; green marks message paths. Red crosses mark unavailable road checkpoints and the failed node is labeled OFFLINE. Labels and status messages also identify the change.'],
      ['What should I do when the ambulance stops?','If the journey is paused, press Resume. If no open road exists, restore a node affecting the blocked route. A message-only disconnection does not automatically mean the road is blocked.'],
      ['What does Restart do?','Restart resets the vehicle, all nodes, packet counts and the saved comparison. Run again also starts a fresh scenario after a completed journey.'],
      ['Why can’t I see the city?','The 3D view needs WebGL and browser hardware acceleration. The explanation pages can still be read if 3D rendering is unavailable.'],
      ['Are these real locations or emergency messages?','No. All vehicles, positions, addresses and messages are fictitious. The simulation never contacts an ambulance, hospital, traffic controller or real network device.']
    ].map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div></section>
    <section class="lesson-section"><div class="section-title"><div><span class="eyebrow">PROJECT SCOPE</span><h2>What is running, and what is taught.</h2></div></div><div class="scope-grid"><article><span class="lesson-badge">Working simulation</span><h3>The 3D city</h3><p>Road movement, manual node failure and recovery, physical detours, weighted network routing, antenna handoff, animated UDP messages and delivery tracking.</p></article><article><span class="lesson-badge">Isolated examples</span><h3>The learning pages</h3><p>Engine-generated route comparisons, CRC corruption checks, a simplified TCP loss-and-retry example, load-dependent delay and a line-coding sketch.</p></article><article><span class="lesson-badge">Explanation only</span><h3>The wider syllabus</h3><p>Full OSI theory, actual Ethernet/Wi-Fi operation, distributed RIP/OSPF, multicast, IPv6 transition, real HTTP/DNS, email and SSH. These are not implemented protocol stacks.</p></article></div></section>
    <section class="architecture-note"><span class="eyebrow">HOW THE PROJECT FITS TOGETHER</span><h2>One shared model, two views of it.</h2><p>The simulation engine owns nodes, packets and message routes. A separate road graph moves the ambulance along city streets. The Three.js scene draws that state. These learning pages read the saved comparison and run isolated examples, so experiments here never change your journey.</p><p>All assets are bundled locally. The example costs, road closures, coverage radii and timing are teaching assumptions, not measurements from a real emergency system.</p></section>
    <section class="lesson-section reference-section"><div class="section-title"><div><span class="eyebrow">READ FURTHER</span><h2>Protocol references.</h2></div></div><p>The concepts are simplified for learning. These primary specifications describe the real protocols.</p><div class="reference-links"><a href="https://www.rfc-editor.org/rfc/rfc1122" target="_blank" rel="noopener noreferrer"><span>Internet communication layers</span><small>RFC 1122 ↗</small></a><a href="https://www.rfc-editor.org/rfc/rfc9293" target="_blank" rel="noopener noreferrer"><span>TCP</span><small>RFC 9293 ↗</small></a><a href="https://www.rfc-editor.org/rfc/rfc768" target="_blank" rel="noopener noreferrer"><span>UDP</span><small>RFC 768 ↗</small></a><a href="https://www.rfc-editor.org/rfc/rfc8200" target="_blank" rel="noopener noreferrer"><span>IPv6</span><small>RFC 8200 ↗</small></a></div></section>`;
  }

  window.addEventListener('hashchange',navigate);
  navigate();
  return {get current(){return page;}};
}
