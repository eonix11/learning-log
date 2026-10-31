# use-after-free

Date: 2026-10-31

## What I tried
Allocated 16 bytes to `name`, wrote "junaid", freed it.
Then allocated 16 bytes to `other`, wrote "hacker".
Printed `name` again.

## Run
clang uaf.c -o uaf && ./uaf
clang -fsanitize=address -g uaf.c -o uaf && ./uaf

## Output
before free: junaid (0x1016dd320)
other: hacker (0x1016dd320)
after free:  hacker

before free: junaid (0x602000000970)
other: hacker (0x602000000990)
=================================================================
==2810==ERROR: AddressSanitizer: heap-use-after-free on address 0x602000000970 at pc 0x000101256ed0 bp 0x00016f4eabd0 sp 0x00016f4ea360
READ of size 2 at 0x602000000970 thread T0
    #0 0x000101256ecc in printf_common(void*, char const*, char*)+0x804 (libclang_rt.asan_osx_dynamic.dylib:arm64e+0x1eecc)
    #1 0x000101257a84 in printf+0x64 (libclang_rt.asan_osx_dynamic.dylib:arm64e+0x1fa84)
    #2 0x000100914890 in main uaf.c:16
    #3 0x000182bd0d78 in start+0x19f8 (dyld:arm64e+0x31d78)

0x602000000970 is located 0 bytes inside of 16-byte region [0x602000000970,0x602000000980)
freed by thread T0 here:
    #0 0x000101279368 in free+0x7c (libclang_rt.asan_osx_dynamic.dylib:arm64e+0x41368)
    #1 0x00010091483c in main uaf.c:10
    #2 0x000182bd0d78 in start+0x19f8 (dyld:arm64e+0x31d78)

previously allocated by thread T0 here:
    #0 0x000101279274 in malloc+0x78 (libclang_rt.asan_osx_dynamic.dylib:arm64e+0x41274)
    #1 0x000100914800 in main uaf.c:6
    #2 0x000182bd0d78 in start+0x19f8 (dyld:arm64e+0x31d78)

SUMMARY: AddressSanitizer: heap-use-after-free uaf.c:16 in main
Shadow bytes around the buggy address:
  0x602000000680: fa fa 00 00 fa fa 00 00 fa fa 00 00 fa fa 00 00
  0x602000000700: fa fa 00 00 fa fa 00 00 fa fa 00 00 fa fa 00 00
  0x602000000780: fa fa 00 00 fa fa 00 00 fa fa 00 00 fa fa 00 00
  0x602000000800: fa fa 00 00 fa fa 00 00 fa fa 00 00 fa fa 00 00
  0x602000000880: fa fa 00 00 fa fa 00 00 fa fa 00 00 fa fa 00 07
=>0x602000000900: fa fa 00 06 fa fa 00 fa fa fa 00 00 fa fa[fd]fd
  0x602000000980: fa fa 00 00 fa fa fa fa fa fa fa fa fa fa fa fa
  0x602000000a00: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x602000000a80: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x602000000b00: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
  0x602000000b80: fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa fa
Shadow byte legend (one shadow byte represents 8 application bytes):
  Addressable:           00
  Partially addressable: 01 02 03 04 05 06 07 
  Heap left redzone:       fa
  Freed heap region:       fd
  Stack left redzone:      f1
  Stack mid redzone:       f2
  Stack right redzone:     f3
  Stack after return:      f5
  Stack use after scope:   f8
  Global redzone:          f9
  Global init order:       f6
  Poisoned by user:        f7
  Container overflow:      fc
  Array cookie:            ac
  Intra object redzone:    bb
  ASan internal:           fe
  Left alloca redzone:     ca
  Right alloca redzone:    cb
==2810==ABORTING
zsh: abort      ./uaf

## What happened
`other` got the same address that `name` had.
So printing `name` showed "hacker". That's use-after-free.
ASan caught it and pointed to the exact line.

## Doubts
- How can an attacker use this bug in C programs,
  and in languages built on C (like PHP)?

Write-up: https://eonix11.github.io/posts/use-after-free-in-10-lines/