import { Log, Logger } from "../utils/loggerApply";
import { renderDispatchName, renderRegisterName, messageName, winMessageName } from "../constants";
import { ipcMain, WebContents, BrowserWindow, Event } from "electron";
import MultiWinSaver from "../MultiWinSaver";
import { IWinInfo, IMainClientCallback, IMainClient, IWinParams, IWinProps } from "../mainClientTypes";

interface IElectronWinInfo {
  webContents: WebContents;
  window: BrowserWindow;
  winId: string;
}

function encodeUrl(obj: any) {
  let compList: string[] = [];
  for (let key in obj) {
    compList.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}}`);
  }
  return compList.join("&");
}

export default class ElectronMainClient implements IMainClient {
  multiWinSaver: MultiWinSaver;
  mainClientCallback: IMainClientCallback;
  log: Log;

  constructor(multiWinSaver: MultiWinSaver, callback: IMainClientCallback, log: Log) {
    this.multiWinSaver = multiWinSaver;
    this.log = log;
    this.mainClientCallback = callback;

    ipcMain.on(renderRegisterName, this.handleRegister);

    ipcMain.on(renderDispatchName, this.handleRendererDispatch);

    ipcMain.on(winMessageName, this.handleWinMessage);

    return this;
  }

  handleWinMessage = (event: Event, clientId: string, data: any) => {
    let sourceWinInfo = this.multiWinSaver.findWinInfo((item: IWinInfo) => item.webContents === event.sender);
    if (sourceWinInfo) {
      let senderId = sourceWinInfo.winId;
      this.mainClientCallback.handleWinMessage(senderId, clientId, data);
    }
  };

  // dispatchToRenderer(clientId: string, payload: any) {
  //   let winInfo: IElectronWinInfo = this.multiWinSaver.getWinInfo(clientId) as IElectronWinInfo;
  //   if (!winInfo) return;
  //   let webContents = winInfo.webContents;

  //   // if (webContents.isDestroyed() || webContents.isCrashed()) {
  //   //   return this.unregisterRenderer(client.clientId);
  //   // }
  //   this._sendForWebContents(webContents, mainDispatchName, payload);
  // }

  // sendWinMsg(clientId: string, message: any) {
  //   let winInfo: IElectronWinInfo = this.multiWinSaver.getWinInfo(clientId) as IElectronWinInfo;
  //   if (!winInfo) return;
  //   let webContents = winInfo.webContents;
  //   this.multiWinSaver.whenRegister(clientId, () => {
  //     this._sendForWebContents(webContents, messageName, message);
  //   })
  // }

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
    const window = new BrowserWindow({
      ...winParams,
      show: false,
      x: Math.floor(winParams.x || 0),
      y: Math.floor(winParams.y || 0),
    });

    let query = { winId, storeDeclarers, state: initStates, ...winProps };
    if (process.env.NODE_ENV === "development") {
      window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?${encodeUrl(query)}`);
      // window.webContents.openDevTools();
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

    if (winParams.show) {
      window.on("ready-to-show", () => {
        window.show();
      });
    }

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

      if (winParams.show) {
        win.show();
      }
    }, 0);
  }

  // Renderer process register self, Then the main process will send the store the initial state to the renderer process
  private handleRegister = (event: Event, { clientId }: { clientId: string }) => {
    this.multiWinSaver.registerWin(clientId);
  };

  // When renderer process dispatch an action to main process, the handleRendererDispatch will invoke
  // The main process will invoke handleRendererMessage to handle the message and
  // send the result back to renderer process
  private handleRendererDispatch = (event: Event, clientId: string, invokeId: string, stringifiedAction: string) => {
    this.mainClientCallback.handleRendererDispatch(clientId, invokeId, stringifiedAction);
  };

  private _sendForWebContents(webContents: WebContents, channel: string, ...args: any[]) {
    if (!webContents.isDestroyed() && !webContents.isCrashed()) {
      webContents.send(channel, ...args);
    }
  }
}
