# Pattern-based OT

This is a server and client for the Pattern-based Operational Transform
protocol as described in this paper.

I made this to learn about the paper and I consider it a toy - not a library
ready for production use. Documents aren't persistently stored (all clients
start out with an empty document), we don't deal with connection errors, and
there are a host of other issues that I haven't found. I don't recommend using
any of this as production/example code :)

# Coming soon
- Make building/testing easier
- Send better 'room' updates to make sure all clients are aware of each other
- Purge from the list where we can so we don't indefinitely build up O(n^2) ops per client
- Implement string operation class instead of text character operation class
- Get rid of socket.io dependency and ensure strict ordering of messages
