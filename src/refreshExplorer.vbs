' refreshExplorer.vbs
Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Check if a folder path argument is provided.
If WScript.Arguments.Count > 0 Then
    folderPath = WScript.Arguments(0)
    
    ' Get the Desktop folder path.
    desktopFolder = WshShell.SpecialFolders("Desktop")
    
    ' Compare the provided folderPath with the Desktop folder.
    If LCase(folderPath) = LCase(desktopFolder) Then
        ' If folderPath is the Desktop, activate the desktop.
        WshShell.AppActivate "Program Manager"
    Else
        ' For any other folder, get its name.
        Set folderObj = fso.GetFolder(folderPath)
        folderName = folderObj.Name
        
        ' Attempt to activate the File Explorer window with the folder name.
        On Error Resume Next
        WshShell.AppActivate folderName
        If Err.Number <> 0 Then
            ' If no window is found with the folder name, try activating a generic "File Explorer" window.
            Err.Clear
            WshShell.AppActivate "File Explorer"
        End If
        On Error GoTo 0
    End If
Else
    ' If no folder path is provided, default to refreshing the desktop.
    WshShell.AppActivate "Program Manager"
End If

' Wait briefly to ensure the target window is focused.
WScript.Sleep 500

' Send the F5 keystroke to refresh the window.
WshShell.SendKeys "{F5}"
