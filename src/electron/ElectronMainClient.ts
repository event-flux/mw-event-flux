import { Log, Logger } from "../utils/loggerApply";
import {
  renderDispatchName,
  renderRegisterName,
  winMessageName,
  renderDispatchNoReturnName,
  renderRequestStoreName,
  renderReleaseStoreName,
  renderMapRequestStoreName,
  renderMapReleaseStoreName,
  renderDispatchObserve,
  renderDispatchDispose,
} from "../constants";
import { ipcMain, WebContents, BrowserWindow, Event } from "electron";
import MultiWinSaver from "../MultiWinSaver";
import { IWinInfo, IMainClientCallback, IMainClient, IWinParams, IWinProps } from "../mainClientTypes";
import { encodeQuery } from "../utils/queryHandler";

interface IElectronWinInfo {
  webContents: WebContents;
  window: BrowserWindow;
  winId: string;
}

export default class ElectronMainClient implements IMainClient {
  multiWinSaver: MultiWinSaver;
  mainClientCallback: IMainClientCallback;
  log?: Log;

  constructor(multiWinSaver: MultiWinSaver, callback: IMainClientCallback, log?: Log) {
    this.multiWinSaver = multiWinSaver;
    this.mainClientCallback = callback;
    this.log = log;

    ipcMain.on(renderDispatchName, (event: Event, clientId: string, invokeId: string, args: string) => {
      this.mainClientCallback.handleRendererDispatch(clientId, invokeId, args);
    });
    ipcMain.on(renderDispatchNoReturnName, (event: Event, clientId: string, args: string) => {
      this.mainClientCallback.handleRendererDispatchNoReturn(clientId, args);
    });
    ipcMain.on(renderDispatchObserve, (event: Event, clientId: string, invokeId: string, method: any) => {
      this.mainClientCallback.handleRendererDispatchObserve(clientId, invokeId, method);
    });
    ipcMain.on(renderDispatchDispose, (event: Event, clientId: string, invokeId: string) => {
      this.mainClientCallback.handleRendererDispatchDispose(clientId, invokeId);
    });
    ipcMain.on(renderRequestStoreName, (event: Event, clientId: string, storeKeys: string[]) => {
      this.mainClientCallback.handleRequestStores(clientId, storeKeys);
    });
    ipcMain.on(renderReleaseStoreName, (event: Event, clientId: string, storeKeys: string[]) => {
      this.mainClientCallback.handleReleaseStores(clientId, storeKeys);
    });
    ipcMain.on(renderMapRequestStoreName, (event: Event, clientId: string, storeKey: string, mapKeys: string[]) => {
      this.mainClientCallback.handleMapRequestStores(clientId, storeKey, mapKeys);
    });
    ipcMain.on(renderMapReleaseStoreName, (event: Event, clientId: string, storeKey: string, mapKeys: string[]) => {
      this.mainClientCallback.handleMapReleaseStores(clientId, storeKey, mapKeys);
    });
    ipcMain.on(winMessageName, (event: Event, senderId: string, clientId: string, data: string) => {
      this.mainClientCallback.handleWinMessage(senderId, clientId, data);
    });

    ipcMain.on(renderRegisterName, (event: Event, clientId: string) => {
      this.mainClientCallback.handleRegisterWin(clientId);
    });
  }

  sendWinMsg(winInfo: IWinInfo, msgName: string, ...args: any[]): void {
    this._sendForWebContents(winInfo.webContents, msgName, ...args);
  }

  activeWin(winInfo: IWinInfo) {
    let win = (winInfo as IElectronWinInfo).window;
    if (win) {
      win.moveTop();
      // win && win.minimize();
      win.focus();
    }
  }

  createWin(winId: string, winProps: IWinProps, winParams: IWinParams) {
    let storeDeclarers = this.mainClientCallback.getStoreDeclarers();
    let initStates = this.mainClientCallback.getInitStates(winId);
    let rs = this.mainClientCallback.getRecycleStrategy();

    const window = new BrowserWindow({
      webPreferences: {
        nodeIntegration: true,
      },
      ...winParams,
      show: false,
    });

    let query = { winId, storeDeclarers, state: initStates, rs, ...winProps };
    if (process.env.NODE_ENV === "development") {
      window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?${encodeQuery(query)}`);
      window.webContents.openDevTools();
    } else {
      window.loadURL(
        require("url").format({
          pathname: require("path").join(__dirname, "index.html"),
          protocol: "file",
          slashes: true,
          query,
        })
      );
    }

    if (winParams.show || winParams.show === undefined) {
      window.on("ready-to-show", () => {
        window.show();
      });
    }

    window.on("closed", () => {
      this.multiWinSaver.deleteWin(winId);
    });
    this.multiWinSaver.addWin({ winId, window, webContents: window.webContents });
    return window;
  }

  changeWin(winInfo: IWinInfo, winProps: IWinProps, winParams: IWinParams): void {
    this.mainClientCallback.initWin(winInfo.winId, winProps);

    let setBoundsFunc: "setContentBounds" | "setBounds" = winParams.useContentSize ? "setContentBounds" : "setBounds";

    let win = winInfo.window as BrowserWindow;
    let x = Math.floor(winParams.x || 0);
    let y = Math.floor(winParams.y || 0);
    let width = Math.floor(winParams.width || 800),
      height = Math.floor(winParams.height || 600);
    if (winParams.minWidth && winParams.minHeight) {
      win.setMinimumSize(Math.floor(winParams.minWidth), Math.floor(winParams.minHeight));
    }
    if (winParams.maxWidth && winParams.maxHeight) {
      win.setMaximumSize(Math.floor(winParams.maxWidth), Math.floor(winParams.maxHeight));
    }
    if (winParams.title) {
      win.setTitle(winParams.title);
    }
    win[setBoundsFunc]({ x, y, width, height });

    win[setBoundsFunc]({ x, y, width, height });

    setTimeout(() => {
      win[setBoundsFunc]({ x, y, width, height });

      if (winParams.show) {
        win.show();
      }
    }, 0);
  }

  closeWin(winInfo: IWinInfo) {
    winInfo.window.close();
  }

  private _sendForWebContents(webContents: WebContents, channel: string, ...args: any[]) {
    if (!webContents.isDestroyed() && !webContents.isCrashed()) {
      webContents.send(channel, ...args);
    }
  }
}
