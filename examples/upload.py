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
BUF_LEN = 16 * 1024    

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

def write_to_file(file, stream):
    """Write bytes to file

    Args:
       stream: 
       file: file to write bytes to

    Returns:
       md5 hexdigest of the bytes written. 
    """
    md5 = hashlib.md5()
    while 1:
        buf = stream.read(BUF_LEN)
        if not buf:
            break
        file.write(buf)
        md5.update(buf)
    return md5.hexdigest()

def upload_form(request):
    html = file(os.path.join(root_path, 'uploadform.html')).read()
    return Response(html, mimetype='text/html')

@expose('^/$')
def upload(request):
    if request.method != "POST":
        return upload_form(request)
        
    filename = request.args['name']
    md5client = request.args['md5']
    chunk = request.args['chunk']
    
    dst = os.path.join(upload_dir,filename)
    if chunk == 0:
        f = file(dst, 'wb')
    else:
        f = file(dst, 'ab')

    md5server = write_to_file(f, request.stream)
    f.close()
    if md5client != md5server:
        raise BadRequest("Checksum error")
    return Response('uploaded')

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
            '/steamengine/static':  root_path + '/../static',
            '/applet': '/home/dam/workspace/example/bin'
    })
