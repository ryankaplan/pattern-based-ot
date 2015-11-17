# Pattern-based OT

This is a server and client for the Pattern-based Operational Transform
protocol as described in [this paper](http://www.computer.org/csdl/trans/td/preprint/07060680-abs.html)
by Yi Xu and Chengzheng Sun [^1].

I'm building this project for fun with the goal of better understanding the
paper. It's not a library intended for public use, but I'm making it public
in case others find it interesting or the code useful.

There aren't any known bugs in the OT control or operation algorithms, but
it's not built to be a production-safe library. I strongly recommend
against using it for anything serious.

Here's a gif of it in action:

![Gif of two documents](https://github.com/ryankaplan/pattern-based-ot/blob/master/src/static/images/demo.gif?raw=true)

# Development Setup

To get started:

- Install npm by downloading and installing node.js from here: https://nodejs.org/en/
- Open the repo folder and run `npm install`
- In one terminal window run `jake watch`
- In another terminal window run `nodemon build/server/server.js`
- Visit `http://localhost:3000/` in a browser to see the collaborative-text demo

To run tests, run `jake test` from the project root.

# Things I plan to next...

- Implement string operation class so that we don't generate a thousand operations
  when you paste a thousand character strings.
- Implement a tree OT type of some form.
- Make socket.io less of a dependency because it doesn't guarantee strict message
  ordering on all browsers.

# Citations

[1] Yi Xu, Chengzheng Sun, "Conditions and Patterns for Achieving Convergence in OT-based Co-Editors", IEEE
Transactions on Parallel & Distributed Systems, , no. 1, pp. 1, PrePrints PrePrints, doi:10.1109/TPDS.2015.2412938