Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("Shell.Application")

' Get the folder path from the argument passed to the script.
folderPath = WScript.Arguments(0)

' Loop through open Explorer windows.
For Each win In objShell.Windows
    On Error Resume Next
    ' Check that the window is an Explorer instance.
    If InStr(1, LCase(win.FullName), "explorer.exe", vbTextCompare) > 0 Then
        ' Compare the window's folder path with the provided folderPath.
        If LCase(win.Document.Folder.Self.Path) = LCase(folderPath) Then
            ' Call the window's Refresh method.
            win.Refresh
            Exit For
        End If
    End If
Next

desktopPath = WshShell.SpecialFolders("Desktop")
' If the given folder path is the Desktop, refresh the Desktop as well
If LCase(folderPath) = LCase(desktopPath) Then
    WshShell.AppActivate "Program Manager"
    WScript.Sleep 500
    WshShell.SendKeys "{F5}"
End If
