"""
Thin wrapper kept at the project root for convenience.
The canonical schema/seed script now lives in migrations/setup_database.py.

Run:
    python setup_database.py
"""
import os
import runpy

runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'migrations', 'setup_database.py'), run_name='__main__')
