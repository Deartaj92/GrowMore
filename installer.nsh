; ====================================================================
; Comprehensive NSIS Installer Script for Grow More
; Handles process termination and automatic uninstallation properly
; ====================================================================

; Helper macro to kill all processes immediately and forcefully
!macro KillAllAppProcesses
  ; Kill all possible process variants - execute synchronously to ensure completion
  Push $0
  Push $1
  
  ; First pass - kill all processes
  nsExec::ExecToStack 'taskkill /F /IM "Grow More.exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "Grow More Helper.exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "Grow More Helper (Renderer).exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "Grow More Helper (GPU).exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "Grow More Helper (Plugin).exe" /T'
  Pop $0
  Pop $1
  
  ; Legacy name support
  nsExec::ExecToStack 'taskkill /F /IM "School Management System.exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "School Management System Helper.exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "School Management System Helper (Renderer).exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "School Management System Helper (GPU).exe" /T'
  Pop $0
  Pop $1
  
  ; Wait for processes to terminate
  Sleep 800
  
  ; Second pass - retry killing to catch any stubborn processes
  nsExec::ExecToStack 'taskkill /F /IM "Grow More.exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "Grow More Helper.exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "Grow More Helper (Renderer).exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "Grow More Helper (GPU).exe" /T'
  Pop $0
  Pop $1
  
  nsExec::ExecToStack 'taskkill /F /IM "Grow More Helper (Plugin).exe" /T'
  Pop $0
  Pop $1
  
  ; Final wait to ensure all processes are terminated
  Sleep 500
  
  Pop $1
  Pop $0
!macroend

; ====================================================================
; customInit - Runs early in installer initialization
; ====================================================================
!macro customInit
  ; STEP 1: Kill all running processes IMMEDIATELY
  ; This must happen BEFORE electron-builder tries to auto-uninstall
  !insertmacro KillAllAppProcesses
  
  ; STEP 2: Wait a moment to ensure processes are fully terminated
  Sleep 300
  
  ; STEP 3: Manually find and uninstall previous version if it exists
  ; This bypasses electron-builder's auto-uninstall which checks for processes
  Push $0
  Push $1
  Push $2
  
  ; Check for uninstaller in registry (current user)
  ReadRegStr $0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
  StrCmp $0 "" check_hklm
  
  ; Found uninstaller - extract path and execute silently
  ; Remove quotes if present
  StrCpy $1 $0 "" 1
  StrCpy $1 $1 -1
  StrCmp $1 "" run_uninstaller_0
  StrCpy $0 $1
  
  run_uninstaller_0:
    ; Run uninstaller silently with /S flag (without _?= parameter to avoid path issues)
    ; The uninstaller knows its own location
    ExecWait '$0 /S'
    Goto cleanup_registry
  
  ; Check for uninstaller in registry (local machine)
  check_hklm:
    ReadRegStr $0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}" "UninstallString"
    StrCmp $0 "" done_uninstall
    
    ; Found uninstaller - extract path and execute silently
    StrCpy $1 $0 "" 1
    StrCpy $1 $1 -1
    StrCmp $1 "" run_uninstaller_1
    StrCpy $0 $1
    
    run_uninstaller_1:
      ; Run uninstaller silently with /S flag (without _?= parameter to avoid path issues)
      ExecWait '$0 /S'
  
  cleanup_registry:
    ; Clean up any leftover registry entries
    DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${UNINSTALL_APP_KEY}"
    
    ; Additional cleanup for per-user installations
    DeleteRegKey HKCU "Software\${PRODUCT_FILENAME}"
    DeleteRegKey HKLM "Software\${PRODUCT_FILENAME}"
  
  done_uninstall:
    Pop $2
    Pop $1
    Pop $0
  
  ; STEP 4: Additional process cleanup with verification
  ; Verify no processes are still running
  nsExec::ExecToStack 'tasklist | findstr /I "Grow More"'
  Pop $0
  ${If} $0 != ""
    ; Still running, kill again and wait longer
    !insertmacro KillAllAppProcesses
    Sleep 1000
  ${EndIf}
  
  ; STEP 5: Clear temporary and cache files
  RMDir /r "$TEMP\Grow More"
  RMDir /r "$TEMP\School Management System"
  RMDir /r "$LOCALAPPDATA\Grow More\Cache"
  RMDir /r "$LOCALAPPDATA\Grow More\Code Cache"
  RMDir /r "$LOCALAPPDATA\Grow More\GPUCache"
  RMDir /r "$LOCALAPPDATA\School Management System\Cache"
  RMDir /r "$LOCALAPPDATA\School Management System\Code Cache"
  RMDir /r "$LOCALAPPDATA\School Management System\GPUCache"
  
  ; STEP 6: Create necessary directories for new installation
  CreateDirectory "$LOCALAPPDATA\Grow More"
  CreateDirectory "$LOCALAPPDATA\Grow More\logs"
!macroend

; ====================================================================
; customUnInit - Runs during uninstallation
; ====================================================================
!macro customUnInit
  ; Kill all processes before uninstalling
  !insertmacro KillAllAppProcesses
  
  ; Additional wait for processes to terminate
  Sleep 500
  
  ; Clean up application data (both new and legacy paths)
  RMDir /r "$LOCALAPPDATA\Grow More"
  RMDir /r "$LOCALAPPDATA\School Management System"
  RMDir /r "$APPDATA\Grow More"
  RMDir /r "$APPDATA\School Management System"
  
  ; Clean up shortcuts
  Delete "$DESKTOP\Grow More.lnk"
  Delete "$DESKTOP\School Management System.lnk"
  Delete "$SMPROGRAMS\Grow More.lnk"
  Delete "$SMPROGRAMS\School Management System.lnk"
!macroend
