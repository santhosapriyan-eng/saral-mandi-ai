from elevenlabs.client import ElevenLabs
from elevenlabs import save
import os
import uuid
from config import ELEVEN_API_KEY

client = ElevenLabs(api_key=ELEVEN_API_KEY)

def generate_voice(text):
    """Generate voice from text and return file path"""
    try:
        audio = client.text_to_speech.convert(
            voice_id="21m00Tcm4TlvDq8ikWAM",  # Default voice (Rachel)
            model_id="eleven_multilingual_v2",
            text=text
        )
        
        # Generate unique filename
        filename = f"advisory_{uuid.uuid4().hex}.mp3"
        filepath = os.path.join("static", filename)
        
        # Ensure static directory exists
        os.makedirs("static", exist_ok=True)
        
        # Save audio
        save(audio, filepath)
        
        return filepath
    except Exception as e:
        print(f"Voice generation error: {e}")
        raise