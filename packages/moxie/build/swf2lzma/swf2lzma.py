#!/usr/bin/python

import os
import pylzma
import sys
import struct
import zlib

def check(test, msg):
    test or exit(msg)

def convert(infile, outfile):
    fi = open(infile, "rb")
    swf_size = os.path.getsize(infile)
    swf_data = fi.read()
    fi.close()

    check((swf_data[1] == 'W') and (swf_data[2] == 'S'), "not a SWF file")
    check((ord(swf_data[3]) >= 13), "only SWF version 13 or higher is supported")
    check((swf_data[0] != 'Z'), "already LZMA compressed")

    dfilesize = struct.unpack("<I", swf_data[4:8])[0] - 8
    
    if swf_data[0] == 'C':
        # compressed SWF
        ddata = zlib.decompress(swf_data[8:])
    else:
        # uncompressed SWF
        check((swf_data[0] == 'F'), "not a SWF file")
        ddata = swf_data[8:]

    check((dfilesize == len(ddata)), 'decompression failure')

    zdata = pylzma.compress(ddata, eos=1)
    # 5 accounts for lzma props
    zsize = len(zdata) - 5

    zheader = list(struct.unpack("<12B", swf_data[0:12]))
    zheader[0] = ord('Z')
    zheader[8]  = (zsize)       & 0xFF
    zheader[9]  = (zsize >> 8)  & 0xFF
    zheader[10] = (zsize >> 16) & 0xFF
    zheader[11] = (zsize >> 24) & 0xFF

    fo = open(outfile, 'wb')
    fo.write(struct.pack("<12B", *zheader))
    fo.write(zdata)
    fo.close()

    print 'compression: %d%%' % round(100 - (100.0 * zsize / swf_size))


# Format of SWF when LZMA is used:
# 
# | 4 bytes       | 4 bytes    | 4 bytes       | 5 bytes    | n bytes    | 6 bytes         |
# | 'ZWS'+version | scriptLen  | compressedLen | LZMA props | LZMA data  | LZMA end marker |
# 
# scriptLen is the uncompressed length of the SWF data. Includes 4 bytes SWF header and
# 4 bytes for scriptLen it
# 
# compressedLen does not include header (4+4+4 bytes) or lzma props (5 bytes)
# compressedLen does include LZMA end marker (6 bytes)
if __name__ == "__main__":
    check((len(sys.argv) == 3), 'usage: swf2lzma input-swf output-swf')
    
    infile = sys.argv[1]
    check((infile[-4:].lower() == '.swf'), 'input file must be of type .swf')
    
    outfile = sys.argv[2]
    check((infile[-4:].lower() == '.swf'), 'output file must be of type .swf')

    convert(infile, outfile)

    sys.exit(0)

