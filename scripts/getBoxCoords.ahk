; mouse_capture.ahk
CoordMode, Mouse, Screen  ; Set coordinates to screen-relative

; Wait for left mouse button down
KeyWait, LButton, D
MouseGetPos, x1, y1
KeyWait, LButton, U
KeyWait, LButton, D
MouseGetPos, x2, y2
KeyWait, LButton, U

; Output coordinates to stdout
FileAppend, %x1% %y1% %x2% %y2%, *