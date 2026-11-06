"""Aktualny zestaw testów e2e (v1.3). python3 tests/test_e2e.py [URL] [tag]"""
import runpy,os
runpy.run_path(os.path.join(os.path.dirname(__file__),'test_v15.py'),run_name='__main__')
