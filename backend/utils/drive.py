import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload, MediaIoBaseDownload
import io

# Define scopes for Google Drive API
SCOPES = ['https://www.googleapis.com/auth/drive.file']

CREDENTIALS_FILE = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS", "credentials.json")
FOLDER_ID = os.environ.get("GOOGLE_DRIVE_FOLDER_ID")

def get_drive_service():
    if not os.path.exists(CREDENTIALS_FILE):
        return None
    creds = service_account.Credentials.from_service_account_file(
        CREDENTIALS_FILE, scopes=SCOPES)
    return build('drive', 'v3', credentials=creds)

def upload_to_drive(file_data: bytes, filename: str) -> str:
    """Uploads file bytes to Google Drive and returns the file ID."""
    service = get_drive_service()
    if not service:
        # Fallback if no credentials
        raise Exception("Google Drive credentials not found. Please add credentials.json")
    
    file_metadata = {'name': filename}
    if FOLDER_ID:
        file_metadata['parents'] = [FOLDER_ID]
        
    media = MediaIoBaseUpload(io.BytesIO(file_data), mimetype='application/octet-stream', resumable=True)
    file = service.files().create(body=file_metadata, media_body=media, fields='id').execute()
    return file.get('id')

def download_from_drive(file_id: str) -> bytes:
    """Downloads a file from Google Drive by its file ID and returns the bytes."""
    service = get_drive_service()
    if not service:
        raise Exception("Google Drive credentials not found.")
        
    request = service.files().get_media(fileId=file_id)
    fh = io.BytesIO()
    downloader = MediaIoBaseDownload(fh, request)
    done = False
    while done is False:
        status, done = downloader.next_chunk()
    return fh.getvalue()

def get_file_metadata(file_id: str) -> dict:
    service = get_drive_service()
    if not service:
        raise Exception("Google Drive credentials not found.")
    return service.files().get(fileId=file_id, fields='name, mimeType').execute()
