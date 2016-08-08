# particle-sse-proxy

A NodeJS reverse-proxy for Server Sent Event Sources -> Particle.io Events

### Introduction

The Particle.io cloud supports webhooks, but these webhooks can't process an
event stream. This reverse-proxy allows a webhook to use a REST call to subscribe
to an event stream and translate EventSource messages to Particle.io cloud events.

### Usage

Send a REST PUT to the proxy with the following json data:

```
{ 
	"device_id" : "0123456789", 
	"particle_token" : "0123456789abcdef", 
	"event_source" : "http://my.event.source", 
	"events" : [ "event1", "event2" ],
	"headers" : { "Authorization" : "Bearer myToken",
	"isPrivate" : true
}
```

The server will verify your `device_id` and `particle_token` with the Particle.io cloud, then establish an event stream, using any headers that you pass it. (The `headers` field is optional.) Any incoming SSE events will be published as Particle.io events with a name matching the event type, using the Particle.io token you provided. 

Additionally, messages with no type will be published as `onmessage` events. `onopen` and `onerror` events will also be published. Send a REST DELETE to the proxy to end the event stream.

### WebHook Example

[`webhook.json.example`](./webhook.json.example) has been provided to demonstrate how to use a WebHook to make a Particle.io subscription. After adding the WebHook, you can use the following firmware code to subscribe and consume events:

```
Particle.subscribe("event1", event1Handler);
Particle.subscribe("event2", event2Handler);
Particle.publish("sse");
```
### Deploying to Heroku

I tested this reverse proxy on [Heroku](http://heroku.com). To setup Heroku, make sure you have command line `git`, the [Heroku Toolbelt](https://toolbelt.heroku.com/), and a verified account. To deploy this reverse proxy, do the following:

- Clone this repo

	```
	git clone https://github.com/jychuah/particle-sse-proxy
	cd particle-sse-proxy
	```

- Create a Heroku dyno and make a note of the endpoint. (Heroku services always run on port 80, so your `PORT` variable will be ignored.)

	```
	heroku login
	heroku create
	```

- Push it to Heroku

	```
	git push heroku master
	```
	
- Check to see if it's running with

	```
	heroku logs --tail
	```
