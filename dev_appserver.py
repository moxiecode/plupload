#!/usr/bin/python
import os
import sys
sys.path.append('examples')

os.environ['SERVER_SOFTWARE'] = 'development'
os.environ['ROOT_PATH'] = os.path.abspath(os.path.dirname(__file__))

from werkzeug import run_simple
from upload import app

run_simple('localhost', 5000, app, use_debugger=False,use_reloader=True,threaded=False, processes=1)
