# OpenADR demo GIF — render with Charm's VHS (https://github.com/charmbracelet/vhs)
#
#   brew install vhs
#   cd assets && vhs demo.tape
#
# Produces demo.gif next to this file. Run it from a scratch directory with
# `openadr` on your PATH, e.g.:
#
#   mkdir -p /tmp/openadr-demo && cd /tmp/openadr-demo && vhs ~/path/to/assets/demo.tape

Output demo.gif

Set FontSize 16
Set Width 1000
Set Height 560
Set Theme "Catppuccin Mocha"
Set Padding 24
Set TypingSpeed 50ms

Type "openadr init"
Sleep 500ms
Enter
Sleep 1200ms

Type "openadr propose \"Use SQLite for session storage\""
Sleep 500ms
Enter
Sleep 1200ms

Type "openadr validate"
Sleep 500ms
Enter
Sleep 1200ms

Type "openadr accept \"Use SQLite for session storage\""
Sleep 500ms
Enter
Sleep 1200ms

Type "openadr list"
Sleep 500ms
Enter
Sleep 1500ms

Sleep 1000ms
