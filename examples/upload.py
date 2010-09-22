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
from werkzeug.exceptions import BadRequest
from werkzeug.exceptions import HTTPException
from werkzeug.exceptions import NotFound

if(os.environ['SERVER_SOFTWARE'] == 'development'):
    os.environ['REMOTE_USER'] = 'defaultuser'
    
user = os.environ['REMOTE_USER']
root_path = os.path.abspath(os.path.dirname(__file__))
upload_dir = None
buf_len = 16 * 1024    

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
    status = "uploading" if chunk < (chunks - 1) else "finished"
    upload_meta_data = "status=%s&chunk=%s&chunks=%s&md5=%s" % (status, chunk,chunks,md5sum)
    try:
        meta_file.write(upload_meta_data)
    finally:
        meta_file.close()
    
def write_to_file(file, stream):
    """Write bytes to file

    Args:
       stream: 
       file: file to write bytes to
       meta_file: file to write meta information to

    Returns:
       md5 hexdigest of the bytes written. 
    """
    md5 = hashlib.md5()
    buf = stream.read(buf_len)
    file.write(buf)
    md5.update(buf)
    file.close()
    return md5.hexdigest()

@expose('^/$')
def upload_form(request):
    html = file(os.path.join(root_path, 'queue_applet.html')).read()
    return Response(html, mimetype='text/html')

@expose('^/upload/$')
def upload(request):
    if request.method != "POST":
        return probe(request)
        
    filename = request.args['name']
    md5chunk = request.args['md5chunk']
    md5total = request.args['md5total']
    chunk = int(request.args['chunk'])
    global buf_len
    buf_len = int(request.args['chunk_size'])
    chunks = int(request.args['chunks'])
    
    dst = os.path.join(upload_dir,filename)
    if chunk == 0:
        f = file(dst, 'wb')
    else:
        f = file(dst, 'ab')

    md5server = write_to_file(f, request.stream)

    f_meta = file(dst + '.meta', 'w') 
    write_meta_information_to_file(f_meta, md5total, chunk, chunks)

    if md5chunk != md5server:
        print "Checksum error"
        raise BadRequest("Checksum error")
    return Response('uploaded')

def probe(request):
    filename = request.args['name']

    dst = os.path.join(upload_dir, filename)
    if(os.path.exists(dst)):
        f_meta = file(dst + '.meta', 'r')
        try:
            data = f_meta.read()
            return Response(data, content_type="application/x-www-form-urlencoded")
        finally:
            f_meta.close()
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
    os.path.join(root_path,'uploads',user)
    upload_dir = os.path.join('/mnt/home/images',user)
    import cgitb; cgitb.enable()
    CGIHandler().run(app)
else:
    # for testing purpose purpose only
    upload_dir = os.path.join(root_path, 'uploads')
    if not os.path.exists(upload_dir):
        os.mkdir(upload_dir)
    from werkzeug import SharedDataMiddleware
    app = SharedDataMiddleware(app, {
            '/javascript':  os.path.join(root_path, '../src/javascript'),
            '/applet': os.path.join(root_path, '../bin'),
            '/': root_path,
    })
