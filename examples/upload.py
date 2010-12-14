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
import re

from wsgiref.handlers import CGIHandler

from werkzeug import Request
from werkzeug import Response
from werkzeug import secure_filename
from werkzeug.exceptions import BadRequest
from werkzeug.exceptions import HTTPException
from werkzeug.exceptions import NotFound

if(os.environ['SERVER_SOFTWARE'] == 'development'):
    os.environ['REMOTE_USER'] = 'defaultuser'
    
USER = os.environ['REMOTE_USER']
ROOT_PATH = os.path.abspath(os.path.dirname(__file__))
UPLOAD_DIR = None

class Routes(object):
    
    def __init__(self):
        self.routes = []

    def add(self, regexp, handler):
        self.routes.append({'regexp': regexp,
                            'handler': handler})
        
    def dispatch(self, request):
        for r in self.routes:
            m = re.match(r['regexp'], request.path) 
            if m:
                args = m.groupdict()
                if args:
                    return r['handler'](request, **args)
                else:
                    return r['handler'](request)
        else:
            raise NotFound()

def expose(url_reg_exp):
    # remember: decorate(regexp)(function)
    def decorate(handler):
        routes.add(url_reg_exp, handler)
        return handler
    return decorate

routes = Routes()

def write_meta_information_to_file(meta_file, md5sum, chunk, chunks):
    """Writes meta info about the upload, i.d., md5sum, chunk number ...

    Args:
       meta_file: file to write to
       md5sum: checksum of all uploaded chunks
       chunk: chunk number
       chunks: total chunk number
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

@expose('^/$')
def upload(request):
    if request.method != "POST":
        return probe(request)
    filename = clean_filename(request.args['name'])
    md5chunk = request.args['md5chunk']
    md5total = request.args['md5total']
    chunk = int(request.args['chunk'])
    buf_len = int(request.args['chunk_size'])
    chunks = int(request.args['chunks'])

    buf = request.stream.read(buf_len)
    md5 = hashlib.md5()
    md5.update(buf)
    if md5.hexdigest() != md5chunk:
        print "Checksum error"
        raise BadRequest("Checksum error")

    dst = os.path.join(UPLOAD_DIR,filename)
    f = get_or_create_file(chunk, dst)

    f.write(buf)
    f.close()
    
    f_meta = file(dst + '.meta', 'w') 
    write_meta_information_to_file(f_meta, md5total, chunk, chunks)

    print md5total
    return Response('uploaded')

@expose('^/simple/$')
def simple_upload(request):
    if request.method != "POST":
        return probe(request)
    file = request.files['file']
    filename = clean_filename(request.args.get('name', file.filename))
    # file.save(os.path.join(UPLOAD_DIR,filename))
    # file.close()
    return Response('Uploaded %s' % filename)

def probe(request):
    filename = clean_filename(request.args['name'])

    dst = os.path.join(UPLOAD_DIR, filename)
    if(os.path.exists(dst)):
        f_meta_dst = dst + '.meta'
        if(os.path.exists(f_meta_dst)):
            f_meta = file(f_meta_dst, 'r')
            try:
                data = f_meta.read()
                return Response(data, content_type="application/x-www-form-urlencoded")
            finally:
                f_meta.close()
        else:
            # meta file deleted
            return Response("status=finished", content_type="application/x-www-form-urlencoded")
    else:
        return Response("status=unknown", content_type="application/x-www-form-urlencoded")
    
@Request.application
def app(request):
    try:
        return routes.dispatch(request)
    except HTTPException, e:
        print e
        return e

if __name__ == '__main__':
    os.path.join(ROOT_PATH,'uploads',USER)
    UPLOAD_DIR = os.path.join('/mnt/home/images',USER)
    import cgitb; cgitb.enable()
    CGIHandler().run(app)
else:
    ROOT_PATH = os.environ['ROOT_PATH']
    UPLOAD_DIR = os.path.join(ROOT_PATH, 'uploads')
    if not os.path.exists(UPLOAD_DIR):
        os.mkdir(UPLOAD_DIR)
    from werkzeug import SharedDataMiddleware
    app = SharedDataMiddleware(app, {
            '/js_dev':  os.path.join(ROOT_PATH, 'src/javascript'),
            '/js':  os.path.join(ROOT_PATH, 'js'),
            '/applet': os.path.join(ROOT_PATH, 'bin'),
            '/': os.path.join(ROOT_PATH, 'examples')
    })
