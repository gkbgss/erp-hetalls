import os
import uuid
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
import io
import mimetypes

# Define scopes for Google Drive API
SCOPES = ['https://www.googleapis.com/auth/drive.file']

CREDENTIALS_FILE = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")

LOCAL_UPLOAD_DIR = os.path.join(os.path.abspath(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

def get_drive_service():
    if not os.path.exists(CREDENTIALS_FILE):
        return None
    try:
        creds = service_account.Credentials.from_service_account_file(
            CREDENTIALS_FILE, scopes=SCOPES)
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        print(f"Failed to initialize Google Drive service: {e}")
        return None

def upload_to_drive(file_data: bytes, filename: str) -> str:
    """Uploads file bytes to free unlimited cloud CDNs (Catbox / 0x0) or Google Drive, returning direct public URL or ID."""
    # Tier 1: Try Catbox.moe Unlimited Free Cloud CDN (up to 200MB per file, unlimited permanent storage)
    try:
        import requests
        mime_type, _ = mimetypes.guess_type(filename)
        if not mime_type:
            mime_type = 'application/octet-stream'
        files = {'fileToUpload': (filename, file_data, mime_type)}
        data = {'reqtype': 'fileupload'}
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        res = requests.post('https://catbox.moe/user/api.php', data=data, files=files, headers=headers, timeout=45)
        if res.status_code == 200 and res.text.startswith('http'):
            print(f"Successfully uploaded to Catbox Cloud CDN: {res.text.strip()}")
            return res.text.strip()
    except Exception as e:
        print(f"Catbox cloud upload failed, trying backup CDN: {e}")

    # Tier 2: Try 0x0.st Unlimited Free Cloud CDN (up to 512MB per file)
    try:
        import requests
        files = {'file': (filename, file_data)}
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        res = requests.post('https://0x0.st', files=files, headers=headers, timeout=45)
        if res.status_code == 200 and res.text.startswith('http'):
            print(f"Successfully uploaded to 0x0.st Cloud CDN: {res.text.strip()}")
            return res.text.strip()
    except Exception as e:
        print(f"0x0.st cloud upload failed, trying Google Drive: {e}")

    # Tier 3: Try Google Drive API
    service = get_drive_service()
    if service:
        try:
            file_metadata = {'name': filename}
            if FOLDER_ID:
                file_metadata['parents'] = [FOLDER_ID]
                
            media = MediaIoBaseUpload(io.BytesIO(file_data), mimetype='application/octet-stream', resumable=True)
            file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
            return file.get('id')
        except Exception as e:
            print(f"Drive upload failed, falling back to local disk: {e}")

    # Tier 4: Local disk fallback
    file_id = f"local_{uuid.uuid4().hex}"
    file_path = os.path.join(LOCAL_UPLOAD_DIR, f"{file_id}.dat")
    meta_path = os.path.join(LOCAL_UPLOAD_DIR, f"{file_id}.meta")
    
    with open(file_path, "wb") as f:
        f.write(file_data)
        
    mime_type, _ = mimetypes.guess_type(filename)
    if not mime_type:
        mime_type = "application/octet-stream"
        
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump({"name": filename, "mimeType": mime_type, "id": file_id}, f)
        
    return file_id

def download_from_drive(file_id: str) -> bytes:
    """Downloads a file from Google Drive by its file ID and returns the bytes. Checks local disk if local or Drive unavailable."""
    if str(file_id).startswith("local_"):
        file_path = os.path.join(LOCAL_UPLOAD_DIR, f"{file_id}.dat")
        if os.path.exists(file_path):
            with open(file_path, "rb") as f:
                return f.read()
        raise Exception("Local file not found.")

    service = get_drive_service()
    if service:
        try:
            request = service.files().get_media(fileId=file_id)
            fh = io.BytesIO()
            downloader = MediaIoBaseDownload(fh, request)
            done = False
            while done is False:
                status, done = downloader.next_chunk()
            return fh.getvalue()
        except Exception as e:
            print(f"Drive download failed: {e}")
            
    # Check local disk as last resort
    file_path = os.path.join(LOCAL_UPLOAD_DIR, f"{file_id}.dat")
    if os.path.exists(file_path):
        with open(file_path, "rb") as f:
            return f.read()
            
    raise Exception("File not found on Drive or local storage.")

def get_file_metadata(file_id: str) -> dict:
    if str(file_id).startswith("local_"):
        meta_path = os.path.join(LOCAL_UPLOAD_DIR, f"{file_id}.meta")
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return {"name": "downloaded_file", "mimeType": "application/octet-stream", "id": file_id}

    service = get_drive_service()
    if service:
        try:
            return service.files().get(fileId=file_id, fields='name, mimeType').execute()
        except Exception as e:
            print(f"Drive metadata fetch failed: {e}")
            
    meta_path = os.path.join(LOCAL_UPLOAD_DIR, f"{file_id}.meta")
    if os.path.exists(meta_path):
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
            
    return {"name": "downloaded_file", "mimeType": "application/octet-stream", "id": file_id}

