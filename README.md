# PBOT (Pattern Based OT)

This project is a server and client for the Pattern-based Operational
Transform algorithm as described in [this paper](http://www.computer.org/csdl/trans/td/preprint/07060680-abs.html).
This implementation is published with permission from one of the
authors - Prof. Sun.

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

# This implementation

There aren't any known bugs in the OT code but, again, this is *not* built
to be a production-ready library. For example:

- all state is stored in memory; when the server restarts, all your data goes away
- it doesn't support undo/redo
- doesn't handle client disconnects/reconnects well
- it doesn't have great test coverage (yet)

That said, I plan to keep working on this so it'll get better over time. Maybe at
some point it'll be useful to someone other than me.

There's a demo illustrating how to use the library in
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
