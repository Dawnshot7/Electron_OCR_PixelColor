; Define the input variable (pass the first argument when running the script)
arg1 = %1%  ; Retrieve the argument passed to the script

; Convert special key words to AHK key names
StringReplace, arg1, arg1, enter, {Enter}, All
StringReplace, arg1, arg1, space, {Space}, All
StringReplace, arg1, arg1, tab, {Tab}, All
StringReplace, arg1, arg1, backspace, {Backspace}, All
StringReplace, arg1, arg1, delete, {Delete}, All
StringReplace, arg1, arg1, up, {Up}, All
StringReplace, arg1, arg1, down, {Down}, All
StringReplace, arg1, arg1, left, {Left}, All
StringReplace, arg1, arg1, right, {Right}, All
StringReplace, arg1, arg1, home, {Home}, All
StringReplace, arg1, arg1, end, {End}, All
StringReplace, arg1, arg1, pgup, {PgUp}, All
StringReplace, arg1, arg1, pgdn, {PgDn}, All
StringReplace, arg1, arg1, esc, {Esc}, All
StringReplace, arg1, arg1, f1, {F1}, All
StringReplace, arg1, arg1, f2, {F2}, All
; Add more key replacements as needed

; Send the processed input
SendInput, %arg1%

; Return success code via stdout
FileAppend, 1, *

; Exit the script
ExitApp

