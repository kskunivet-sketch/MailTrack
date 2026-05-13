import json
import pyodbc 

db_path = r"\\DESKTOP-MN5HDVL\administrasi rektorat 2025-2026\AGENDA SURAT 2026\DATA AGENDA SURAT KELUAR BIRO REKTOR 2026.accdb"
try:
    conn_str = r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=\\DESKTOP-MN5HDVL\administrasi rektorat 2025-2026\AGENDA SURAT 2026\DATA AGENDA SURAT KELUAR BIRO REKTOR 2026.accdb;PWD=huda;ReadOnly=1;"
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM [DATA AGENDA SURAT KELUAR 2026]")
    columns = [col[0] for col in cursor.description]
    rows = cursor.fetchall()
    
    with open('tmp_keluar.txt', 'w', encoding='utf-8') as f:
        f.write(f"Columns: {columns}\n")
        
        # Check attachment related column
        att_col = None
        for c in columns:
            if "LAMPIRAN" in c.upper():
                att_col = c
                break
                
        if att_col:
            idx = columns.index(att_col)
            for r in rows:
                if r[idx]:
                    f.write(f"NO: {r[0]} | {att_col}: {r[idx]}\n")
except Exception as e:
    with open('tmp_keluar.txt', 'w', encoding='utf-8') as f:
        f.write(str(e))
