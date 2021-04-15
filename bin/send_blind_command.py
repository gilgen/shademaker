#!/usr/bin/env python

from smbus2 import SMBus
import sys
from blind_addresses import blind_address_mappings

# This command is intended to be executed as:
# /usr/bin/python send_cmd.py <blind number list> <command>
# Example: Move the blinds 1,4,6, and 7 to 50% down
# /usr/bin/python send_cmd.py 1,4,6,7 50

command = int(sys.argv[2])
blinds = list(map(int, sys.argv[1].split(',')))

with SMBus(1) as bus:
    for i in blinds:
        try:
            bus.write_byte(blind_address_mappings[i], command)
            print('Sent {} to blind {}'.format(command, i))
        except:
            print('Blind {} unreachable'.format(i))
            continue
