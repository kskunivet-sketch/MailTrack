import json

with open('sync_state_keluar.json', 'r', encoding='utf-8') as f:
    state = json.load(f)

with open('latest_data_keluar_2026.json', 'r', encoding='utf-8') as f:
    latest = json.load(f)

import hashlib
def _calculate_hash(data_dict):
    d = {k: v for k, v in data_dict.items() if k not in ['lastSyncAt', 'ts']}
    d_str = json.dumps(d, sort_keys=True, default=str)
    return hashlib.md5(d_str.encode('utf-8')).hexdigest()

for item in latest:
    doc_id = item['id']
    cached = state.get(doc_id, {})
    
    # Simulate bridge_logic.py exactly: it calculates hash BEFORE adding attachments
    tmp_item = item.copy()
    tmp_item.pop('attachments', None)
    tmp_item.pop('attachment_link', None)
    
    current_hash = _calculate_hash(tmp_item)
    
    if cached.get('hash') != current_hash:
        print(f"{doc_id} Hash differs.")
        print(f"Cached Hash: {cached.get('hash')}")
        print(f"Current Hash: {current_hash}")
        # What fields cause this? This is hard to know without the original JSON dict, but we can compare with something
    
    # Also check attachments
    cached_atts = cached.get('attachments', [])
    current_atts = item.get('attachments', [])
    if str(cached_atts) != str(current_atts):
        print(f"{doc_id} Attachments differ.")
        print(f"  Cached: {cached_atts}")
        print(f"  Current: {current_atts}")
