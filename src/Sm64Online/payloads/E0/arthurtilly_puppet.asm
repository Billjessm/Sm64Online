.n64
.create "0x370078.bin",0
.headersize 0x80370078

// 0x80370000 - start of pointer list (0x78 bytes of free space)
// 0x80370078 - end of pointer list

// list has 8 bytes for each object: 4 bytes for cmd followed by 4 bytes for pointer

// PUPPET BEHAVIOR - insert at 0x80370078
// 37003C: 00 00 00 00
// 370040: 10 05 00 00
// 370044: 11 01 00 01
// 370048: 23 00 00 00 00 25 00 A0 <-collision cylinder (same size as mario)
// 370050: 08 00 00 00
// stuff might go in here in future
// 370054: 09 00 00 00

// ideally leave some space here incase behavior needs to be made bigger
// main func: (call once every frame)
.org 0x80370078
ADDIU SP, SP, 0xFFD0
SW RA, 0x2C(SP)
SW S1, 0x1C(SP) // currobj
SW S0, 0x18(SP) // list pointer
LUI S0, 0x8037
ADDIU S0, S0, 0x0 // beginning of objpointer list

loopend: // for i = 0

LW S1, 0x0(S0) // S1 = curr object command

ORI AT, R0, 0x1
BNE S1, AT, if2 // if cmd == 1
NOP
LUI A3, 0x0037
ADDIU A3, A3, 0x003C // A3 = 0x00370078 (segmented bhv address) (can change this to 0x1300xxxx for normal behaviors)
ORI A2, R0, 0x0 // A2 = model (change this)
LUI A0, 0x8036
JAL 0x8029ED20 // spawn_object_at_origin()
ADDIU A0, A0, 0x1158 // A0 = gMarioObject (parent, dunno if this matters)
SW V0, 0x4(S0) // save object to list
B ifend
NOP

if2:
ORI AT, R0, 0x2
BNE S1, AT, if3 // if cmd == 2
NOP
JAL 0x802A0568 // mark_object_for_deletion()
LW A0, 0x4(S0) // A0 = object
SW R0, 0x0(S0) // curr obj cmd = 0;
B ifend
NOP

if3:
BEQZ S1, ifend // if cmd != 0
NOP

// collision stuff probably

ifend:
ADDIU S0, S0, 8 // i++
LUI T0, 0x8037
ADDIU T0, T0, 0x0078 // end of list
BNE T0, S0, loopend // check if end has been reached
NOP

LW S1, 0x1C(SP)
LW S0, 0x18(SP)
LW RA, 0x2C(SP)
JR RA
ADDIU SP, SP, 0x30
.close