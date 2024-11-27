CoordMode, Mouse, Screen  ; Set coordinates to screen-relative

; Load and set the new cursor
filePath := A_ScriptDir . "\HolographicSight.cur"
try {
    NewCursor := DllCall("LoadCursorFromFile", "Str", filePath, "UPtr")
    if (NewCursor) {
        DllCall("SetSystemCursor", "UPtr", NewCursor, "Int", 32512) ; 32512 = OCR_NORMAL
        DllCall("SetSystemCursor", "UPtr", NewCursor, "Int", 32513) ; 32512 = OCR_NORMAL
        DllCall("SetSystemCursor", "UPtr", NewCursor, "Int", 32514) ; 32512 = OCR_NORMAL
        DllCall("SetSystemCursor", "UPtr", NewCursor, "Int", 32515) ; 32512 = OCR_NORMAL
        DllCall("SetSystemCursor", "UPtr", NewCursor, "Int", 32516) ; 32512 = OCR_NORMAL
        DllCall("SetSystemCursor", "UPtr", NewCursor, "Int", 32517) ; 32512 = OCR_NORMAL
        DllCall("SetSystemCursor", "UPtr", NewCursor, "Int", 32518) ; 32512 = OCR_NORMAL
    }
}

; Wait for left mouse button down and get position
KeyWait, LButton, D
MouseGetPos, x1, y1

; Restore the original cursor
DllCall("SystemParametersInfo", "UInt", 87, "UInt", 0, "UInt", 0, "UInt", 0) ; SPI_SETCURSORS (87)

; Output coordinates to stdout
FileAppend, %x1% %y1%, *

ExitApp
