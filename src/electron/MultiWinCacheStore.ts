import MultiWinStore from "../MultiWinStore";
import ElectronWindowState, { IWinState } from "./ElectronWindowState";
import { app, BrowserWindow, screen } from "electron";
import IStorage from "../storage/IStorage";
import { IWinProps, IWinParams } from "../mainClientTypes";

export class WindowManager {
  windows: Array<{ clientId: string; window: BrowserWindow }> = [];
  winHandler: any;
  winSize = 1;

  constructor(winHandler: MultiWinCacheStore) {
    this.windows = [];
    this.winHandler = winHandler;
    app.whenReady().then(() => this.ensureWindows());
    // this.ensureWindows();
  }

  genClientId() {
    let clientId = "win" + Math.floor(Math.random() * 10000);
    return clientId;
  }

  createWin(clientId: string) {
    return this.winHandler.createNativeWindow(clientId, "empty", undefined, { show: false });
  }

  ensureWindows() {
    if (!this.windows) {
      return;
    }
    while (this.windows.length < this.winSize) {
      let clientId = this.genClientId();
      this.windows.push({ clientId, window: this.createWin(clientId) });
    }
  }

  getWin(): { clientId: string; window: BrowserWindow } | undefined {
    if (!this.windows) {
      return undefined;
    }
    let winInfo = this.windows.shift();
    this.ensureWindows();
    return winInfo;
  }

  dispose() {
    this.windows.forEach(({ window }) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
    this.windows = [];
  }
}

interface IClientCacheInfo {
  parentId?: string | null;
  winId: string;
  name?: string;
  groups?: string[];
  path?: string;
  winState?: IWinState;
  [key: string]: any;
}

class MultiWinCacheStore extends MultiWinStore {
  clientInfoMap: { [winId: string]: IClientCacheInfo } = {};
  willQuit = false;
  windowManager?: WindowManager;
  _storage?: IStorage;

  init() {
    this.loadClients();
  }

  loadClients() {
    this.willQuit = false;
    let clients = this.getStorage()!.get("clients");
    if (!clients || clients.length === 0) {
      clients = this.getDefaultClients();
    }

    if (!this.windowManager) {
      this.windowManager = new WindowManager(this);
    }

    app.whenReady().then(() => {
      clients.forEach((item: IClientCacheInfo) => {
        this.createWinForClientId(
          { path: item.path, groups: item.groups, name: item.name, parentId: item.parentId },
          item.winId,
          item.winState!
        );
      });
    });
  }

  saveClients() {
    if (this.willQuit) {
      return;
    }
    let clients = this.clientIds.map(id => ({
      winId: id,
      ...this.clientInfoMap[id],
      name: this.clientIdNameMap[id],
      groups: this.groupsMap[id],
    }));
    this.getStorage()!.set("clients", clients);
  }

  getDefaultClients(): IClientCacheInfo[] {
    return [{ winId: "mainClient", path: "/", name: "mainClient", groups: ["main"], winState: { isMaximized: true } }];
  }

  getStorage(): IStorage {
    // console.error("You need inherit MultiWinCacheStore and implement getStorage");
    if (!this._storage) {
      let Storage = require("../storage").default;
      this._storage = new Storage("1.0");
    }
    return this._storage!;
  }

  _removeClientId(clientId: string) {
    super._removeClientId(clientId);
    delete this.clientInfoMap[clientId];
  }

  handleDidCloseWin(winId: string) {}

  saveWinState(clientId: string, winState: IWinState) {
    this.clientInfoMap[clientId].winState = winState;
    // this.saveClients();
  }

  createWinForClientId(winProps: IWinProps, clientId: string, params: IWinParams): string | null {
    return this._createElectronWin(winProps, clientId, params);
  }

  createWin(winProps: IWinProps | string, params: IWinParams): string | null {
    return this._createWinForElectron(winProps, params);
  }

  _createWinForElectron(winProps: IWinProps | string, params: IWinParams): string | null {
    winProps = this._parseWinProps(winProps);
    let parentClientId = winProps.parentId;

    if (params && params.x == null && params.y == null) {
      params.width = params.width || 800;
      params.height = params.height || 600;
      if (parentClientId && this.multiWinSaver.getWinInfo(parentClientId)) {
        let window = this.multiWinSaver.getWinInfo(parentClientId).window as BrowserWindow;
        // let window = (this._appStore as any).mainClient.getWindowByClientId(parentClientId);
        let bounds = params.useContentSize ? window.getContentBounds() : window.getBounds();
        params.x = Math.floor(bounds.x + bounds.width / 2 - params.width / 2);
        params.y = Math.floor(bounds.y + bounds.height / 2 - params.height / 2);
      } else {
        let screenSize = screen.getPrimaryDisplay().size;
        params.x = Math.floor(screenSize.width / 2 - params.width / 2);
        params.y = Math.floor(screenSize.height / 2 - params.height / 2);
      }
    }
    let clientId = null;
    try {
      clientId = this._createElectronWin(winProps, null, params);
    } catch (err) {
      console.error(err, err.stack);
    }
    return clientId;
  }

  _createElectronWin(url: string | IWinProps, clientId: string | null, params: IWinState): string | null {
    if (clientId && this.clientIds.indexOf(clientId) !== -1) {
      return null;
    }
    let winProps = this._parseWinProps(url);
    let winState = new ElectronWindowState(null, params, null);
    let parentId: string | null | undefined = winProps.parentId;

    let winInfo = this._getElectronWinFromCache(winProps.path!, clientId, parentId, winState.state);
    if (!clientId) {
      clientId = winInfo.clientId;
    }

    this._addWinProps(clientId, winProps);
    let win = winInfo.win;

    this.clientInfoMap[clientId] = { winId: clientId, winState: winState.state, ...winProps };

    winState.onSave = state => {
      this.saveWinState(clientId!, state);
    };
    // this.clientStateMap[clientId] = winState.state;

    winState.manage(win);

    this.saveClients(); // Save clients into Storage
    win.on("closed", this.handleClosed.bind(this, clientId));

    return clientId;
  }

  _getElectronWinFromCache(
    url: string,
    clientId: string | null,
    parentId: string | null | undefined,
    params: IWinParams
  ) {
    // return createMainWindow(url, clientId, params);
    let win: BrowserWindow;
    if (clientId) {
      win = this.createMainWindow(url, clientId, parentId, params);
    } else {
      let winInfo = this.windowManager!.getWin();
      if (!winInfo) {
        clientId = this._genClientId();
        win = this.createMainWindow(url, clientId, parentId, params);
      } else {
        clientId = winInfo.clientId;
        win = winInfo.window;

        this.mainClient.changeWin(this.multiWinSaver.getWinInfo(clientId), { path: url, parentId }, params);
      }
    }
    return { clientId, win };
  }

  createNativeWindow(
    clientId: string,
    url = "empty",
    parentId: string | null | undefined,
    params: IWinParams
  ): BrowserWindow {
    if (params == null) {
      params = {
        x: 0,
        y: 0,
        width: 1280,
        height: 800,
        useContentSize: true,
        webPreferences: {
          nodeIntegration: true,
        },
      };
    }
    return this.mainClient.createWin(clientId, { path: url, parentId }, params);
  }

  createMainWindow(url: string, clientId: string, parentId: string | null | undefined, params: any = {}) {
    let window = this.createNativeWindow(clientId, url, parentId, params);
    window.on("ready-to-show", () => {
      window.show();
    });
    return window;
  }

  handleClosed(clientId: string) {
    if (clientId === "mainClient") {
      this.saveClients();
      this.willQuit = true;
    }
    this.handleDidCloseWin && this.handleDidCloseWin(clientId!);
    this._removeClientId(clientId!);
    if (!this.willQuit) {
      this.saveClients();
    }
    if (clientId === "mainClient") {
      this.closeAllWindows();
    }
  }

  changeWinProps(clientId: string, winProps: IWinProps): void {
    this.clientInfoMap[clientId] = { ...this.clientInfoMap[clientId], ...winProps };
    this.saveClients();
  }

  closeAllWindows() {
    super.closeAllWindows();
    // Dispose the windowManager to destroy the hide windows.
    if (this.windowManager) {
      this.windowManager.dispose();
      this.windowManager = undefined;
    }
  }
}

export default MultiWinCacheStore;
