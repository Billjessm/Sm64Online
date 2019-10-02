import { Packet, UDPPacket } from 'modloader64_api/ModLoaderDefaultImpls';

export class SyncStorage extends Packet {
  save_data: Buffer = Buffer.alloc(0x70);
  star_count = 0;
  constructor(save_data: Buffer, star_count: number) {
    super('SyncStorage', 'Sm64Online', false);
    this.save_data = save_data;
    this.star_count = star_count;
  }
}

export class SyncBuffered extends Packet {
  value: Buffer;
  constructor(header: string, value: Buffer, persist: boolean) {
    super(header, 'Sm64Online', persist);
    this.value = value;
  }
}

export class SyncPointedBuffer extends Packet {
  address: number;
  data: Buffer;
  constructor(header: string, address: number, data: Buffer, persist: boolean) {
    super(header, 'Sm64Online', persist);
    this.address = address;
    this.data = data;
  }
}

export class SyncNumber extends Packet {
  value: number;
  constructor(header: string, value: number, persist: boolean) {
    super(header, 'Sm64Online', persist);
    this.value = value;
  }
}