import {
  EventsClient,
  EventServerJoined,
  EventServerLeft,
  EventHandler,
  EventsServer,
} from 'modloader64_api/EventHandler';
import { IModLoaderAPI, IPlugin } from 'modloader64_api/IModLoaderAPI';
import {
  ILobbyStorage,
  INetworkPlayer,
  LobbyData,
  NetworkHandler,
  ServerNetworkHandler,
} from 'modloader64_api/NetworkHandler';
import { InjectCore } from 'modloader64_api/CoreInjection';
import { LobbyVariable } from 'modloader64_api/LobbyVariable';
import { Packet } from 'modloader64_api/ModLoaderDefaultImpls';
import * as API from 'modloader64_api/SM64/Imports';
import * as Net from './network/Imports';

export class Sm64Online implements IPlugin {
  ModLoader = {} as IModLoaderAPI;
  name = 'Sm64Online';

  @InjectCore() core!: API.ISM64Core;

  // Storage Variables
  @LobbyVariable('Sm64Online:storage')
  sDB = new Net.DatabaseServer();
  cDB = new Net.DatabaseClient();
  
  // Helpers
  protected curScene: number = -1;

  handle_scene_change(scene: number) {
    if (scene === this.curScene) return;
    
    // Set global to current scene value
    this.curScene = scene;

    this.ModLoader.clientSide.sendPacket(new Net.SyncNumber("SyncScene", scene, true));
    this.ModLoader.logger.info('Moved to scene[' + scene + '].');
  }

  handle_save_flags(bufData: Buffer, bufStorage: Buffer, profile: number) {    
    // Initializers
    let pData: Net.SyncBuffered;
    let i: number;
    let count: number;
    let needUpdate = false;

    bufData = this.core.save[profile].get_all();
    bufStorage = this.cDB.save_data;
    count = bufData.byteLength;
    needUpdate = false;

    for (i = 0; i < count; i++) {
      if (bufData[i] === bufStorage[i]) continue;
      
      bufData[i] |= bufStorage[i];
      this.core.save[profile].set(i, bufData[i]);
      needUpdate = true;
    }
        
    // Send Changes to Server
    if (!needUpdate) return; 
    this.cDB.save_data = bufData;
    pData = new Net.SyncBuffered('SyncSaveFile', bufData, false);
    this.ModLoader.clientSide.sendPacket(pData);   
  }

  handle_star_count() {
    // Initializers
    let pData: Net.SyncNumber;
    let val: number;
    let valDB: number;
    let needUpdate = false;

    val = this.core.runtime.star_count;
    valDB = this.cDB.star_count;

    // Detect Changes
    if (val === valDB) return;

    // Process Changes
    if (val > valDB) {
      this.cDB.star_count = val;
      needUpdate = true;
    } else {
      this.core.runtime.star_count = valDB;
    }
    
    // Send Changes to Server
    if (!needUpdate) return;    
    pData = new Net.SyncNumber('SyncStarCount', val, false);
    this.ModLoader.clientSide.sendPacket(pData);
  }

  constructor() {}

  preinit(): void {}

  init(): void {}

  postinit(): void {}

  onTick(): void {
    if (!this.core.mario.exists) return;

    // Initializers
    let profile: number = this.core.runtime.get_current_profile();
    let scene: number = this.core.runtime.get_current_scene();
    let bufStorage: Buffer;
    let bufData: Buffer;
    
    // General Setup/Handlers
    this.handle_scene_change(scene);

    // Progress Flags Handlers
    this.handle_save_flags(bufData!, bufStorage!, profile);
    this.handle_star_count();
  }

  @EventHandler(EventsClient.ON_INJECT_FINISHED)
  onClient_InjectFinished(evt: any) {}

  @EventHandler(EventsServer.ON_LOBBY_CREATE)
  onServer_LobbyCreate(storage: ILobbyStorage) {
    this.sDB = new Net.DatabaseServer();
  }

  @EventHandler(EventsClient.ON_LOBBY_JOIN)
  onClient_LobbyJoin(lobby: LobbyData): void {
    this.cDB = new Net.DatabaseClient();    
    let pData = new Packet('Request_Storage', 'Sm64Online', false);
    this.ModLoader.clientSide.sendPacket(pData);
  }

  @EventHandler(EventsServer.ON_LOBBY_JOIN)
  onServer_LobbyJoin(evt: EventServerJoined) {}

  @EventHandler(EventsServer.ON_LOBBY_LEAVE)
  onServer_LobbyLeave(evt: EventServerLeft) {
    let lobbyStorage = this.ModLoader.lobbyManager.getLobbyStorage(evt.lobby);
    if (lobbyStorage === null) return;
    let storage = lobbyStorage.data['Sm64Online:storage'].sDB as Net.DatabaseServer;
  }

  @EventHandler(EventsClient.ON_SERVER_CONNECTION)
  onClient_ServerConnection(evt: any) {}

  @EventHandler(EventsClient.ON_PLAYER_JOIN)
  onClient_PlayerJoin(nplayer: INetworkPlayer) {}

  @EventHandler(EventsClient.ON_PLAYER_LEAVE)
  onClient_PlayerLeave(nplayer: INetworkPlayer) {}

  // #################################################
  // ##  Server Receive Packets
  // #################################################

  @ServerNetworkHandler('Request_Storage')
  onServer_RequestStorage(packet: Packet): void {
    this.ModLoader.logger.info('[Server] Sending: {Lobby Storage}');
    let pData = new Net.SyncStorage(
      this.sDB.save_data,
      this.sDB.star_count
    );
    this.ModLoader.serverSide.sendPacketToSpecificPlayer(pData, packet.player);
  }

  @ServerNetworkHandler('SyncSaveFile')
  onServer_SyncSaveFile(packet: Net.SyncBuffered) {
    this.ModLoader.logger.info('[Server] Received: {Save File}');
    let data: Buffer = this.sDB.save_data;
    let count: number = data.byteLength;
    let i = 0;
    let needUpdate = false;
    for (i = 0; i < count; i++) {
      if (data[i] === packet.value[i]) continue;
      data[i] |= packet.value[i];
      needUpdate = true;
    }
    if (needUpdate) {
      this.sDB.save_data = data;
      let pData = new Net.SyncBuffered('SyncSaveFile', data, true);
      pData.lobby = packet.lobby; // temporary
      this.ModLoader.serverSide.sendPacket(pData);
      this.ModLoader.logger.info('[Server] Updated: {Save File}');
    }
  }

  @ServerNetworkHandler('SyncStarCount')
  onServer_SyncStarCount(packet: Net.SyncNumber) {
    this.ModLoader.logger.info('[Server] Received: {Star Count}');
    let data: number = this.sDB.star_count;
    if (data >= packet.value) return;
    this.sDB.star_count = packet.value;
    let pData = new Net.SyncNumber('SyncStarCount', packet.value, true);
    this.ModLoader.serverSide.sendPacket(pData);
    this.ModLoader.logger.info('[Server] Updated: {Star Count}');
  }

  @ServerNetworkHandler('SyncScene')
  onServer_SyncScene(packet: Net.SyncNumber) {
    let pMsg = 'Player[' + packet.player.nickname + ']';
    let sMsg = 'Scene[' + packet.value + ']';
    this.ModLoader.logger.info('[Server] Received: {Player Scene}');
    this.ModLoader.logger.info('[Server] Updated: ' + pMsg + ' to ' + sMsg);
  }

  // #################################################
  // ##  Client Receive Packets
  // #################################################

  @NetworkHandler('SyncStorage')
  onClient_SyncStorage(packet: Net.SyncStorage): void {
    this.ModLoader.logger.info('[Client] Received: {Lobby Storage}');
    this.cDB.save_data = packet.save_data;
    this.cDB.star_count = packet.star_count;
  }

  @NetworkHandler('SyncSaveFile')
  onClient_SyncSaveFile(packet: Net.SyncBuffered) {
    this.ModLoader.logger.info('[Client] Received: {Save File}');
    let data: Buffer = this.cDB.save_data;
    let count: number = data.byteLength;
    let i = 0;
    let needUpdate = false;
    for (i = 0; i < count; i++) {
      if (data[i] === packet.value[i]) continue;
      data[i] |= packet.value[i];
      needUpdate = true;
    }
    if (needUpdate) {
      this.cDB.save_data = data;
      this.ModLoader.logger.info('[Client] Updated: {Save File}');
    }
  }

  @NetworkHandler('SyncStarCount')
  onClient_SyncStarCount(packet: Net.SyncNumber) {
    this.ModLoader.logger.info('[Client] Received: {Star Count}');
    let data: number = this.cDB.star_count;
    if (data >= packet.value) return;
    this.cDB.star_count = packet.value;
    this.ModLoader.logger.info('[Client] Updated: {Star Count}');
  }

  @NetworkHandler('Request_Scene')
  onClient_RequestScene(packet: Packet) {
    let pData = new Net.SyncNumber(
      "SyncScene", 
      this.core.runtime.get_current_scene(), 
      false
    );
    this.ModLoader.clientSide.sendPacketToSpecificPlayer(pData, packet.player);
  }

  @NetworkHandler('SyncScene')
  onClient_SyncScene(packet: Net.SyncNumber) {
    let pMsg = 'Player[' + packet.player.nickname + ']';
    let sMsg = 'Scene[' + packet.value + ']';
    this.ModLoader.logger.info('[Client] Received: {Player Scene}');
    this.ModLoader.logger.info('[Client] Updated: ' + pMsg + ' to ' + sMsg);
  }
}