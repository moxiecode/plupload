' http://todayguesswhat.blogspot.com.br/2012/08/windows-7-replacement-for.html
strComputer = "."

Set objFSO = CreateObject("Scripting.FileSystemObject")
Set objShell = CreateObject("Shell.Application")
Set objWSShell = CreateObject("WScript.Shell")

strScriptFile = Wscript.ScriptFullName ' C:\plupload-1.x\src\flash\plupload\build.vbs
Set objFile = objFSO.GetFile(strScriptFile)
strFolder = objFSO.GetParentFolderName(objFile) ' C:\plupload-1.x\src\flash\plupload

strWorkspace = Mid(strFolder,1,(Len(strFolder) - 19)) 'C:\plupload-1.x (Removed '\src\flash\plupload')

comspec = objWSShell.ExpandEnvironmentStrings("%comspec%")

Set objFile = objShell.BrowseForFolder(0, "Please select the directory that you have extracted Flex SDK:", &H0001) 'Change to &H4000 to show files too
	
If IsValue(objFile) Then
	 strPathToExileFile = objFile.self.Path
	 
	 If Not objFSO.FileExists(strPathToExileFile & "\bin\mxmlc.exe") Then
	 	 MsgBox strPathToExileFile & "\bin\mxmlc.exe can't be located." & vbcrlf & "Please make sure that you selected the Flex SDK directory.", 48
		 ' http://stackoverflow.com/questions/1686454/run-a-vbscript-from-another-vbscript
		 objWSShell.Run strScriptFile
		 WScript.Quit
	 End If
Else
	 WScript.Quit
End If

' I wrote an article on CodeProject about it:
' http://www.codeproject.com/Tips/507798/Differences-between-Run-and-Exec-VBScript
 
' ////////////////////////////////////////////////////////
strExec = Quotes(strPathToExileFile & "\bin\mxmlc.exe") &_
				 " -source-path " & Quotes(strFolder & "\src") &_
				 " -optimize -use-resource-bundle-metadata" &_ 
				 " -show-actionscript-warnings -show-binding-warnings" &_
				 " -show-unused-type-selector-warnings -strict" &_
				 " -accessible=false -use-network " &_
				 " -static-link-runtime-shared-libraries" &_
				 " -output " & Quotes(strWorkspace & "\js\plupload.flash.swf") &_
		    	 " " & Quotes(strFolder & "\src\com\plupload\Plupload.as")

'1: Show prompt, True: Wait to finish to continue processing
'strErrorCode = 
objWSShell.Run Quotes(strFolder & "\exec.bat") & " " & Quotes(strPathToExileFile),1,True

'If strErrorCode = 0 Then
If objFSO.FileExists(strWorkspace & "\js\plupload.flash.swf") Then
	objWSShell.Exec("explorer.exe /select," & Quotes(strWorkspace & "\js\plupload.flash.swf"))
Else
	strResponse = MsgBox("Please make sure you have installed Java JDK (32-bit)." & vbCrLf &_
						 "If Java JDK is installed, you may need to set JAVA_HOME " &_
						 "manually at " & strPathToExileFile & "\bin\jvm.config." & vbCrLf &_
						 "Click YES to read instructions how to do that, or NO to exit this script." & vbCrLf & vbCrLf &_
						 "Command Executed:" & vbCrLf & "(" & strFolder & "\exec.bat) " & vbCrLf & vbCrLf &_
						 strExec,20,"Build failed.")
	
	If strResponse = vbYes Then
		objWSShell.Run "iexplore.exe http://stackoverflow.com/questions/3364623/flexsdk-to-compile-mxml-file"
	Else
		WScript.Quit
	End If
End If

Function IsValue(obj)
    ' Check whether a value has been returned.
    Dim tmp
    On Error Resume Next
    tmp = " " & obj
    If Err <> 0 Then
        IsValue = False
    Else
        IsValue = True
    End If
    On Error GoTo 0
End Function

' http://stackoverflow.com/questions/2942554/vbscript-adding-quotes-to-a-string
Function Quotes(strQuotes)
	Quotes = chr(34) & strQuotes & chr(34)
End Function 