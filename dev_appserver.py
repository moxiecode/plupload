#!/usr/bin/python
import os
import sys

os.environ['SERVER_SOFTWARE'] = 'development'
os.environ['ROOT_PATH'] = os.path.abspath(os.path.dirname(__file__))
sys.path.append(os.path.join(os.environ['ROOT_PATH'], 'examples'))

from werkzeug import run_simple
from upload import app

ROOT_PATH = os.environ['ROOT_PATH']
STATIC_FILES = {
    '/js_dev':  os.path.join(ROOT_PATH, 'src/javascript'),
    '/js':  os.path.join(ROOT_PATH, 'js'),
    '/': os.path.join(ROOT_PATH, 'examples')
    }

run_simple('127.0.0.1', 8080, app, use_debugger=True, use_reloader=True, threaded=False, processes=1, static_files=STATIC_FILES)
