@echo off
Set dir=%~dp0
REM flex_dir received by VBScript
Set flex_dir=%~1

if [%flex_dir%] EQU [] (
  echo Please do not call this file directly! Use build.vbs
	pause
	exit
)

"%flex_dir%\bin\mxmlc.exe" -source-path "%dir%\src" -optimize -use-resource-bundle-metadata -show-actionscript-warnings -show-binding-warnings -show-unused-type-selector-warnings -strict -accessible=false -use-network -static-link-runtime-shared-libraries -output "%dir:~0,-20%\js\plupload.flash.swf" "%dir%\src\com\plupload\Plupload.as"
pause
