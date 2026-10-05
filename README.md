🚑 Emergency Route

3D Emergency Vehicle Communication & Dynamic Routing Simulator

Live Demo: "Emergency Route" (https://karthikrajj.github.io/ER-CN/)

«An interactive educational simulation demonstrating how network failures and physical road blockages can affect an emergency vehicle journey and its communication with a hospital.»

---

🌐 Overview

Emergency Route is an educational 3D simulation that demonstrates the relationship between:

- 🚑 Emergency vehicle movement
- 🌐 Computer networks
- 📡 Router & antenna failures
- 🛣️ Dynamic road rerouting
- 📦 Network message routing
- 🔄 Failure recovery
- 📊 Route comparison and analysis

The simulation places an ambulance inside a fictional 3D city. While the ambulance travels toward a hospital, network nodes can be disabled. When a failed node blocks the ambulance's road checkpoint, the vehicle dynamically recalculates its physical route and follows an alternate road.

At the same time, emergency and location messages attempt to reach the hospital through the network. If a network node fails, the communication layer searches for an alternate path whenever one exists.

🎯 Core Idea

One failure → Two different consequences

                 NODE FAILURE
                      │
             ┌────────┴────────┐
             ↓                 ↓
       Physical Road       Network Path
          Impact              Impact
             │                 │
      Road recalculation   Message rerouting
             │                 │
             ↓                 ↓
       🚑 Detour          📦 Alternate route

The project intentionally separates physical road failures from network communication failures to make the concepts easier to understand.

---

✨ Key Features

🚑 Dynamic Ambulance Routing

- Real-time ambulance movement
- Continuous road-based movement
- Dynamic route recalculation
- No teleportation
- Junction turning
- U-turn support
- Road checkpoint failures
- Route recovery after node restoration

🌐 Network Simulation

- Router and antenna nodes
- Weighted network routing
- Link delay
- Modeled packet loss
- Network load
- Hop-count considerations
- Node/link failure handling
- Alternate message paths
- Wireless antenna handoff

📡 Failure Simulation

Disable a router or antenna and observe:

1. Node becoming unavailable
2. Road checkpoint being blocked
3. Physical route recalculation
4. Network route recalculation
5. Message delay changes
6. Possible communication disconnection

📊 Route Comparison

The See route change feature compares:

- Original road route
- New road route
- Remaining distance
- Network path
- Estimated delay
- Changed checkpoints

📚 Interactive Learning

The project contains dedicated educational pages covering:

- Network fundamentals
- Routing
- Transport protocols
- Node failures
- CRC
- UDP/TCP
- Network load
- Line coding
- Emergency communication concepts

---

🖥️ Website Pages

Page| Description
🚑 Simulation| Main 3D emergency vehicle simulation
⚙️ How It Works| Explains vehicle and message journeys
💥 Node Failure| Demonstrates failure and route recalculation
📚 Concepts| 45 searchable networking explanations
📖 Guide| Demonstration plan, architecture, FAQ and references

All pages use bookmarkable hash URLs and work without server-side routing.

---

🚑 Simulation

The main simulation contains a fictional 3D city with:

- Ambulance
- Hospital
- Roads
- Routers
- Antennas
- Network links
- Road checkpoints
- Network packets

Start the Journey

Press:

Start ambulance

The ambulance immediately begins moving toward the hospital while sending emergency and location messages.

The same button can be used to:

- Pause
- Resume

---

💥 Testing a Node Failure

Select any router or antenna from the interface or directly inside the 3D city.

Then press:

Disable node

The disabled node:

- Turns grey
- Displays a red cross
- Makes its road checkpoint unavailable
- Can force a physical road detour
- Can affect network communication

Example

Try disabling Router 4 before the ambulance reaches the central street.

The ambulance can automatically:

Original Route
      ↓
Central Street
      ↓
   ❌ Router 4
      ↓
Route Recalculation
      ↓
West Avenue
      ↓
North Road
      ↓
Hospital

The network layer simultaneously searches for an alternate communication route.

---

🔀 Physical Routing vs Network Routing

One of the main educational goals of Emergency Route is demonstrating that road routing and network routing are separate problems.

🛣️ Road Routing

The ambulance uses the visible road graph.

The planner considers:

- Available streets
- Blocked checkpoints
- Remaining distance
- Current vehicle position
- Junctions
- U-turn possibilities

A shortest-distance planner is used, with the original route preferred when distances tie.

🌐 Network Routing

Messages use a separate network graph.

The routing algorithm considers:

- Link delay
- Modeled packet loss
- Network load
- Hop count
- Node availability

Offline nodes and their incident links are excluded.

Hospitals are communication endpoints and are not used as transit routers.

---

📦 Message Routing

The visible emergency journey uses:

- UDP emergency messages
- UDP location messages

When a node fails:

Ambulance
    │
    │ Emergency Message
    ↓
 Router A
    │
    ❌ Router B
    │
    ↓
 Router C
    │
    ↓
 Hospital

If an alternate connected path exists, the message attempts to use it.

If no path exists, the system reports the communication failure instead of creating a fake route.

Important Behavior

Packets already inside a disabled node are lost.

Messages that have not yet reached the failed node can attempt rerouting.

---

🔄 Node Recovery

Press:

Restore node

The disabled checkpoint becomes available again and the device reconnects.

The remaining ambulance journey is recalculated.

If the vehicle was previously trapped because of road closures, it waits until a valid route becomes available.

Recovery Behavior

Node Disabled
      ↓
Road / Network Recalculation
      ↓
Alternative Route
      ↓
Node Restored
      ↓
Remaining Journey Recalculated

An ambulance that has already reached the hospital remains at the hospital.

---

🗺️ Route Visualization

The simulation uses different visual elements to represent different systems.

Visual| Meaning
🟠 Amber line| Ambulance's current physical road route
🔴 Red cross| Unavailable road checkpoint
🟢 Green path| Network message route
⚪ Grey node| Disabled network device

The amber road route changes as the ambulance physically reroutes.

---

🎥 Route Comparison

Press:

See route change

The system opens a comparison showing the saved before-and-after routes.

It compares:

- Previous route
- New route
- Remaining distance
- Changed road segments
- Network paths
- Estimated communication delay

The comparison uses the same:

- Vehicle position
- Traffic load
- Bandwidth
- Simulation state

at the moment the node was changed.

---

📚 Learning Section

How It Works

Explains the complete journey:

Vehicle Journey

Ambulance
   ↓
Road Network
   ↓
Failure Detection
   ↓
Route Recalculation
   ↓
Alternative Road
   ↓
Hospital

Message Journey

Ambulance
   ↓
Network Node
   ↓
Routing
   ↓
Possible Failure
   ↓
Alternate Path
   ↓
Hospital

The page contains five clickable message steps and explains the role of each device.

---

💥 Node Failure

The Node Failure page provides:

- Before failure
- Disabled state
- Recalculated route
- Worked examples
- Recovery examples

The examples use the actual simulation engine rather than being purely static illustrations.

The latest 3D journey snapshot is used for route comparisons, including unchanged roads and unavailable paths.

---

📖 Concepts

The Concepts page contains 45 searchable networking explanations covering:

Foundations

- Networking basics
- Network devices
- Communication concepts

Local Links

- Nodes
- Links
- Wireless coverage

Routing

- Routing algorithms
- Alternate paths
- Link failures

Transport

- UDP
- TCP
- Packet loss
- Reliability

Applications

- Emergency communication
- Network resilience
- Failure recovery

The page also includes isolated interactive experiments such as:

- CRC corruption and recovery
- Forced UDP/TCP loss
- Network load estimation
- Simple line-coding visualization

Topics are labelled according to whether they are:

- 🟢 Active simulation features
- 🟡 Isolated interactive examples
- ⚪ Theory-only concepts

---

🎮 Controls

Camera

Control| Function
City| Overview of the city
Network| Network-focused camera
Follow| Follow the ambulance
Drag| Look around
Scroll| Zoom

Simulation

Control| Function
Start ambulance| Start / pause / resume
Disable node| Simulate node failure
Restore node| Recover a failed node
See route change| Compare routes
Restart| Reset entire scenario
Run again| Start a fresh journey after completion

---

🔬 Simulation Rules

To keep the project educational and predictable, Emergency Route uses explicit simulation rules.

Road Failure Model

A router or antenna controls a checkpoint at its nearest street position.

Disabling the device makes that checkpoint unavailable to the ambulance.

«In a real-world system, a network outage does not automatically close a physical road. This relationship exists only as an explicit rule inside this educational simulation.»

Road Planner

The road planner:

- Works on streets visible in the city
- Uses shortest-distance routing
- Prefers the original route when distances tie
- Allows normal junction turns
- Allows U-turns when required
- Preserves current vehicle position
- Never teleports the ambulance

A failure behind the ambulance or away from its remaining route does not create an unnecessary detour.

---

🌐 Network Engine

The network engine uses weighted routing based on:

Route Cost =
    Link Delay
    + Modeled Loss
    + Network Load
    + Hop Count

Offline nodes and incident links are removed from consideration.

If no connected route exists, the system explicitly reports the communication failure.

Wireless Handoff

A nearby working antenna can take over when wireless coverage overlaps.

---

⚙️ Technical Architecture

                    Emergency Route
                           │
            ┌──────────────┴──────────────┐
            │                             │
       3D Experience                 Learning System
            │                             │
     ┌──────┼──────┐              ┌───────┼────────┐
     │      │      │              │       │        │
   City   Vehicle Network       Concepts Failure  Labs
     │      │      │
     └──────┼──────┘
            │
       Simulation Engine
            │
     ┌──────┴───────────┐
     │                  │
 Road Routing      Network Routing
     │                  │
 Dijkstra-style      Weighted
 road planner        routing

---

📁 Project Structure

dist/
├── index.html
├── app.css
├── pages.mjs
├── pages.css
├── learning-data.mjs
├── learning-models.mjs
├── app.mjs
├── experience.mjs
├── city.mjs
├── engine.mjs
├── road-routing.mjs
└── vendor/
    ├── Three.js
    └── Orbit Controls

Main Modules

File| Responsibility
"index.html"| Main application structure
"app.css"| Shared interface styling
"pages.mjs"| Learning pages and interactions
"pages.css"| Learning page styling
"learning-data.mjs"| Educational explanations
"learning-models.mjs"| Isolated learning experiments
"app.mjs"| Controls and route comparison
"experience.mjs"| Journey lifecycle and replay
"city.mjs"| 3D city generation
"engine.mjs"| Network simulation and packet state
"road-routing.mjs"| Physical road routing

---

🛠️ Run Locally

Requirements

- Node.js 18+
- Modern web browser
- WebGL support

Start the project

node serve.cjs

Then open:

http://127.0.0.1:4173/

Everything is bundled locally.

No:

- External fonts
- Remote 3D assets
- Additional installation
- External runtime dependencies

are required.

---

🧪 Validation & Testing

The project includes dedicated validation scripts.

Learning Tests

node test-learning.mjs

Validates:

- Failure/recovery examples
- Snapshot positions
- Deterministic UDP/TCP loss
- Phase coverage
- Load-dependent delay

Road Routing Tests

node test-road-routing.mjs

Validates:

- Physical detours
- Failures before travel
- Failures during travel
- U-turns
- Road-only movement
- Offline checkpoint avoidance
- No teleportation
- Blocked journeys
- Recovery
- Pause preservation
- Reset behavior

Experience Tests

node test-experience.mjs

Validates:

- Idle state
- Journey start
- Pause/resume
- Successful arrival
- Replay
- Node failures
- Connectivity loss
- Recovery
- Restart

Network Engine Tests

node test-engine.mjs

Validates:

- CRC
- Data corruption
- Link failures
- Node failures
- In-flight rerouting
- Saved route comparisons
- Antenna handoff
- Network isolation
- TCP/UDP behavior
- Packet accounting
- Original engine demonstration

---

🧠 Educational Purpose

Emergency Route is designed to help students understand networking concepts through visualization rather than only theoretical diagrams.

Instead of simply showing:

«“A node failed.”»

the simulation allows the learner to observe:

Node Failure
     ↓
Network Impact
     +
Road Checkpoint Impact
     ↓
Route Recalculation
     ↓
Communication Changes
     ↓
Vehicle Continues / Waits
     ↓
Node Recovery
     ↓
System Recalculates Again

This creates a connection between computer networking theory and a visible real-world-inspired scenario.

---

🚧 Simulation Boundaries

This project is not a real emergency-response platform.

All:

- Places
- Vehicles
- Messages
- Network nodes
- Hospitals
- Routes

are fictional.

The project does not connect to:

- Real emergency services
- GPS services
- Traffic-control systems
- Hospitals
- Medical services
- Real emergency communication networks

The simulation is intended exclusively for education, demonstration, experimentation and academic presentation.

---

👥 Team

Emergency Route Team

Member| Role
Mariam Skaria| Team Member
Layel K Manoj| Team Member
Karthik Raj| Team Member
Junia Alex| Team Member
Malavika Krishnan| Team Member

👨‍💻 Team

Mariam Skaria · Layel K Manoj · Karthik Raj · Junia Alex · Malavika Krishnan

---

📜 Technology Stack

- HTML5
- CSS3
- JavaScript
- Three.js 0.170.0
- WebGL
- Dijkstra-based routing
- CRC-32
- TCP/UDP simulation
- Graph-based network simulation

---

📄 License & Attribution

Three.js 0.170.0 is licensed under the MIT License.

License information is included in:

dist/vendor/THREE-LICENSE.txt

---

🚀 Live Demo

Try the simulation

👉 "Emergency Route — Live Website" (https://karthikrajj.github.io/ER-CN/)

Start the ambulance, disable a router, observe the road detour, inspect the network route, and restore the failed node.

---

⭐ Project Highlights

«🚑 Dynamic emergency vehicle routing
🌐 Network-aware communication simulation
💥 Interactive node failure
🔀 Automatic physical & network rerouting
🔄 Failure recovery
📊 Before/after route comparison
📚 45+ networking concepts
🧪 Automated validation suite
🎮 Interactive 3D visualization»

---

Built as an educational Computer Networking project

Emergency Route — Visualizing Network Resilience Through an Interactive 3D Simulation.