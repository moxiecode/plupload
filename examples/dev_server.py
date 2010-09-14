#!/usr/bin/python
import os
os.environ['SERVER_SOFTWARE'] = 'development'

from werkzeug import run_simple
from upload import app

run_simple('localhost', 5000, app, use_debugger=False,use_reloader=True,threaded=False, processes=1)
