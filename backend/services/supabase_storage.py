import os
from supabase import create_client
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(BASE_DIR, ".env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
BUCKET_NAME = "streetpaw-media"

_client = None

def get_supabase_client():
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client

def upload_file_to_supabase(file_bytes: bytes, destination_path: str, content_type: str = "image/jpeg") -> str:
    """
    Uploads raw file bytes to Supabase Storage and returns the public URL.
    Falls back gracefully if Supabase is unreachable.
    """
    try:
        supabase = get_supabase_client()
        # Upload using upsert
        supabase.storage.from_(BUCKET_NAME).upload(
            destination_path,
            file_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(destination_path)
        # Strip trailing ? if present
        if public_url.endswith("?"):
            public_url = public_url[:-1]
        return public_url
    except Exception as e:
        print(f"[Supabase Storage] Upload error: {e}")
        return ""
