from smbus import SMBus
import sys
import json
from blind_addresses import blind_address_mappings

# This can be anything not in the command space. For some reason the
# arduino has fires its receive command handler when requesting a
# block of data. Anything not in the command space will be ignored
state_register_address = 200;

bus = SMBus(1)
states = {}

for num, addr in blind_address_mappings.items():
    states[num] = {}
    try:
        data = bus.read_i2c_block_data(addr, state_register_address, 2)
        states[num]['cur'] = int(data[0])
        states[num]['set'] = int(data[1])
    except:
        states[num]['cur'] = 'unreachable'
        states[num]['set'] = 'unreachable'

print json.dumps(states)
