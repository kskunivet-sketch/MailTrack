WScript.Sleep 10000
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File ""D:\PROGRAMMING\AgendaSurat\MailTrack\run_bridge_tray.ps1""", 0, False
