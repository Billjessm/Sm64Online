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
        this.copyFields.push('col');
        this.copyFields.push('yoff');
        this.copyFields.push('pos');
        this.copyFields.push('rot');
        this.copyFields.push('vis');
    }

    safetyCheck(): number {
        let ret = 0x000000;
        if (this.broken) return ret;

        let ptr: number = this.emulator.dereferencePointer(this.pointer);        
        if (this.emulator.rdramRead32(ptr + 0x0184) !== 0xDEADBEEF) {
            this.broken = true;
            return ret;
        }

        return ptr;
    }

    get anim(): Buffer {
        return Buffer.alloc(0);
    }
    set anim(val: Buffer) {
    }

    get col(): number {
        return 0;
    }
    set col(val: number) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        // Writes collision handled to 0 after every frame
        this.emulator.rdramWrite32(ptr + 0x134, 0x00000000);
    }

    get yoff(): number {
        return 0;
    }
    set yoff(val: number) {
        let ptr: number = this.safetyCheck();
        if (ptr === 0x000000) return;

        // Marks marios height (in case sinking in sand)
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
