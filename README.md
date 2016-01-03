# PBOT (Pattern Based OT)

This project is a server and client for the Pattern-based Operational
Transform algorithm as described in [this paper](http://www.computer.org/csdl/trans/td/preprint/07060680-abs.html).
It's published with the author's permission.

I'm building this project for fun -- I want to better understand OT. And
implementing an OT algorithm seemed like a good start. It's not a library
intended for production use. I'm making it public in case others find it
interesting or the code useful.

What's exciting about pattern-based OT? Here are two things that I find particularly
cool:

1. PBOT doesn't require any transformation of operations on the server. Most
OT algorithms involve transformation work on the server which impacts
scalability and which limits technology choices if you want to write your OT
code only once.

2. Sends local ops to the server immediately. This is in contrast, for example,
to the Google Wave OT algorithm which waits for outbound ops to come back before
sending more. This helps performance and avoids a complex client/network state
machine.

CAVEAT: this is a toy project/WIP. All server state is stored in memory, it doesn't
handle client disconnects/reconnects, it doesn't have great test coverage, etc.
I advise against using any of this as production code.

# Demos

As an example, you might use pbot to create a collaborative text-editing application.
Here's how you might set up the server with node, express and ws:

```
// Standard express setup
let express = require('express');
let app = express();
let httpServer = require('http').Server(app);
httpServer.listen(3000, function () { console.log('listening on port 3000'); });

// Standard ws setup
let ws = require('ws');
let WebSocketServer = ws.Server;
let wss = new WebSocketServer({ server: httpServer });

// PBOT setup
let otServer: OTServer = new OTServer();
wss.on('connection', (ws: any) => { connectServerSocket(otServer, <IWebSocket>ws); });
```

And here's how to set up the client:

```
let textArea = document.getElementById('yourTextAreaId');
let binding = new CollaborativeTextAreaBinding(documentId, textArea);
```

If you want to get notified when the document has loaded, or every time it has
incorporated remote changes, you can do:

```
binding.client().addListener(yourListener);
```

For a working example of a text-editor application, check out the demo in
`src/demos/collaborative-text-editor`.

Here's a gif of the demo in action:

![Gif of two documents](https://github.com/ryankaplan/pattern-based-ot/blob/master/src/demos/collaborative-text-editor/static/images/demo.gif?raw=true)

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
