# PBOT (Pattern Based OT)

This is a server and client for a real-time collaborative document editor. It's based on the Pattern-based Operational
Transform algorithm as described in [this paper](http://www.computer.org/csdl/trans/td/preprint/07060680-abs.html) and is published with the author's permission.

Here's a gif of it in action:

![Gif of two documents](https://github.com/ryankaplan/pattern-based-ot/blob/master/src/demos/static/images/demo.gif?raw=true)


I built this for fun -- I wanted to better understand OT. And implementing an OT algorithm seemed like a good start. It's not a library intended for production use. I'm making it public in case others find it interesting or the code useful.

What's exciting about pattern-based OT (when compared to other OT algorithms)?

1. It doesn't require any transformation of operations on the server. Most OT algorithms involve transformation work on the server which impacts scalability and means you have to write transformation code once for the server and once for the client (or use the same language on both).

2. Sends local ops to the server immediately. This is in contrast, for example, to the Google Wave OT algorithm which waits for outbound ops to come back before sending more. This aids performance (slightly) and avoids a complex client/network state machine.

CAVEAT: this is a prototype and was never meant to be used in production. All server state is stored in memory, it doesn't handle client disconnects/reconnects, it doesn't have great test coverage, etc.

# Development Setup

To get started:

- Install npm by downloading and installing node.js from here: https://nodejs.org/en/
- Clone the repo and navigate to it in a terminal. Run `npm install`
- In one terminal window run `jake demos && jake watch`
- In another terminal window run `$(npm bin)/nodemon build/demos/server.js`
- Visit `http://localhost:3000/` in a browser. This will navigate to a URL with a random documentId.
- Copy paste the URL from this tab into another tab and type away!

To run tests, run `jake test` from the project root.

#Project Structure

- src/ :: all 'library' code
  - base/ :: language and platform utilities that aren't specific to this project
  - demos/ :: demonstration applications that use the pbot 'library'
  - pbot/ :: pattern-based OT logic
    - control.ts :: pattern-based OT control algorithm
    - char/ :: character-based operations
    - grove/ :: grove (tree) based operations

/test contains all test code. Subfolders of test/ mirror those of src. So
tests for src/pbot/char live in test/pbot/char.

# Citations

[1] Yi Xu, Chengzheng Sun, "Conditions and Patterns for Achieving Convergence in OT-based Co-Editors", IEEE
Transactions on Parallel & Distributed Systems, , no. 1, pp. 1, PrePrints PrePrints, doi:10.1109/TPDS.2015.2412938
