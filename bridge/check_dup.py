import pyodbc 

db_path = r"\\DESKTOP-MN5HDVL\administrasi rektorat 2025-2026\AGENDA SURAT 2026\DATA AGENDA SURAT KELUAR BIRO REKTOR 2026.accdb"
conn_str = r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};DBQ=\\DESKTOP-MN5HDVL\administrasi rektorat 2025-2026\AGENDA SURAT 2026\DATA AGENDA SURAT KELUAR BIRO REKTOR 2026.accdb;PWD=huda;ReadOnly=1;"
conn = pyodbc.connect(conn_str)
cursor = conn.cursor()
cursor.execute("SELECT [NO URUT], [PERIHAL] FROM [DATA AGENDA SURAT KELUAR 2026] WHERE [NO URUT] IN ('397', '398')")
rows = cursor.fetchall()
for r in rows:
    print(r)
