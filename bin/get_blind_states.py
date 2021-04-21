#!/usr/bin/env python

from smbus2 import SMBus
import sys
import os
import json
from blind_addresses import blind_address_mappings

I2C_NOOP = 200

# Since the only data that can be read is the set and current
# position, we don't have to send a command for the read block
# data. There's no differing address space we need to specify.

states = { "blindStates" : {}, "autoStates" : {} }

with SMBus(1) as bus:
    for num, addr in blind_address_mappings.items():
        states["blindStates"][num] = {}
        try:
            data = bus.read_i2c_block_data(addr, I2C_NOOP, 2)
            states["blindStates"][num]['cur'] = int(data[0])
            states["blindStates"][num]['set'] = int(data[1])
        except:
            states["blindStates"][num]['cur'] = 'unreachable'
            states["blindStates"][num]['set'] = 'unreachable'

with open(os.path.join(sys.path[0], '.auto-states')) as f:
  states["autoStates"] = json.load(f)

print json.dumps(states)

