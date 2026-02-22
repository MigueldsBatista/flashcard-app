import logging

from dotenv import load_dotenv

loaded = load_dotenv()

print(f"Environment variables loaded: {loaded}")

logging.basicConfig(level=logging.INFO)

try:
    from api.app import create_app
except ImportError:
    from app import create_app

app = create_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=3000)