#!/usr/bin/python
#
# upload.py
#
# Copyright 2010, Cabo Communications
# Released under GPL License.
#

"""Handles uploads from plupload.
"""

import hashlib
import os

from wsgiref.handlers import CGIHandler

from werkzeug import Request
from werkzeug import Response
from werkzeug import secure_filename
from werkzeug.exceptions import BadRequest
from werkzeug.exceptions import HTTPException

if(os.environ['SERVER_SOFTWARE'] == 'development'):
    os.environ['REMOTE_USER'] = 'defaultuser'
    
USER = os.environ['REMOTE_USER']
ROOT_PATH = os.path.abspath(os.path.dirname(__file__))
UPLOAD_DIR = None

URLENCODED = 'application/x-www-form-urlencoded'

def write_meta_information_to_file(meta_file, md5sum, chunk, chunks):
    """Writes meta info about the upload, i.d., md5sum, chunk number ...

    :param meta_file: file to write to
    :param md5sum: checksum of all uploaded chunks
    :param chunk: chunk number
    :param chunks: total chunk number
    """
    if chunk < (chunks - 1):
        upload_meta_data = "status=uploading&chunk=%s&chunks=%s&md5=%s" % (chunk,chunks,md5sum)
        try:
            meta_file.write(upload_meta_data)
        finally:
            meta_file.close()
    else:
        # last chunk
        path = meta_file.name
        meta_file.close()
        os.remove(path)

def clean_filename(filename):
    i = filename.rindex(".")
    if i != -1:
        filename = filename[0:i] + filename[i:].lower()
    return secure_filename(filename)

def get_or_create_file(chunk, dst):
    if chunk == 0:
        f = file(dst, 'wb')
    else:
        f = file(dst, 'ab')
    return f

def upload_with_checksum(request, dst, md5chunk, md5total, chunk, chunks):
    """Save application/octet-stream request to file.

    :param dst: the destination filepath
    :param chunk: the chunk number
    :param chunks: the total number of chunks
    :param md5chunk: md5sum of chunk
    :param md5total: md5sum of all currently sent chunks
    """
    buf_len = int(request.args['chunk_size'])
    buf = request.stream.read(buf_len)

    md5 = hashlib.md5()
    md5.update(buf)
    if md5.hexdigest() != md5chunk:
        raise BadRequest("Checksum error")

    f = get_or_create_file(chunk, dst)

    f.write(buf)
    f.close()
    
    f_meta = file(dst + '.meta', 'w') 
    write_meta_information_to_file(f_meta, md5total, chunk, chunks)

def upload_simple(request, dst, chunk=0):
    f = get_or_create_file(chunk, dst)

    file = request.files['file']
    for b in file:
        f.write(b)
    f.close()
    
def upload(request):
    """Handle uploads from the different runtimes.
    
    HTTP query args:
    :param name: the filename 
    :param chunk: the chunk number
    :param chunks: the total number of chunks
    :param md5chunk: md5sum of chunk (optional)
    :param md5total: md5sum of all currently sent chunks (optional)
    """
    if request.method != "POST":
        return probe(request)

    filename = clean_filename(request.args['name'])
    dst = os.path.join(UPLOAD_DIR,filename)

    md5chunk = request.args.get('md5chunk', False)
    md5total = request.args.get('md5total', False)

    chunk = int(request.args.get('chunk', 0))
    chunks = int(request.args.get('chunks', 0))

    if md5chunk and md5total:
        upload_with_checksum(request, dst, md5chunk, md5total, chunk, chunks)
    else:
        upload_simple(request, dst, chunk)

    return Response('uploaded')

def probe(request):
    filename = clean_filename(request.args['name'])

    dst = os.path.join(UPLOAD_DIR, filename)
    if(os.path.exists(dst)):
        f_meta_dst = dst + '.meta'
        if(os.path.exists(f_meta_dst)):
            f_meta = file(f_meta_dst, 'r')
            try:
                data = f_meta.read()
                return Response(data, content_type=URLENCODED)
            finally:
                f_meta.close()
        else:
            # meta file deleted
            return Response("status=finished", content_type=URLENCODED)
    else:
        return Response("status=unknown", content_type=URLENCODED)
    
@Request.application
def app(request):
    try:
        return upload(request)
    except HTTPException, e:
        return e

if __name__ == '__main__':
    # in cgi environment
    UPLOAD_DIR = os.path.join(ROOT_PATH, 'uploads')
    import cgitb; cgitb.enable()
    CGIHandler().run(app)
else:
    # for dev.
    ROOT_PATH = os.environ['ROOT_PATH']
    UPLOAD_DIR = os.path.join(ROOT_PATH, 'uploads')
    if not os.path.exists(UPLOAD_DIR):
        os.mkdir(UPLOAD_DIR)
