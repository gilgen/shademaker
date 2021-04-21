import os
import sys
import json

AUTO_STATES_FILE = os.path.join(sys.path[0], '.auto-states')

with open(AUTO_STATES_FILE) as f:
  auto_states = json.load(f)

