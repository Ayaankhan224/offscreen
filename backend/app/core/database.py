
import os

from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is missing from your .env file")

client = MongoClient(
    MONGODB_URI,
    serverSelectionTimeoutMS=5000,
    tz_aware=True,
)

db = client["offscreen"]
