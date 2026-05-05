import os
import sys
import datetime
import traceback
import json
import shutil
import tempfile
import pyodbc 
import io
import time
import threading
import logging
import hashlib
from dotenv import load_dotenv

# --- LIBRARIES CHECK ---
try:
    import win32com.client
    import pythoncom
    HAS_DAO = True
except ImportError:
    HAS_DAO = False

try:
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from google.auth.transport.requests import Request
    from googleapiclient.discovery import build
    from googleapiclient.http import MediaFileUpload
    HAS_GOOGLE = True
except ImportError:
    HAS_GOOGLE = False

try:
    import firebase_admin
    from firebase_admin import credentials, firestore
    from google.api_core import exceptions as google_exceptions
    HAS_FIREBASE = True
except ImportError:
    HAS_FIREBASE = False

# --- LOGGING SETUP ---
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bridge.log')

# Reset log if larger than 5MB
if os.path.exists(log_file) and os.path.getsize(log_file) > 5 * 1024 * 1024:
    try: os.remove(log_file)
    except: pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(log_file, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

class BridgeLogic:
    def __init__(self):
        logging.info("Initializing Unitary Bridge Logic...")
        self.project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Load Env
        env_local = os.path.join(self.project_root, '.env.local')
        env_plain = os.path.join(self.project_root, '.env')
        if os.path.exists(env_local):
            load_dotenv(env_local)
        elif os.path.exists(env_plain):
            load_dotenv(env_plain)
        
        # Base Paths
        self.creds_path = os.path.abspath(os.path.join(os.path.dirname(__file__), os.getenv('GOOGLE_CLIENT_SECRET', 'credentials.json')))
        self.token_path = os.path.join(os.path.dirname(self.creds_path), 'token.json')
        
        # State Configs
        self.configs = {
            'masuk': {
                'db_path': os.getenv('ACCESS_DB_PATH'),
                'target_year': 2025,
                'drive_folder_id': os.getenv('GOOGLE_DRIVE_FOLDER_ID'),
                'target_table_prefix': 'DATA AGENDA SURAT MASUK',
                'fs_collection': 'surat_masuk',
                'config_doc': 'system',
                'state_file': os.path.join(os.path.dirname(__file__), 'sync_state_masuk.json'),
                'backup_env_id': os.getenv('GOOGLE_BACKUP_FILE_ID'),
                'backup_name_prefix': 'latest_data'
            },
            'keluar': {
                'db_path': os.getenv('ACCESS_DB_PATH_KELUAR'),
                'target_year': 2025,
                'drive_folder_id': os.getenv('GOOGLE_DRIVE_FOLDER_ID_KELUAR'),
                'target_table_prefix': 'DATA AGENDA SURAT KELUAR',
                'fs_collection': 'surat_keluar',
                'config_doc': 'system_keluar',
                'state_file': os.path.join(os.path.dirname(__file__), 'sync_state_keluar.json'),
                'backup_env_id': os.getenv('GOOGLE_BACKUP_FILE_ID_KELUAR'),
                'backup_name_prefix': 'latest_data_keluar'
            }
        }
        
        self.fs_cooldown = 0
        
        # Init Services
        self.drive_service = self._init_drive() if HAS_GOOGLE else None
        self.firestore_db = self._init_firestore() if HAS_FIREBASE else None
        
        # Validation
        if not getattr(self, 'firestore_db', None):
            logging.error("Firestore DB not initialized. Check serviceAccountKey.json")
        if not self.drive_service:
            logging.error("Google Drive API not initialized. Check credentials.json")

    def _ensure_services(self):
        if HAS_FIREBASE and not self.firestore_db:
            try:
                self.firestore_db = self._init_firestore()
                if self.firestore_db: logging.info("Firestore service recovered.")
            except: pass
            
        if HAS_GOOGLE and not self.drive_service:
            try:
                self.drive_service = self._init_drive()
                if self.drive_service: logging.info("Drive service recovered.")
            except: pass

    def _init_firestore(self):
        try:
            if firebase_admin._apps: return firestore.client()
            key_path = os.getenv('FIREBASE_SERVICE_ACCOUNT', 'serviceAccountKey.json')
            if not os.path.isabs(key_path):
                key_path = os.path.abspath(os.path.join(os.path.dirname(__file__), key_path))
            
            if not os.path.exists(key_path):
                logging.error(f"Firebase Key Missing: {key_path}")
                return None

            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            return firestore.client()
        except Exception as e:
            logging.error(f"Firestore Auth Failed: {e}")
            return None

    def _init_drive(self):
        try:
            SCOPES = ['https://www.googleapis.com/auth/drive']
            creds = None
            if os.path.exists(self.token_path):
                creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
            
            if not creds or not creds.valid:
                if creds and creds.expired and creds.refresh_token:
                    creds.refresh(Request())
                else:
                    if not os.path.exists(self.creds_path):
                        logging.error(f"Google Credentials Missing: {self.creds_path}")
                        return None
                    flow = InstalledAppFlow.from_client_secrets_file(self.creds_path, SCOPES)
                    creds = flow.run_local_server(port=0)
                with open(self.token_path, 'w') as token:
                    token.write(creds.to_json())

            return build('drive', 'v3', credentials=creds)
        except Exception as e:
            logging.error(f"Drive Auth Failed: {e}")
            return None

    def _load_state(self, state_file):
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r') as f: return json.load(f)
            except: return {}
        return {}

    def _save_state(self, state_file, state_data):
        try:
            with open(state_file, 'w') as f: json.dump(state_data, f, indent=2)
        except: pass

    def update_bridge_status(self, status, error=None):
        """Update Firestore heartbeat for both collections."""
        self._ensure_services()
        if not self.firestore_db: return
        for t in ['masuk', 'keluar']:
            try:
                doc_id = self.configs[t]['config_doc']
                doc_ref = self.firestore_db.collection('config').document(doc_id)
                data = {
                    'syncStatus': status,
                    'lastActive': firestore.SERVER_TIMESTAMP,
                }
                if error: data['lastError'] = str(error)
                elif status == "healthy": data['lastError'] = None
                
                doc_ref.set(data, merge=True)
            except Exception as e:
                pass
        
        logging.info(f"Heartbeat: {status.upper()}")
        if error:
            self.log_event(f"System Error: {error}", "error")

    def log_event(self, message, level="info"):
        logging.info(f"[{level.upper()}] {message}")
        self._ensure_services()
        if not self.firestore_db or time.time() < self.fs_cooldown: return
        try:
            self.firestore_db.collection('audit_logs').add({
                'message': message,
                'level': level,
                'timestamp': firestore.SERVER_TIMESTAMP,
                'userName': 'BRIDGE_ENGINE'
            })
        except Exception as e:
            if '429' in str(e): self.fs_cooldown = time.time() + 3600

    def sync_config(self):
        self._ensure_services()
        config_cache_file = os.path.join(os.path.dirname(__file__), 'config_cache_v2.json')
        
        try:
            if os.path.exists(config_cache_file):
                with open(config_cache_file, 'r', encoding='utf-8-sig') as f:
                    cached = json.load(f)
                    for t in ['masuk', 'keluar']:
                        if t in cached:
                            self.configs[t]['db_path'] = cached[t].get('accessDbPath', self.configs[t]['db_path'])
                            self.configs[t]['target_year'] = int(cached[t].get('targetYear', self.configs[t]['target_year']))
                            self.configs[t]['drive_folder_id'] = cached[t].get('driveFolderId', self.configs[t]['drive_folder_id'])
                            self.configs[t]['db_pwd'] = cached[t].get('accessDbPassword', self.configs[t].get('db_pwd', ''))
        except Exception: pass
        
        if not self.firestore_db: return
        
        if time.time() < self.fs_cooldown:
            return
            
        updated_cache = {}
        for t in ['masuk', 'keluar']:
            try:
                doc_id = self.configs[t]['config_doc']
                doc_ref = self.firestore_db.collection('config').document(doc_id)
                doc = doc_ref.get(timeout=5, retry=None)
                data = doc.to_dict()
                if data:
                    self.configs[t]['db_path'] = data.get('accessDbPath', self.configs[t]['db_path'])
                    self.configs[t]['drive_folder_id'] = data.get('driveFolderId', self.configs[t]['drive_folder_id'])
                    self.configs[t]['target_year'] = int(data.get('targetYear', self.configs[t]['target_year']))
                    self.configs[t]['db_pwd'] = data.get('accessDbPassword', self.configs[t].get('db_pwd', ''))
                    
                    updated_cache[t] = {
                        'accessDbPath': self.configs[t]['db_path'],
                        'targetYear': self.configs[t]['target_year'],
                        'driveFolderId': self.configs[t]['drive_folder_id'],
                        'accessDbPassword': self.configs[t]['db_pwd']
                    }
                    logging.info(f"  [FS] Config sync ({t}): OK.")
            except Exception as e:
                err_str = str(e)
                if '429' in err_str:
                    if self.fs_cooldown == 0 or time.time() > self.fs_cooldown:
                        logging.warning(f"  [FS] Quota Exceeded for {t}. Falling back to manual JSON upload mode for 1 hour.")
                    self.fs_cooldown = time.time() + 3600
                else:
                    logging.warning(f"  [FS] Config sync failed for {t}: {err_str}")

        if updated_cache:
            try:
                with open(config_cache_file, 'w', encoding='utf-8') as f:
                    json.dump(updated_cache, f)
            except Exception: pass

    def _calculate_hash(self, data_dict):
        d = {k: v for k, v in data_dict.items() if k not in ['lastSyncAt', 'ts']}
        d_str = json.dumps(d, sort_keys=True, default=str)
        return hashlib.md5(d_str.encode('utf-8')).hexdigest()

    def perform_sync(self):
        self._ensure_services()
        sync_start = time.time()
        logging.info("--- Unified Sync Cycle Started ---")
        
        if HAS_DAO:
            pythoncom.CoInitialize()
            
        try:
            for t in ['masuk', 'keluar']:
                self._process_type(t)
        except Exception as e:
            logging.critical(f"Fatal Sync Error: {e}")
        finally:
            if HAS_DAO:
                pythoncom.CoUninitialize()

        logging.info(f"--- Unified Sync Complete in {time.time() - sync_start:.2f}s ---")

    def _process_type(self, t):
        conf = self.configs[t]
        logging.info(f"Starting sync for: {t.upper()}")
        
        if not conf['db_path'] or not os.path.exists(conf['db_path']):
            err_msg = f"Database not found for {t}: {conf['db_path']}"
            logging.error(err_msg)
            self._update_status_for_type(t, "error", error=err_msg)
            return

        try:
            self._process_database(conf['db_path'], t, conf)
            self._update_status_for_type(t, "online")
        except Exception as e:
            err_msg = f"Processing Error for {t}: {e}"
            logging.error(err_msg)
            self._update_status_for_type(t, "error", error=err_msg)
            traceback.print_exc()

    def _update_status_for_type(self, t, status, error=None):
        if not self.firestore_db or time.time() < self.fs_cooldown: return
        try:
            doc_id = self.configs[t]['config_doc']
            doc_ref = self.firestore_db.collection('config').document(doc_id)
            data = {'syncStatus': status, 'lastActive': firestore.SERVER_TIMESTAMP}
            if error: data['lastError'] = str(error)
            elif status == "healthy": data['lastError'] = None
            doc_ref.set(data, merge=True)
            if error: self.log_event(f"Error ({t}): {error}", "error")
        except Exception as e:
            if '429' in str(e): self.fs_cooldown = time.time() + 3600

    def _process_database(self, db_path, t, conf):
        conn = None
        dao_db = None
        all_records = []
        processed_state = self._load_state(conf['state_file'])
        
        db_pwd = conf.get('db_pwd', '')
        
        if HAS_DAO:
            try:
                try: dao_engine = win32com.client.Dispatch("DAO.DBEngine.160")
                except: dao_engine = win32com.client.Dispatch("DAO.DBEngine.120")
                if db_pwd:
                    dao_db = dao_engine.OpenDatabase(db_path, False, False, f"MS Access;PWD={db_pwd}")
                else:
                    dao_db = dao_engine.OpenDatabase(db_path)
            except Exception as e:
                logging.warning(f"DAO Init Failed: {e}")

        try:
            pwd_str = f";PWD={db_pwd}" if db_pwd else ""
            conn_str = r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=" + db_path + pwd_str + ";ReadOnly=1;"
            logging.info(f"ODBC Conn String: {conn_str}")
            conn = pyodbc.connect(conn_str)
            cursor = conn.cursor()
        except Exception as e:
            logging.error(f"ODBC Connect Failed: {e}")
            raise

        try:
            available_tables = [table.table_name for table in cursor.tables(tableType='TABLE')]
            valid_tables = [table for table in available_tables if table.startswith(conf['target_table_prefix'])]
            
            if not valid_tables:
                logging.warning(f"No '{conf['target_table_prefix']}' table found in {db_path}.")
                return
                
            desired_table = f"{conf['target_table_prefix']} {conf['target_year']}"
            if desired_table in valid_tables:
                target_table = desired_table
            else:
                target_table = valid_tables[0]
                
            cursor.execute(f"SELECT * FROM [{target_table}]")
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
        except Exception as e:
            logging.error(f"Table Read Failed: {e}")
            if conn: conn.close()
            if dao_db: dao_db.Close()
            return

        stats = {"added": 0, "updated": 0, "skipped": 0}
        
        for row in rows:
            data = {}
            for i, col in enumerate(columns):
                val = row[i]
                if isinstance(val, (datetime.date, datetime.datetime)): val = val.isoformat()
                if isinstance(val, (bytes, bytearray)): val = "[BINARY]"
                data[col] = val
            
            no_urut = data.get('NO URUT')
            if no_urut is None: continue

            real_year = int(conf['target_year'])
            date_val = data.get('TANGGAL SURAT DITERIMA') or data.get('TANGGAL SURAT KELUAR')
            if date_val and isinstance(date_val, str) and len(date_val) >= 4:
                try: real_year = int(date_val[:4])
                except: pass

            doc_id = f"{real_year}_{no_urut}"
            data['id'] = doc_id
            data['year'] = real_year
            data['target_year_config'] = int(conf['target_year'])
            
            cached = processed_state.get(doc_id, {})
            current_hash = self._calculate_hash(data)
            
            attachments = []
            cached_atts = cached.get('attachments', []) if isinstance(cached.get('attachments'), list) else []
            
            if dao_db:
                try:
                    attachments = self._extract_attachments(dao_db, target_table, no_urut, conf, cached_atts)
                except Exception:
                    attachments = cached_atts
            else:
                attachments = cached_atts
            
            data['attachments'] = attachments
            data['attachment_link'] = ", ".join([a.get('driveViewLink', '') for a in attachments])

            all_records.append(data)

            atts_changed = (str(attachments) != str(cached_atts))
            if cached.get('hash') != current_hash or not cached.get('uploaded') or atts_changed:
                if self.firestore_db and time.time() >= self.fs_cooldown:
                    try:
                        self.firestore_db.collection(conf['fs_collection']).document(doc_id).set(data, merge=True)
                        action = "updated" if cached.get('uploaded') else "added"
                        stats[action] += 1
                        
                        if stats['added'] % 20 == 0 and stats['added'] > 0:
                            logging.info(f"  -> Uploaded {stats['added']} records to Firestore...")
                    except Exception as e:
                        if '429' in str(e):
                            self.fs_cooldown = time.time() + 3600
                        else:
                            logging.warning(f"Firestore Write Failed: {e}")
                        continue
                
                processed_state[doc_id] = {
                    'uploaded': True,
                    'hash': current_hash,
                    'attachments': attachments,
                    'ts': str(datetime.datetime.now())
                }
            else:
                stats["skipped"] += 1

        self._save_state(conf['state_file'], processed_state)
        logging.info(f"Sync Results ({t}): {stats['added']} added, {stats['updated']} updated, {stats['skipped']} skipped.")

        json_name = f"{conf['backup_name_prefix']}_{conf['target_year']}.json"
        json_path = os.path.join(os.path.dirname(__file__), json_name)
        try:
            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(all_records, f, ensure_ascii=False, indent=2)
            dl_link, dl_id = self._upload_simple_file(json_path, json_name, conf)
            
            if self.firestore_db and time.time() >= self.fs_cooldown:
                try:
                    self.firestore_db.collection('config').document(conf['config_doc']).update({
                        'backup_json_url': dl_link,
                        'backup_json_id': dl_id,
                        'syncStatus': 'healthy',
                        'lastSyncAt': firestore.SERVER_TIMESTAMP,
                        'lastActive': firestore.SERVER_TIMESTAMP,
                        'lastError': None
                    })
                except Exception as e:
                    if '429' in str(e):
                        self.fs_cooldown = time.time() + 3600
                    else:
                        logging.warning(f"Metadata Update Failed for {t}: {e}")
        except Exception as e:
            if '429' not in str(e):
                logging.error(f"Backup Upload Failed for {t}: {e}")

        if conn: conn.close()
        if dao_db: dao_db.Close()

    def _extract_attachments(self, dao_db, target_table, no_urut, conf, cached_attachments=None):
        results = []
        if cached_attachments is None: cached_attachments = []
        cached_map = {a.get('fileName'): a for a in cached_attachments if isinstance(a, dict) and a.get('fileName')}
        try:
            try:
                try:
                    query = f"SELECT [LAMPIRAN SURAT] FROM [{target_table}] WHERE [NO URUT] = {no_urut}"
                    rs = dao_db.OpenRecordset(query)
                    child_rs = rs.Fields("LAMPIRAN SURAT").Value
                except:
                    query = f"SELECT [LAMPIRAN/ARSIP SURAT] FROM [{target_table}] WHERE [NO URUT] = {no_urut}"
                    rs = dao_db.OpenRecordset(query)
                    child_rs = rs.Fields("LAMPIRAN/ARSIP SURAT").Value
            except:
                try:
                    query = f"SELECT [LAMPIRAN SURAT] FROM [{target_table}] WHERE [NO URUT] = '{no_urut}'"
                    rs = dao_db.OpenRecordset(query)
                    child_rs = rs.Fields("LAMPIRAN SURAT").Value
                except:
                    query = f"SELECT [LAMPIRAN/ARSIP SURAT] FROM [{target_table}] WHERE [NO URUT] = '{no_urut}'"
                    rs = dao_db.OpenRecordset(query)
                    child_rs = rs.Fields("LAMPIRAN/ARSIP SURAT").Value

            if not rs.EOF:
                while not child_rs.EOF:
                    fname = child_rs.Fields("FileName").Value
                    smart_name = f"{conf['target_year']}_{target_table.split()[-2]}_{no_urut}_{fname}"
                    
                    if fname in cached_map:
                        results.append(cached_map[fname])
                    else:
                        existing = self._check_drive_file(smart_name, conf['drive_folder_id'])
                        if existing:
                            results.append({
                                'fileName': fname,
                                'driveViewLink': f"https://drive.google.com/file/d/{existing['id']}/view?usp=sharing",
                                'driveFileId': existing['id']
                            })
                        else:
                            temp_dir = os.path.join(os.path.dirname(__file__), 'temp_att')
                            if not os.path.exists(temp_dir): os.makedirs(temp_dir)
                            path = os.path.join(temp_dir, smart_name)
                            
                            if os.path.exists(path):
                                try: os.remove(path)
                                except: pass
                                
                            child_rs.Fields("FileData").SaveToFile(path)
                        
                            if os.path.exists(path):
                                res = self._upload_to_drive(path, smart_name, conf['drive_folder_id'])
                                if res:
                                    results.append({
                                        'fileName': fname,
                                        'driveViewLink': res['link'],
                                        'driveFileId': res['id']
                                    })
                                try: os.remove(path)
                                except: pass
                    child_rs.MoveNext()
            rs.Close()
        except Exception as e: 
            pass
        return results

    def _check_drive_file(self, name, folder_id):
        if not self.drive_service: return None
        try:
            q = f"name = '{name}' and trashed = false"
            if folder_id: q += f" and '{folder_id}' in parents"
            res = self.drive_service.files().list(q=q, fields="files(id)").execute()
            files = res.get('files', [])
            return files[0] if files else None
        except: return None

    def _upload_to_drive(self, path, name, folder_id):
        if not self.drive_service: return None
        try:
            meta = {'name': name}
            if folder_id: meta['parents'] = [folder_id]
            media = MediaFileUpload(path, resumable=True)
            f = self.drive_service.files().create(body=meta, media_body=media, fields='id').execute()
            fid = f.get('id')
            self.drive_service.permissions().create(fileId=fid, body={'type': 'anyone', 'role': 'reader'}).execute()
            return {'id': fid, 'link': f"https://drive.google.com/file/d/{fid}/view?usp=sharing"}
        except: return None

    def _upload_simple_file(self, path, name, conf):
        if not self.drive_service: return None, None
        try:
            target_id = conf['backup_env_id']
            existing = None
            if "latest_data" in name and target_id:
                existing = {'id': target_id} 
            else:
                existing = self._check_drive_file(name, conf['drive_folder_id'])

            media = MediaFileUpload(path, resumable=True)
            if existing:
                try:
                    self.drive_service.files().update(fileId=existing['id'], media_body=media).execute()
                    fid = existing['id']
                except Exception as update_err:
                    meta = {'name': name}
                    if conf['drive_folder_id']: meta['parents'] = [conf['drive_folder_id']]
                    f = self.drive_service.files().create(body=meta, media_body=media, fields='id').execute()
                    fid = f.get('id')
            else:
                meta = {'name': name}
                if conf['drive_folder_id']: meta['parents'] = [conf['drive_folder_id']]
                f = self.drive_service.files().create(body=meta, media_body=media, fields='id').execute()
                fid = f.get('id')
            
            try: self.drive_service.permissions().create(fileId=fid, body={'type': 'anyone', 'role': 'reader'}).execute()
            except: pass
            
            return f"https://drive.google.com/uc?export=download&id={fid}", fid
        except: return None, None

    def check_for_signal_file(self):
        self._ensure_services()
        if not self.drive_service: return None
        # We check both folders for signal
        for t in ['masuk', 'keluar']:
            try:
                fid = self.configs[t]['drive_folder_id']
                if not fid: continue
                q = f"name = 'sync_signal.txt' and trashed = false and '{fid}' in parents"
                res = self.drive_service.files().list(q=q, fields="files(id)").execute()
                files = res.get('files', [])
                if files: return files[0]['id']
            except: pass
        return None

    def delete_drive_file(self, fid):
        try: self.drive_service.files().delete(fileId=fid).execute()
        except: pass

if __name__ == '__main__':
    b = BridgeLogic()
    b.perform_sync()
