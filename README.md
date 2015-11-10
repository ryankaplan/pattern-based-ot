# Pattern-based Operational Transformation

This is a server and client for a real-time collaborative document editor.
The implementation is based on the Pattern-based Operational Transform
algorithm as described in this paper.

This is a toy and is not fully functional yet (e.g. documents aren't persistently
stored and all clients start out with an empty document). I don't recommend using
any of this as production/example code :)

# Coming soon
- Make building/testing easier
- Send better 'room' updates to make sure all clients are aware of each other
- Purge from the list where we can so we don't indefinitely build up O(n^2) ops per client