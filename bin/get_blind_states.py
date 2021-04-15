#!/usr/bin/env python

from smbus2 import SMBus
import sys
import json
from blind_addresses import blind_address_mappings

I2C_NOOP = 200

# Since the only data that can be read is the set and current
# position, we don't have to send a command for the read block
# data. There's no differing address space we need to specify.

states = {}

with SMBus(1) as bus:
    for num, addr in blind_address_mappings.items():
        states[num] = {}
        try:
            data = bus.read_i2c_block_data(addr, I2C_NOOP, 2)
            states[num]['cur'] = int(data[0])
            states[num]['set'] = int(data[1])
        except:
            states[num]['cur'] = 'unreachable'
            states[num]['set'] = 'unreachable'

print json.dumps(states)
