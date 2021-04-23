#!/usr/bin/env python

from smbus2 import SMBus
import sys
import time
import json
from blind_addresses import blind_address_mappings
from auto_states import auto_states
from auto_states import AUTO_STATES_FILE
from auto_sensors import auto_sensors

# This command is intended to be executed as:
# /usr/bin/python send_cmd.py <blind number list> <command>
# Example: Move the blinds 1,4,6, and 7 to 50% down
# /usr/bin/python send_cmd.py 1,4,6,7 50


command = int(sys.argv[2])
blinds = list(map(int, sys.argv[1].split(',')))
blind_to_sensor = {}

# Find the auto sensor number for the blind being acted on
# so we can update the lastCommandAt
for blind_num in blinds:
    for sensor, sensor_data in auto_sensors.items():
        # print "Looking at sensor {}, {}".format(sensor, sensor_data)
        if blind_num in sensor_data['blindNums']:
            # print "Found blind num {} in sensor {}".format(blind_num, sensor)
            blind_to_sensor[blind_num] = str(sensor)
            auto_sensor_num = str(sensor)
            break

print blind_to_sensor

with SMBus(1) as bus:
    for blind in blinds:
        try:
            auto_states[blind_to_sensor[blind]]['lastCommandAt'] = int(time.time())
            bus.write_byte(blind_address_mappings[blind], command)
            print('Sent {} to blind {}'.format(command, blind))
        except IOError:
            print('Blind {} unreachable'.format(blind))

# If an auto sensor number was passed in, we have to write the
# updated auto states file with the new last command at values
with open(AUTO_STATES_FILE, 'w') as outfile:
    json.dump(auto_states, outfile)
