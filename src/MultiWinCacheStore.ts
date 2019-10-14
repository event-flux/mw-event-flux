import MultiWinStore from "./MultiWinStore";
import ElectronWindowState, { IWinState } from "./ElectronWindowState";
import { format as formatUrl } from "url";
import * as path from "path";
import { app, BrowserWindow, screen } from "electron";
import IStorage from "./storage/IStorage";
import { IWinProps, IWinParams } from "./mainClientTypes";

const isDevelopment = process.env.NODE_ENV !== "production";

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
    return this.winHandler.createNativeWindow(clientId);
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
  parentId?: string;
  clientId: string;
  name?: string;
  groups?: string[];
  url: string;
  winState?: IWinState;
}

class MultiWinCacheStore extends MultiWinStore {
  clientInfoMap: { [clientId: string]: IClientCacheInfo } = {};
  willQuit = false;
  windowManager?: WindowManager;

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
          { path: item.url, groups: item.groups, name: item.name },
          item.clientId,
          item.parentId,
          item.winState!
        );
      });
    });
  }

  saveClients() {
    let clients = this.clientIds.map(id => ({
      clientId: id,
      ...this.clientInfoMap[id],
      name: this.clientIdNameMap[id],
      groups: this.groupsMap[id],
    }));
    this.getStorage()!.set("clients", clients);
  }

  getDefaultClients(): IClientCacheInfo[] {
    return [{ clientId: "mainClient", url: "/", winState: { isMaximized: true } }];
  }

  getStorage(): IStorage | null {
    console.error("You need inherit MultiWinCacheStore and implement getStorage");
    return null;
  }

  _removeClientId(clientId: string) {
    super._removeClientId(clientId);
    delete this.clientInfoMap[clientId];
  }

  handleDidCloseWin(winId: string) {}

  closeWin(clientId: string) {
    let win = this.clientWins[clientId] as BrowserWindow;
    if (win && !win.isDestroyed()) {
      win.close();
    }
  }

  saveWinState(clientId: string, winState: IWinState) {
    this.clientInfoMap[clientId].winState = winState;
    this.saveClients();
  }

  // 当要创建的窗口有clientId时
  createWinForClientId(
    winProps: IWinProps,
    clientId: string,
    parentClientId: string | undefined,
    params: IWinParams
  ): string | null {
    return this._createElectronWin(winProps, clientId, parentClientId, params);
  }

  // 创建一个全新的窗口，使用自生成的clientId
  createWin(winProps: IWinProps | string, parentClientId: string, params: IWinParams): string | null {
    return this._createWinForElectron(winProps, parentClientId, params);
  }

  _createWinForElectron(winProps: IWinProps | string, parentClientId: string, params: IWinParams): string | null {
    winProps = this._parseWinProps(winProps);
    if (params && params.x == null && params.y == null) {
      params.width = params.width || 800;
      params.height = params.height || 600;
      if (parentClientId && this.clientWins[parentClientId]) {
        let window = this.clientWins[parentClientId] as BrowserWindow;
        // let window = (this._appStore as any).mainClient.getWindowByClientId(parentClientId);
        let bounds = params.useContentSize ? window.getContentBounds() : window.getBounds();
        params.x = bounds.x + bounds.width / 2 - params.width / 2;
        params.y = bounds.y + bounds.height / 2 - params.height / 2;
      } else {
        let screenSize = screen.getPrimaryDisplay().size;
        params.x = screenSize.width / 2 - params.width / 2;
        params.y = screenSize.height / 2 - params.height / 2;
      }
    }
    let clientId = null;
    try {
      clientId = this._createElectronWin(winProps, null, parentClientId, params);
    } catch (err) {
      console.error(err, err.stack);
    }
    return clientId;
  }

  _createElectronWin(
    url: string | IWinProps,
    clientId: string | null,
    parentId: string | undefined,
    params: IWinState
  ): string | null {
    if (clientId && this.clientIds.indexOf(clientId) !== -1) {
      return null;
    }
    let winProps = this._parseWinProps(url);
    let winState = new ElectronWindowState(null, params, null);

    let winInfo = this._getElectronWinFromCache(winProps.path!, clientId, parentId, winState.state);
    if (!clientId) {
      clientId = winInfo.clientId;
    }
    this.multiWinSaver.addWin({ winId: clientId, window: winInfo.win });

    this._addWinProps(clientId, winProps);
    let win = winInfo.win;

    this.clientInfoMap[clientId] = { url: winProps.path!, clientId, parentId, winState: winState.state };

    winState.onSave = state => {
      this.saveWinState(clientId!, state);
    };
    // this.clientStateMap[clientId] = winState.state;

    winState.manage(win);

    this.saveClients(); // Save clients into Storage

    win.on("closed", this.handleClosed.bind(this, clientId));
    return clientId;
  }

  _getElectronWinFromCache(url: string, clientId: string | null, parentId: string | undefined, params: IWinParams) {
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

        // this._appStore.mainClient.sendMessage(win, { action: 'change-props', url, parentId });
        this.mainClient.changeWin(this.multiWinSaver.getWinInfo(clientId), { path: url, parentId }, {});

        let setBoundsFunc: "setContentBounds" | "setBounds" = params.useContentSize ? "setContentBounds" : "setBounds";

        let x = Math.floor(params.x || 0);
        let y = Math.floor(params.y || 0);
        let width = Math.floor(params.width || 800),
          height = Math.floor(params.height || 600);
        if (params.minWidth && params.minHeight) {
          win.setMinimumSize(Math.floor(params.minWidth), Math.floor(params.minHeight));
        }
        if (params.maxWidth && params.maxHeight) {
          win.setMaximumSize(Math.floor(params.maxWidth), Math.floor(params.maxHeight));
        }
        if (params.title) {
          win.setTitle(params.title);
        }
        win[setBoundsFunc]({
          x,
          y,
          width,
          height,
        });

        win[setBoundsFunc]({
          x,
          y,
          width,
          height,
        });

        setTimeout(() => {
          win[setBoundsFunc]({ x, y, width, height });
          win.show();
        }, 0);
      }
    }
    return { clientId, win };
  }

  createNativeWindow(clientId: string, url = "empty", parentId = "", params: IWinParams) {
    if (params == null) {
      params = {
        x: 0,
        y: 0,
        width: 1280,
        height: 800,
        useContentSize: true,
      };
    }
    const window = new BrowserWindow({
      show: false,
      x: Math.floor(params.x || 0),
      y: Math.floor(params.y || 0),
      width: params.width,
      height: params.height,
      minWidth: params.minWidth || params.width,
      minHeight: params.minHeight || params.height,
      maxWidth: params.maxWidth,
      maxHeight: params.maxHeight,
      title: params.title,
      useContentSize: params.useContentSize,
      ...params,
      webPreferences: {
        nodeIntegration: true,
        ...params.webPreferences,
      },
    });

    if (isDevelopment) {
      window.loadURL(
        `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?url=${url}&clientId=${clientId}&parentId=${parentId}`
      );
      // window.webContents.openDevTools();
    } else {
      window.loadURL(
        formatUrl({
          pathname: path.join(__dirname, "index.html"),
          protocol: "file",
          slashes: true,
          query: { url, clientId, parentId },
        })
      );
    }

    // window.webContents.openDevTools();
    window.webContents.on("devtools-opened", () => {
      window.focus();
      setImmediate(() => {
        window.focus();
      });
    });

    return window;
  }

  createMainWindow(url: string, clientId: string, parentId: string | undefined, params: any = {}) {
    let window = this.createNativeWindow(clientId, url, parentId, params);
    window.on("ready-to-show", () => {
      window.show();
    });
    return window;
  }

  handleCloseMainClient() {
    this.willQuit = true;
    this.closeAllWindows();
  }

  handleClosed(clientId: string) {
    if (clientId === "mainClient") {
      this.handleCloseMainClient();
    }
    this.handleDidCloseWin && this.handleDidCloseWin(clientId!);
    let index = this.clientIds.indexOf(clientId!);
    if (index !== -1) {
      this.clientIds.splice(index, 1);
    }
    if (!this.willQuit) {
      this.saveClients();
    }
    this._removeClientId(clientId!);
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
