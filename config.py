import os
from dotenv import load_dotenv

load_dotenv()

FEATHER_API_KEY = os.getenv("FEATHER_API_KEY")
ELEVEN_API_KEY = os.getenv("ELEVEN_API_KEY")