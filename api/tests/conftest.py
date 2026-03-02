import os
import sys

# Inject project root into sys.path to ensure 'from api.*' works
# during testing, no matter the execution directory.
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if project_root not in sys.path:
    sys.path.insert(0, project_root)
