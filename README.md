# Emergency Route

**Live Website:** [https://karthikrajj.github.io/ER-CN/](https://karthikrajj.github.io/ER-CN/)

An educational website with a focused 3D demonstration of an ambulance communicating with a hospital while network nodes fail and recover. The ambulance now changes its physical road route when a failed node blocks its way. All places, messages and vehicles are fictitious. No real emergency, GPS, traffic-control or medical services are contacted.

## Run locally

Requires Node.js 18 or newer and a browser with WebGL. From this folder run `node serve.cjs`, then open http://127.0.0.1:4173/. Everything is bundled locally; no installation, remote fonts or external 3D assets are required.

## Use the simulation

1. Press **Start ambulance**. The vehicle starts moving immediately and sends messages to the hospital. The same button pauses or resumes the journey.
2. Choose a router or antenna, or select one directly in the 3D city. Press **Disable node**. The node turns grey, a red cross marks its road checkpoint, and the amber road line updates. Try Router 4 before the ambulance passes the central street: it will take West avenue and North road instead. Network messages also find an alternate route when one exists.
3. Press **See route change** to compare the saved before-and-after road routes and remaining distances. Expand **Message route** for the network paths and estimated delays. Close the window to return to the city.
4. Press **Restore node** to reopen its checkpoint and reconnect that device. If road closures trap the ambulance, it waits in place until a route opens. A message disconnection is shown separately.
5. Use **City**, **Network** or **Follow** to change the camera. Drag to look around and scroll to zoom.
6. **Restart** restores every node and clears the journey. **Run again** appears after the ambulance arrives and the hospital has received the alert.

You can test nodes before starting the ambulance or after the journey finishes. These experiments update the planned road route without starting or restarting the vehicle. Changing a node while paused preserves the pause. Starting the journey preserves any faults you have already introduced. Run again and Restart begin a fresh scenario.

The amber line represents the ambulance's current road route; it changes with the route the vehicle actually follows. Red crosses mark unavailable checkpoints. Green paths carry network messages. The status card explains what is happening. The main simulation stays focused. Explanations and interactive lessons live on separate pages, reached through the top navigation.

## Website pages

- **Simulation** (`#simulation`): the original 3D city, start/pause, node failures, physical rerouting and recovery.
- **How it works** (`#how`): the separate vehicle and message journeys, five clickable message steps, and the role of each device.
- **Node failure** (`#failure`): before / disabled / recalculated views of the road and message routes. A worked example and a recovery example use the real engine. Your latest change uses the saved snapshot from the current 3D journey, including unchanged roads and unavailable paths.
- **Concepts** (`#concepts`): 45 searchable explanations across foundations, local links, routing, transport and applications. Labels distinguish active simulation features, isolated interactive examples and theory-only topics. Labs include CRC corruption and recovery, forced UDP/TCP loss, network load estimates and a simple line-coding sketch.
- **Guide** (`#guide`): a demonstration plan, FAQ, project architecture, implementation boundaries and links to primary protocol references.

The pages have bookmarkable hash URLs and work without server-side routing. Navigation pauses the simulation and preserves its in-memory state; returning to the city does not automatically resume the vehicle. Browser reload starts a fresh session. Lesson experiments do not alter the main simulation.

## Project structure

- `dist/index.html`, `dist/app.css`: shared navigation and the focused simulation interface.
- `dist/pages.mjs`, `dist/pages.css`: the four learning pages and their interactions.
- `dist/learning-data.mjs`: explanations and feature-coverage labels for the five phases.
- `dist/learning-models.mjs`: isolated, engine-based failure and transport examples.
- `dist/app.mjs`: controls, feedback and the route comparison dialog.
- `dist/experience.mjs`: journey start, pause, completion, replay and node experiments.
- `dist/city.mjs`: the existing locally generated Three.js city.
- `dist/engine.mjs`: the shared network simulation and packet state.
- `dist/road-routing.mjs`: the road graph, physical detours and continuous vehicle movement.
- `dist/vendor/`: bundled Three.js and orbit controls.

The previous interface is backed up outside this release in the workspace's `work/evcn-before-fresh-redesign.zip`.

## Simulation boundaries

For this educational scenario, each router or antenna controls a checkpoint at its nearest street position. Disabling it marks that checkpoint unavailable to the ambulance. This is an explicit simulation rule: a real network outage does not itself close a road. A shortest-distance road planner works on the streets visible in the city, preferring the original route when distances tie. The ambulance can turn at junctions or make a U-turn from its current location without teleporting. A failure behind the ambulance or off its remaining route does not force an unnecessary detour. Restoring a node recalculates the remaining journey, and arrived vehicles stay at the hospital. Road replanning preserves the current position and progress.

Weighted Dijkstra network routing accounts for link delay, modeled loss, load and hop count. Offline nodes and all incident links are excluded. Hospitals are endpoints, not transit routers. A nearby working antenna can take over when wireless coverage overlaps. If there is no connected path, the interface reports it instead of inventing an alternate route.

Packets already inside a disabled node are lost; messages ahead of it try a new route. The visible journey uses UDP emergency and location messages. Movement is deliberately slower than the modeled millisecond network delay. The route comparison saves both paths using the same positions, traffic load and bandwidth at the instant of a node change. Road distances are remaining simulated meters from that same position.

The underlying engine also retains its CRC-32, hop-count routing, simplified TCP and seeded full-demo routines for existing validation. The learning pages expose selected isolated examples without adding controls to the 3D scene. It is an educational model, not a real protocol stack or an emergency-response system.

## Validation

Run `node test-learning.mjs` for isolated failure/recovery examples, snapshot positions, deterministic UDP/TCP loss results, phase coverage and load-dependent delay.

Run `node test-road-routing.mjs` for physical detours, failures before and during travel, U-turns, road-only movement, offline checkpoint avoidance, no teleporting, blocked journeys and recovery, pause preservation and reset.

Run `node test-experience.mjs` to check the new journey flow: idle state, start, pause/resume, successful arrival, replay, node failures before and after a journey, loss of connectivity, recovery and restart.

Run `node test-engine.mjs` for CRC, corruption, link/node failures, in-flight rerouting, saved route comparisons, antenna handoff, isolation, TCP/UDP behavior, packet accounting and the original engine demo.

Three.js 0.170.0 is MIT-licensed. See `dist/vendor/THREE-LICENSE.txt`.
