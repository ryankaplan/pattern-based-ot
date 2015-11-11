# Pattern-based OT

This is a server and client for the Pattern-based Operational Transform
protocol as described in this paper.

I made this to learn about the paper and I consider it a toy - not a library
ready for production use. Documents aren't persistently stored (all clients
start out with an empty document), we don't deal with connection errors, and
there are a host of other issues that I haven't found. I don't recommend using
any of this as production/example code :)

# Upcoming changes

- Make testing better: add it to the build process and use a real testing framework.
- Send better 'room' updates to make sure all clients are aware of each other.
- Purge from the transformation map where we can so we don't indefinitely build up O(n^2) ops per client.
- Implement string operation class instead of text character operation class.
- Get rid of socket.io dependency and ensure strict ordering of messages.
- Implement a tree OT type of some form. Maybe for rich text editing.

# Development Setup

To run tests, run `jake test` from the project root. To run the collaborative text
editor demo, do the following:

- Install npm by downloading and installing node.js from here: https://nodejs.org/en/
- In one terminal window run `jake watch`
- In another terminal run `nodemon build/server/server.js`
- Visit `http://localhost:3000/` in a browser to see the collaborative-text demo
