import { Emitter, Disposable } from 'event-kit';
import { IWinInfo } from "./mainClientTypes";

export default class MultiWinSaver {
  winInfos: IWinInfo[] = [];
  winIdMap: { [key: string]: IWinInfo } = {};
  registerIds: Set<string> = new Set<string>();
  emitter: Emitter = new Emitter();

  addWin(winInfo: IWinInfo): void {
    this.winInfos.push(winInfo);
    this.winIdMap[winInfo.winId] = winInfo;
    this.emitter.emit("did-add-win", winInfo.winId);
  }

  onDidAddWin(callback: (winId: string) => any) {
    return this.emitter.on("did-add-win", callback);
  }

  deleteWin(winId: string): void {
    let winInfo = this.winIdMap[winId];
    let index = this.winInfos.indexOf(winInfo);
    if (index !== -1) {
      this.winInfos.splice(index, 1);
    }
    this.emitter.emit("did-delete-win", winId);
  }

  onDidDeleteWin(callback: (winId: string) => any) {
    return this.emitter.on("did-delete-win", callback);
  }

  getWinInfo(winId: string) {
    return this.winIdMap[winId];
  }

  findWinInfo(callback: (winInfo: IWinInfo) => boolean): IWinInfo | undefined {
    return this.winInfos.find(callback);
  }

  registerWin(winId: string) {
    this.registerIds.add(winId);
    this.emitter.emit("did-register", winId);
  }

  isRegister(winId: string) {
    return this.registerIds.has(winId);
  }

  whenRegister(winId: string, callback: () => void): void {
    if (this.isRegister(winId)) {
      return callback();
    }
    let disposable: Disposable | undefined;
    const onRegister = (nowId: string) => {
      if (winId === nowId) {
        callback();
        disposable!.dispose();
        disposable = undefined;
      }
    };

    disposable = this.emitter.on("did-register", onRegister);
  }
}