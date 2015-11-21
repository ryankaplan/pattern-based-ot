# PbOT (Pattern Based OT)

This project is a server and client for the Pattern-based Operational Transform
algorithm as described in [this paper](http://www.computer.org/csdl/trans/td/preprint/07060680-abs.html)
by Yi Xu and Chengzheng Sun [^1]. It also contains a demo of a collaborative
text editor that uses the server/client.

I'm building this project for fun -- I want to better understand OT. And
implementing an OT algorithm seemed like a good start. It's not a library
intended for public use but I'm making it public anyway in case others find
it interesting or the code useful.

There aren't any known bugs in the OT code, but this is not built to be a
production-ready library. Some examples of current issues:

- it doesn't support undo/redo
- all state it stored in memory
- when a client connects to a document it plays through all operations in its history
- it doesn't have great test coverage

You get the idea... I plan to keep working on this though, so it'll get better
over time and maybe at some point it'll be useful to someone other than me.

Here's a gif of it in action:

<div style="text-align:center"><img src ="https://github.com/ryankaplan/pattern-based-ot/blob/master/src/static/images/demo.gif?raw=true" /></div>

# Development Setup

To get started:

- Install npm by downloading and installing node.js from here: https://nodejs.org/en/
- Open the repo folder and run `npm install`
- In one terminal window run `jake watch`
- In another terminal window run `nodemon build/server/server.js`
- Visit `http://localhost:3000/` in a browser to see the collaborative-text demo

To run tests, run `jake test` from the project root.

# Things I plan to next...

- Save document state on disk, or at least build an interface for doing so.
- Implement the history buffer/selective replication optimizations from the paper.
- Make socket.io less of a dependency because it doesn't guarantee strict message
  ordering on all browsers and it would be nice to be able to swap it out for
  something else.
- Some basic form of undo/redo.
- Implement a tree OT type of some form.

Also build tests as necessary.

# Citations

[1] Yi Xu, Chengzheng Sun, "Conditions and Patterns for Achieving Convergence in OT-based Co-Editors", IEEE
Transactions on Parallel & Distributed Systems, , no. 1, pp. 1, PrePrints PrePrints, doi:10.1109/TPDS.2015.2412938
