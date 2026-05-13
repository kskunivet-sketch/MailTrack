import os
import io
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import json

creds_path = 'credentials.json'
token_path = 'token.json'
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
creds = Credentials.from_authorized_user_file(token_path, SCOPES)
drive_service = build('drive', 'v3', credentials=creds)

results = drive_service.files().list(
    q="name contains '024' or name contains 'Surat Tugas'",
    fields="files(id, name, parents)",
    pageSize=10
).execute()

files = results.get('files', [])
with open('tmp_drive_search.txt', 'w', encoding='utf-8') as f:
    for file in files:
        f.write(f"Found: {file['name']} (ID: {file['id']}, Parents: {file.get('parents')})\n")
