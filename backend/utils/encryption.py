import os
from cryptography.fernet import Fernet
import base64

# A master key for encrypting all files. It should be 32 url-safe base64-encoded bytes.
# In production, this MUST come from an environment variable.
ENCRYPTION_KEY = os.environ.get("FILE_ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # Generate a temporary key for local dev if none exists.
    # Warning: files encrypted with this temporary key cannot be decrypted if the server restarts!
    ENCRYPTION_KEY = Fernet.generate_key().decode('utf-8')
    print("WARNING: Using a temporary ENCRYPTION_KEY. Set FILE_ENCRYPTION_KEY in env for persistence.")

fernet = Fernet(ENCRYPTION_KEY.encode('utf-8'))

def encrypt_data(data: bytes) -> bytes:
    """Encrypts raw bytes and returns encrypted bytes."""
    return fernet.encrypt(data)

def decrypt_data(encrypted_data: bytes) -> bytes:
    """Decrypts encrypted bytes and returns raw bytes."""
    return fernet.decrypt(encrypted_data)
