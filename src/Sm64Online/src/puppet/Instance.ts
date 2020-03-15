import IMemory from 'modloader64_api/IMemory';
import * as API from 'SuperMario64/API/Imports';

export class Data extends API.BaseObj implements Data {
    private readonly copyFields: string[] = new Array<string>();
    player: API.IPlayer;
    pointer: number;
    index: number;
    broken: boolean = false;

    constructor(emu: IMemory, pointer: number, player: API.IPlayer, index: number) {
        super(emu);
        this.pointer = pointer;
        this.player = player;
        this.index = index;
        this.copyFields.push('anim');
        this.copyFields.push('fnim');
        this.copyFields.push('col');
        this.copyFields.push('yoff');
        this.copyFields.push('pos');
        this.copyFields.push('rot');
        this.copyFields.push('tlc');
        //this.copyFields.push('vis');
    }

    safetyCheck(): number {
        let ret = 0x000000;
        if (this.broken) return ret;

        let ptr: number = this.emulator.dereferencePointer(this.pointer);        
        if (this.emulator.rdramRead32(ptr + 0x0184) !== 0xDEADBEEF) {
            console.log('info:    [DEADBEEF] Saved the day!');
            this.broken = true;
            return ret;
        }

        return ptr;
    }

    get anim(): Buffer {
        return this.player.animation;
    }
    set anim(val: Buffer) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        // Set anim pointer
        let anim_ptr = 0x804000 + this.index * 0x4000;
        this.emulator.rdramWrite32(ptr + 0x3C, 0x80000000 + anim_ptr);

        // Set anim buffer
        val.writeUInt32BE(val.readUInt32BE(0x0C) + anim_ptr, 0x0C);
        val.writeUInt32BE(val.readUInt32BE(0x10) + anim_ptr, 0x10);
        this.emulator.rdramWriteBuffer(anim_ptr, val);
    }

    get fnim(): Buffer {
        return this.player.animation_frame;
    }
    set fnim(val: Buffer) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        this.emulator.rdramWriteBuffer(ptr + 0x40, val);
    }

    get col(): number {
        return 0;
    }
    set col(val: number) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        this.emulator.rdramWrite32(ptr + 0x134, 0x00000000);
    }

    get yoff(): number {
        return 0;
    }
    set yoff(val: number) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        this.emulator.rdramWrite16(ptr + 0x3A, 0xBD);
    }

    get pos(): Buffer {
        return this.player.position;
    }
    set pos(val: Buffer) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        this.emulator.rdramWriteBuffer(ptr + 0xA0, val);
    }

    get rot(): Buffer {
        return this.player.rotation;
    }
    set rot(val: Buffer) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        this.emulator.rdramWriteBuffer(ptr + 0xD0, val);
    }

    get tlc(): number {
        return this.player.translucency;
    }
    set tlc(val: number) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        this.emulator.rdramWrite32(ptr + 0x17C, val);
    }

    get vis(): boolean {
        return this.player.visible;
    }
    set vis(val: boolean) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        this.emulator.rdramWrite16(ptr + 0x02, val ? 0x21 : 0x20);
    }

    toJSON() {
        const jsonObj: any = {};

        for (let i = 0; i < this.copyFields.length; i++) {
            jsonObj[this.copyFields[i]] = (this as any)[this.copyFields[i]];
        }

        return jsonObj;
    }
}
