import json

state_file = 'sync_state_keluar.json'
with open(state_file, 'r', encoding='utf-8') as f:
    state = json.load(f)

latest_file = 'latest_data_keluar_2026.json'
with open(latest_file, 'r', encoding='utf-8') as f:
    latest = json.load(f)

import hashlib
def _calculate_hash(data_dict):
    d = {k: v for k, v in data_dict.items() if k not in ['lastSyncAt', 'ts', 'attachments', 'attachment_link']}
    d_str = json.dumps(d, sort_keys=True, default=str)
    return hashlib.md5(d_str.encode('utf-8')).hexdigest()

changed = []
for item in latest:
    doc_id = item['id']
    cached = state.get(doc_id, {})
    current_hash = _calculate_hash(item)
    if not cached.get('uploaded'):
        changed.append((doc_id, 'not uploaded'))
    elif cached.get('hash') != current_hash:
        changed.append((doc_id, f"Hash mismatch: {cached.get('hash')} != {current_hash}"))
    elif str(item.get('attachments')) != str(cached.get('attachments')):
        changed.append((doc_id, f"Attachments vary: {cached.get('attachments')} != {item.get('attachments')}"))

with open('tmp_diff.txt', 'w', encoding='utf-8') as f:
    f.write(f"Changed: {len(changed)}\n")
    for c in changed:
        f.write(f"{c}\n")

