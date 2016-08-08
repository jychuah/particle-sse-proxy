var throng = require('throng');
var express = require('express');
var bodyParser = require('body-parser');
var Particle = require('particle-api-js');
var EventSource = require('eventsource');
var fs = require('fs');

var WORKERS = process.env.WEB_CONCURRENCY || 1;

function start() {
  var app = express();

  app.use(bodyParser.json());

  var particle = new Particle();

  var eventSources = { };
  var particleStreams = { };

  function destroyStream(device_id) {
    if (particleStreams[device_id]) {
      particleStreams[device_id].end();
      delete particleStreams[device_id];
    }
    if (eventSources[device_id]) {
      eventSources[device_id].close();
      delete eventSources[device_id];
    }
    console.log("Released resources for device: ", body.device_id);
  }


  console.log("Environment: ", process.env);

  function verifyRequest(req, res, next) {
      var body = req.body;
      // Verify request has all fields
      var properties = ['device_id', 'particle_token', 'event_source'];
      for (var index in properties) {
        if (!body.hasOwnProperty(properties[index])) {
          res.status(400).send("Missing property: " + properties[index]);
          res.end();
          return false;
        }
      }
      next();
  }

  function verifyParticle(req, res, next) {
    var body = req.body;
    var devicesPr = particle.getEventStream({ deviceId: body.device_id, auth: body.particle_token });
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
          next();
        },
        // On unsuccessful stream
        function(error) {
          // Couldn't validate device_id and particle_token
          // console.log(error);
          delete particleStreams[body.device_id];
          res.status(error.statusCode);
          res.send(error.body.error);
          res.end();
        }
    );
  }

  function destroyPrevious(req, res, next) {
      if (eventSources.hasOwnProperty(req.body.device_id)) {
          destroyStream(req.body.device_id);
      }
      next();
  }

  function createStream(req, res, next) {
      var body = req.body;

      var dict = { };
      if (req.body.headers) {
        dict.headers = req.body.headers;
      }

      eventSources[body.device_id] = new EventSource(req.body.event_source, dict);
      var es = eventSources[body.device_id];
      var privacy = body.isPrivate || false;

      console.log("events", body.events);

      es.onerror = function(error) {
        var payload = error;
        console.log(error);
        /*
        var publishEventPr = particle.publishEvent({ name: "sse_proxy", data: error, auth: body.particle_token, isPrivate: privacy });
        publishEventPr.then(destroyStream(body.device_id));
        */
        console.log("onerror", { name: "onerror", data: error, auth: body.particle_token, isPrivate: privacy });
        
      }

      es.onopen = function(error) {
        // var publishEventPr = particle.publishEvent({ name: "sse_proxy", data: "open", auth: body.particle_token, isPrivate: privacy });
        console.log("onopen", { name: "onopen", data: "open", auth: body.particle_token, isPrivate: privacy });
      }

      es.onmessage = function(message) {
        // var publishEventPr = particle.publishEvent({ name: message.event, data: message.data, auth: body.particle_token, isPrivate: privacy });
        console.log("onmessage", { name: "onmessage", data: message.data, auth: body.particle_token, isPrivate: privacy });
      }

      for (var key in body.events) {
        es.addEventListener(body.events[key], function(message) {
          console.log("onmessage", { name: message.type, data: message.data, auth: body.particle_token, isPrivate: privacy });
        });
      }

      res.status(200).send("OK");
      res.end();
  }

  app.use(verifyRequest);
  app.use(verifyParticle);
  app.use(destroyPrevious);


  app.put('/', function(req, res, next) {
      console.log("Received request from " + body.device_id);
      app.use(createStream);
      next();
  });

  function sendOk(req, res, next) {
    res.status(200).send("OK");
    res.end();
  }

  app.delete('/', function(req, res, next) {
    app.use(sendOk);
    next();
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
