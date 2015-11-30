# PBOT (Pattern Based OT)

This project is a server and client for the Pattern-based Operational Transform
algorithm as described in [this paper](http://www.computer.org/csdl/trans/td/preprint/07060680-abs.html)
by Yi Xu and Chengzheng Sun [^1]. This is published with permission from Prof. Sun.

I'm building this project for fun -- I want to better understand OT. And
implementing an OT algorithm seemed like a good start. It's not a library
intended for production use but I'm making it public anyway in case others
find it interesting or the code useful.

There aren't any known bugs in the OT code but, again, this is *not* built
to be a production-ready library. For example:

- all state is stored in memory; when the server restarts, all your data goes away
- it doesn't support undo/redo
- doesn't handle client disconnects/reconnects well
- it doesn't have great test coverage (yet)

That said, I plan to keep working on this so it'll get better over time. Maybe at
some point it'll be useful to someone other than me.

There's a demo illustrating how to use the library in
`src/demos/collaborative-text-editor`. Here's a gif of it in action:


![Gif of two documents](https://github.com/ryankaplan/pattern-based-ot/blob/master/src/demos/collaborative-text-editor/static/images/demo.gif?raw=true)

# Development Setup

To get started:

- Install npm by downloading and installing node.js from here: https://nodejs.org/en/
- Open the repo folder and run `npm install`
- In one terminal window run `jake watch`
- In another terminal window run `nodemon build/demos/collaborative-text-editor/server.js`
- Visit `http://localhost:3000/` in a browser to open a document. This will generate a URL with a random key on the end.
- Copy paste the URL from this tab into another tab, and type away!

To run tests, run `jake test` from the project root.

# Things I plan to next...

- Save document state on disk.
- Implement the history buffer/selective replication optimizations from the paper.
- Make socket.io less of a dependency because it doesn't guarantee strict message
  ordering on all browsers (rather, it didn't used to and I haven't verified that it
  does now).
- Some basic form of undo/redo.
- Implement a tree OT type.

# Citations

[1] Yi Xu, Chengzheng Sun, "Conditions and Patterns for Achieving Convergence in OT-based Co-Editors", IEEE
Transactions on Parallel & Distributed Systems, , no. 1, pp. 1, PrePrints PrePrints, doi:10.1109/TPDS.2015.2412938
