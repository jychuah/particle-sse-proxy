#!/bin/bash

# A test script for trying out your firebase proxy

# Your reverse proxy host URL. If you launch it locally, it will be http://localhost:9000
HOST='http://localhost:9000'
# The Particle.io device ID that will receive events
DEVICE_ID='YOUR_DEVICE_ID'
# The Particle.io access token for this device
ACCESS_TOKEN='YOUR_PARTICLE_ACCESS_TOKEN'
# The URL of the Event Source
EVENT_SOURCE='http://localhost:8080/sse'
EVENTS='["server-time"]'

curl $HOST -H "Content-Type: application/json" -X POST -d @- <<EOF
{ "device_id" : "$DEVICE_ID", "access_token" : "$ACCESS_TOKEN", "event_source" : "$EVENT_SOURCE", "events" : $EVENTS }
EOF
