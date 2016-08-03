var throng = require('throng');
var express = require('express');
var bodyParser = require('body-parser');
var Particle = require('particle-api-js');
var EventSource = require('eventsource');
var fs = require('fs');

var WORKERS = process.env.WEB_CONCURRENCY || 1;

function destroyStream(device_id) {
  particleStreams[device_id].end();
  delete particleStreams[device_id];
  eventSources[device_id].close();
  delete eventSources[device_id];
  console.log("Released resources for device: ", body.device_id);
}

function start() {
  var app = express();

  app.use(bodyParser.json());

  var particle = new Particle();

  var eventSources = { };
  var particleStreams = { };

  destroyStream = function(device_id) {
    particleStreams[device_id].end();
    delete particleStreams[device_id];
    eventSources[device_id].close();
    delete eventSources[device_id];
    console.log("Released resources for device: ", body.device_id);
  }


  console.log("Environment: ", process.env);

  app.put('/', function(req, res, next) {
    try {
      var body = req.body;
      // Verify request has all fields
      var properties = ['device_id', 'access_token', 'sse_source'];
      for (var index in properties) {
        if (!body.hasOwnProperty(properties[index])) {
          res.status(400).send("Missing property: " + properties[index]);
          return false;
        }
      }

      console.log("Received request from " + body.device_id);

      // Try to get an event stream for the device, using provided device_id and access_token
      var devicesPr = particle.getEventStream({ deviceId : body.device_id, auth: body.access_token });
      devicesPr.then(
        // On successful stream
        function(stream) {
          // save stream
          particleStreams[body.device_id] = stream;
          stream.on('event', function(data) {
            // if device went offline, end streams, delete event source, delete references
            if (data.data === 'offline') {
              try {
                destroyStream(body.device_id);
              } catch (error) {
                console.error(error);
              }
            }
          });

          // Now that we have a Particle.io event stream for the device,
          // go ahead and grab the requested event stream
          if (!eventSources.hasOwnProperty(body.device_id)) {
            eventSources[body.device_id] = new EventSource(body.sse_source);
          }

          var es = eventSources[body.device_id];

          es.onerror = function(error) {
            var payload = error;
            console.log(error);
            var privacy = body.isPrivate || false;
            var publishEventPr = particle.publishEvent({ name: "sse_proxy", data: error, auth: body.access_token, isPrivate: privacy });
            publishEventPr.then(destroy(body.device_id));
          }

          es.onopen = function(error) {
            var publishEventPr = particle.publishEvent({ name: "sse_proxy", data: "open", auth: body.access_token, isPrivate: privacy });
          }

          es.onmessage = function(message) {
            var publishEventPr = particle.publishEvent({ name: message.event, data: message.data, auth: body.access_token, isPrivate: privacy });
          }
        },
        // On unsuccessful stream
        function(error) {
          // Couldn't validate device_id and access_token
          // console.log(error);
          delete particleStreams[body.device_id];
          res.status(error.statusCode);
          res.send(error.body.error);
        }
      );
    } catch(error) {
      res.status(500).send("Oops! An unhandled particle-sse-proxy exception occurred: " + error);
    }
  });


  var server = app.listen(process.env.PORT || 9000, function() {
    console.log('Listening on port %d', server.address().port);
  });
}

throng({
  workers: WORKERS,
  grace: 4000,
  lifetime: Infinity,
  start: start
});
