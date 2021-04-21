#!/usr/bin/env python

from smbus2 import SMBus
import sys
import time
import os
import json
from blind_addresses import blind_address_mappings

# This command is intended to be executed as:
# /usr/bin/python send_cmd.py <blind number list> <command>
# Example: Move the blinds 1,4,6, and 7 to 50% down
# /usr/bin/python send_cmd.py 1,4,6,7 50

AUTO_STATES_FILE = os.path.join(sys.path[0], '.auto-states')

with open(AUTO_STATES_FILE) as f:
  auto_states = json.load(f)

command = int(sys.argv[2])
blinds = list(map(int, sys.argv[1].split(',')))

# Optionally the auto heartbeat sends in the auto sensor number
# so that the lastCommandAt can be updated
try:
    auto_sensor_num = sys.argv[3]
except IndexError:
    auto_sensor_num = False

with SMBus(1) as bus:
    for i in blinds:
        try:
            bus.write_byte(blind_address_mappings[i], command)
            print('Sent {} to blind {}'.format(command, i))
            if auto_sensor_num:
                auto_states[auto_sensor_num]['lastCommandAt'] = int(time.time())
        except IOError:
            print('Blind {} unreachable'.format(i))
            continue

# If an auto sensor number was passed in, we have to write the
# updated auto states file with the new last command at values
if auto_sensor_num:
    with open(AUTO_STATES_FILE, 'w') as outfile:
        json.dump(auto_states, outfile)
