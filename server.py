#!/usr/bin/env python3
import os
import sys
import shutil

base_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(base_dir, 'backend')
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Sinkronkan folder statis (logos & data) ke frontend/dist jika baru di-clone dari GitHub
pub_dir = os.path.join(base_dir, 'frontend', 'public')
dist_dir = os.path.join(base_dir, 'frontend', 'dist')
if os.path.exists(pub_dir) and os.path.exists(dist_dir):
    for folder_name in ('logos', 'data'):
        src = os.path.join(pub_dir, folder_name)
        dst = os.path.join(dist_dir, folder_name)
        if os.path.exists(src) and not os.path.exists(dst):
            try:
                shutil.copytree(src, dst)
            except Exception:
                pass

os.chdir(backend_dir)

from server import main

if __name__ == '__main__':
    main()
