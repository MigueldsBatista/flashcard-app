import logging

from dotenv import load_dotenv

loaded = load_dotenv()

print(f"Environment variables loaded: {loaded}")

logging.basicConfig(level=logging.INFO)

import os
import sys

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from api.app import create_app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=3000)