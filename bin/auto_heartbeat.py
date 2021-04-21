#!/usr/bin/env python

from smbus2 import SMBus
import sys
import os
import json
import time
import datetime
from blind_addresses import blind_address_mappings
from auto_sensors import auto_sensors
from auto_states import auto_states
import RPi.GPIO as GPIO

AUTO_CMD_INTERVAL = 60 * 5
BLIND_COMMAND_FILE = os.path.join(sys.path[0], 'send_blind_command.py')
auto_states = {int(k):v for k,v in auto_states.items()}
GPIO.setmode(GPIO.BCM)

def light_sensor_low(sensor):
    pin = auto_sensors[sensor]['GPIO']
    GPIO.setup(pin, GPIO.IN)
    print "Sensor {} value: {}".format(sensor, GPIO.input(pin))
    return GPIO.input(pin)

# For the log
print "\n-----  " + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S") + "  ----"

# For each sensors in the list
#   If auto mode is enabled
#       If enough time has passed for a new command
#           If light sensor is high
#               Send UP to each blind in set
#           If light sensors is low
#               Send DOWN to each blind in set
for sensor in auto_sensors:
    if auto_states[sensor]["isEnabled"]:
        current_time = int(time.time())
        last_command_at = int(auto_states[sensor]["lastCommandAt"])
        if current_time - last_command_at > AUTO_CMD_INTERVAL:
            cmd = 100
            if light_sensor_low(sensor):
                cmd = 0
            blindNums = ','.join(map(str, auto_sensors[sensor]['blindNums']))
            cmd = '{} {} {} {}'.format(BLIND_COMMAND_FILE, blindNums, cmd, sensor)
            print "Enough time has passed. Sending auto command: " + cmd
            output = os.system(cmd)
            auto_states[sensor]['lastCommandAt'] = current_time
        else:
            print "Not enough time has passed since last auto command"

