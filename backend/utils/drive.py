import os
import uuid
import json
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
import io
import mimetypes

# Define scopes for Google Drive API
SCOPES = ['https://www.googleapis.com/auth/drive']

CREDENTIALS_FILE = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "credentials.json"))
FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID", "1646kEaAp_Q4Hx0_sBmMlSlOIQLqyW36n")
DEFAULT_CREDENTIALS_B64 = "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAibjhuLWxpbmtlZGluLXNjcmFwZXItNDkyNjE2IiwKICAicHJpdmF0ZV9rZXlfaWQiOiAiOTJlYmZlYzEwY2QyZDM2NjhlYTAzMTAyMjc5Y2EwMGZiNDA3MDAwMCIsCiAgInByaXZhdGVfa2V5IjogIi0tLS0tQkVHSU4gUFJJVkFURSBLRVktLS0tLVxuTUlJRXZRSUJBREFOQmdrcWhraUc5dzBCQVFFRkFBU0NCS2N3Z2dTakFnRUFBb0lCQVFDMkxweERVcmQwYjlBVlxuN2M5bkZCczNQVkhwVFB4RDZPeUp0TnBhcjVWMWpUOVZtbnJlVHM1YnovWVJCWHMvTHZZcHo0OXVSblo4US9vK1xuUE1GN25YRE5ybS9DTER5YUZTVE8xY01rZGJ2YW5vZjhJbS9KWlhWbzR2SlJvc2JxNWdEWGQvVEY2Ums5WHk1TVxuL2l2V213NmdUMzhHV0Z6VmdJM3YvaU8yR0xncEswZlVwaVpaUG9lZTkyNGw3bHphUEMzdTZON0t0blgrS3V0dFxuWUJ1Tkh0OVBCQjBTaTZXSTkwUGpHRjlMTStsZllWVFNha3g1bit6eG5RazdtUkc2Q1VHZU13ZTEyUUR5WTBkWVxuVU45MTNBY3M4aXMvcW5GNHNnTGRSUzY1ck1mUVBhbUMrMVdqVW9OZ2RwcWwxc2hRTEQ3dVhMdDI5bmRXRkovbFxuQzdSa3AvSWZBZ01CQUFFQ2dnRUFMdFBsUTZMSDJBeURpcGR4ZDdmaDFQMlVoK2pMY1BNMmxhRGdmVzNqZDI5Q1xuaDlEbzR5cVRmV01EaDFXRzIvTkl2KytEbVI5UWhsbDh3YkdoTkJLQWM4WHlJUkY0MUV3NkJWWkp6aDNiRnZNblxuMWdYT0FSRHNzSFNoUDUyZERyVG5JM3RJZGZTWUViL2M2VnB0ejBCVTdwendkQ09UWFNlcGxEWVpYTTJXekxITlxuY3NrRXFjbmVhWEE0WDNPOTdnZ2h6aHZENG9xQktyWjI4RzcvUjg5WmRLWUxhRjhJNEFQUDNhVlB3cnpkN0dwVVxud3dwWkFXQlFPSm9SeTV6Y1JIUUQ0VFBaTG1SV2hOYUJJMVJtV0R4RnlrbzV6THhzTENjcmFEUFpPT2J6NXZIZFxuRjRTeHZRMnA3cXBBdTlxTmcxaFRGWDlKSkwvV2c3R1pDdzc3bjBkcFFRS0JnUURvNW5wZll6N1FYQ0dKaFdiN1xuaWh1eGFTbVUzdXNlRlZzYXhWN2U3bG1iM3NteXo2bzEyVlh2YURUSG1xejZaRytjekhKZEVYSFJVN2p3Wml2ZlxueG5PeFJ4Snh0bW0yaFg1S1g0YVZESUF4TkppUDRncFpSaTBnb2lzeXFUUWR3endnUUY5UjUvdThWSmprSmpYMVxuaGthZnlKTTVOWVRCOG1TUzBiOVpRaWIyWHdLQmdRRElRRnRHcC9oQVNZVXBod0Q2NzBhZ0o5WXd6YkRjRFJQSFxuOHpGUkVDRlFtVlg5TTZPU3lreElPMkRhemx0U3pmemcyQ0FSMFNmY1J2ZTdwcUgvcXV4aTc2bS9aZkFTSi9JVVxucUtZSkpYRWNjOXIwU29yUUJxUHNLKzVhK1JhVUg0amRSVW1QU0JCb2lCY3lZOVFqUzhXL1J0SFZwK2pveVBObVxuZWdHaFFjOGNRUUtCZ1FEQk4wUmFrbGx3UHA3TUdsSS9hR3BsR3B1V21BRnk2Y0MxU3Z6VDhlV0JmS2pVb1pmU1xuS01ZMFliMDN3MGl5U2xTV1ByNjZHMWpUa3FPaFBRSTFHY3l0VEFzdkwyZ3dOanQ1dEJwUTJSZ1l1a3UvUW9YWFxuWG5MZDJld0FrWU5kRmJWeUJEV1FHK2NxYlB5U2VtalZrbHBSQVBPeXlJV2s2VlVxd0x3QWJ2TW4vUUtCZ0JUWlxuM3FjMHhqeXJheG92M0lKRWQrNGxOOEJOS3FVL0YxZ3lrbWdHYmZHZWhiMmZxdUNWLyt0bGcyaEZKRzB5MWFuelxuMXlNRHpFcTdlUUFwRWFVMWZ2ZXVUTmFKSHI1Rk9vZThKODI4QUZNZUhTWml2S0Y4ajRULzdnbTY5Z2JtWWJIb1xualFoR1VLOFJ2SmlhbkhRd1o1N0xHUDVPUllvM29tQ0JRN291eUFvQkFvR0FaYlU1K2tMWE1JMzBubTNseWNsbVxuNUV3UVlXN01FR2FkRkt5VWRLQ2xOZzNoOXRQa0d4VXlZSEMwc3RJYWpCM2RBQjVpRERhOXptTHNzcWhjSWJxNVxuQ0xRSGF4Uk8vQTNaKzNOVDB1dGNJa0ZSak94NUdQU2I1dUc4M1J4QVZJb1RtWFhwa0dRRzRXTGUvc2dMWFpNOVxueTFqMGxvZFJqWWdQOVVPTmcvOTZWNms9XG4tLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tXG4iLAogICJjbGllbnRfZW1haWwiOiAiZXJwLXN0b3JhZ2VAbjhuLWxpbmtlZGluLXNjcmFwZXItNDkyNjE2LmlhbS5nc2VydmljZWFjY291bnQuY29tIiwKICAiY2xpZW50X2lkIjogIjExMDk5Nzc1MTE5Njc1OTMxOTE4OCIsCiAgImF1dGhfdXJpIjogImh0dHBzOi8vYWNjb3VudHMuZ29vZ2xlLmNvbS9vL29hdXRoMi9hdXRoIiwKICAidG9rZW5fdXJpIjogImh0dHBzOi8vb2F1dGgyLmdvb2dsZWFwaXMuY29tL3Rva2VuIiwKICAiYXV0aF9wcm92aWRlcl94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL29hdXRoMi92MS9jZXJ0cyIsCiAgImNsaWVudF94NTA5X2NlcnRfdXJsIjogImh0dHBzOi8vd3d3Lmdvb2dsZWFwaXMuY29tL3JvYm90L3YxL21ldGFkYXRhL3g1MDkvZXJwLXN0b3JhZ2UlNDBuOG4tbGlua2VkaW4tc2NyYXBlci00OTI2MTYuaWFtLmdzZXJ2aWNlYWNjb3VudC5jb20iLAogICJ1bml2ZXJzZV9kb21haW4iOiAiZ29vZ2xlYXBpcy5jb20iCn0K"

LOCAL_UPLOAD_DIR = os.path.join(os.path.abspath(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(LOCAL_UPLOAD_DIR, exist_ok=True)

def get_drive_service():
    try:
        if os.path.exists(CREDENTIALS_FILE):
            creds = service_account.Credentials.from_service_account_file(CREDENTIALS_FILE, scopes=SCOPES)
        else:
            import base64
            creds_info = json.loads(base64.b64decode(DEFAULT_CREDENTIALS_B64).decode('utf-8'))
            creds = service_account.Credentials.from_service_account_info(creds_info, scopes=SCOPES)
        return build('drive', 'v3', credentials=creds)
    except Exception as e:
        print(f"Failed to initialize Google Drive service: {e}")
        return None

def upload_to_drive(file_data: bytes, filename: str) -> str:
    """Uploads file bytes to Google Drive (Primary) or free unlimited cloud CDNs (Catbox / 0x0), returning file ID or URL."""
    # Tier 1: Try Google Drive API (Primary storage as requested by user)
    service = get_drive_service()
    if service:
        try:
            file_metadata = {'name': filename}
            if FOLDER_ID:
                file_metadata['parents'] = [FOLDER_ID]
                
            media = MediaIoBaseUpload(io.BytesIO(file_data), mimetype='application/octet-stream', resumable=True)
            file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
            print(f"Successfully uploaded to Google Drive Folder {FOLDER_ID}: File ID {file.get('id')}")
            return file.get('id')
        except Exception as e:
            print(f"Google Drive upload failed, falling back to cloud CDN: {e}")

    # Tier 2: Try Catbox.moe Unlimited Free Cloud CDN (up to 200MB per file, unlimited permanent storage)
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

    # Tier 3: Try 0x0.st Unlimited Free Cloud CDN (up to 512MB per file)
    try:
        import requests
        files = {'file': (filename, file_data)}
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        res = requests.post('https://0x0.st', files=files, headers=headers, timeout=45)
        if res.status_code == 200 and res.text.startswith('http'):
            print(f"Successfully uploaded to 0x0.st Cloud CDN: {res.text.strip()}")
            return res.text.strip()
    except Exception as e:
        print(f"0x0.st cloud upload failed, trying local storage: {e}")

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

