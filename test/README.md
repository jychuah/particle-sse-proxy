# particle-sse-proxy

## Test Files

### `sse-server.js`

`sse-server.js` is a test Server Sent Event source, pulled from the [`eventsource` npm package](https://www.npmjs.com/package/eventsource). You can start it with `node sse-server.js`. The Event Source url will be `http://localhost:8080/sse`. It publishes `server-time` events.

### `test.sh`

`test.sh` is a shell script for testing your instance of `particle-sse-proxy`, using `curl`. Fill in the variables and run the script. Your events should be published to your Particle.io event stream, viewable on the [Particle.io Console](https://console.particle.io).