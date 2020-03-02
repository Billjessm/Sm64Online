import IMemory from 'modloader64_api/IMemory';
import * as API from 'SuperMario64/API/Imports';

export class Data extends API.BaseObj implements Data {
    private readonly copyFields: string[] = new Array<string>();
    player: API.IPlayer;
    pointer: number;
    broken: boolean = false;

    constructor(emu: IMemory, pointer: number, player: API.IPlayer) {
        super(emu);
        this.pointer = pointer;
        this.player = player;
        // this.copyFields.push('anim');
        this.copyFields.push('pos');
        this.copyFields.push('rot');
    }

    safetyCheck(): number {
        let ret = 0x000000;
        if (this.broken) return ret;

        let ptr: number = this.emulator.dereferencePointer(this.pointer);
        if (ptr === 0x000000) {
            this.broken = true;
            return ret;
        }

        console.log("PLAYER PTR == " + ptr.toString(16));

        // if (this.emulator.rdramRead32(ptr + 0x1c) !== 0xdeadbeef) {
        //     console.log('info:    [DEADBEEF] Saved the day!');
        //     this.broken = true;
        //     return ret;
        // }

        return ptr;
    }

    get anim(): Buffer {
        return this.player.animation;
    }
    set anim(val: Buffer) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        ptr = this.emulator.dereferencePointer(ptr + 0x14);
        if (ptr === 0x000000) {
            this.broken = true;
            return;
        }

        let frame: number = val.readUInt32BE(0);
        let id: number = val.readUInt32BE(4);

        this.emulator.rdramWritePtr32(ptr, 0x14, frame);
        this.emulator.rdramWritePtr32(ptr, 0x10, id);
    }

    get pos(): Buffer {
        return this.player.position;
    }
    set pos(val: Buffer) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        this.emulator.rdramWritePtrBuffer(this.pointer, 0xA0, val);
    }

    get rot(): Buffer {
        return this.player.rotation;
    }
    set rot(val: Buffer) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        this.emulator.rdramWritePtrBuffer(this.pointer, 0xD0, val);
    }

    toJSON() {
        const jsonObj: any = {};

        for (let i = 0; i < this.copyFields.length; i++) {
            jsonObj[this.copyFields[i]] = (this as any)[this.copyFields[i]];
        }

        return jsonObj;
    }
}
