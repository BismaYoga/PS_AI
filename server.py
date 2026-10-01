#!/usr/bin/env python3
import os
import sys

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_dir)
os.chdir(backend_dir)
os.execv(sys.executable, [sys.executable, os.path.join(backend_dir, 'server.py')])
