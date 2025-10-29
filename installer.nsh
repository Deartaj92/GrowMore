!macro customInit
  ; Log running processes for debugging
  nsExec::ExecToLog 'tasklist'

  ; Try to kill all possible variants of the app and helpers
  nsExec::ExecToLog 'taskkill /F /IM "School Management System.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "School Management System Helper.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "School Management System Helper (Renderer).exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "School Management System Helper (GPU).exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "electron.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "node.exe" /T'

  ; Wait a bit for processes to close
  Sleep 2000

  ; Log running processes again
  nsExec::ExecToLog 'tasklist'

  ; Clear temporary files
  RMDir /r "$TEMP\School Management System"
  RMDir /r "$LOCALAPPDATA\School Management System\Cache"
  RMDir /r "$LOCALAPPDATA\School Management System\Code Cache"
  RMDir /r "$LOCALAPPDATA\School Management System\GPUCache"
  
  ; Create necessary directories
  CreateDirectory "$LOCALAPPDATA\School Management System"
  CreateDirectory "$LOCALAPPDATA\School Management System\logs"
!macroend

!macro customUnInit
  ; Kill processes before uninstall
  nsExec::ExecToLog 'taskkill /F /IM "School Management System.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "School Management System Helper.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "School Management System Helper (Renderer).exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "School Management System Helper (GPU).exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "electron.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "node.exe" /T'
  Sleep 2000

  ; Clean up application data
  RMDir /r "$LOCALAPPDATA\School Management System"
  RMDir /r "$APPDATA\School Management System"
  Delete "$DESKTOP\School Management System.lnk"
  Delete "$SMPROGRAMS\School Management System.lnk"
!macroend 