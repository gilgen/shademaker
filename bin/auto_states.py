import os
import sys
import json

AUTO_STATES_FILE = os.path.join(sys.path[0], '.auto-states')

# this is a convenience json to dict wrapper around the .auto-states file
with open(AUTO_STATES_FILE) as f:
  auto_states = json.load(f)

