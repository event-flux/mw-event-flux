import { Log, Logger } from "../utils/loggerApply";
import IErrorObj from "../IErrorObj";
import { 
  mainInitName, mainDispatchName, mainReturnName, renderDispatchName, renderRegisterName, messageName, winMessageName
} from '../constants';
import { ipcMain, WebContents, BrowserWindow, Event } from 'electron';
import findIndex from '../utils/findIndex';
import MultiWinSaver, { IWinInfo } from "../MultiWinSaver";

interface IElectronWinInfo {
  webContents: WebContents;
  window: BrowserWindow;
  winId: string;
};

interface IMainClient {
  sendWinMsg(winInfo: IWinInfo, msgName: string, ...args: any[]): void;
}

interface IMainClientCallback {
  handleRendererDispatch(winId: string, invokeId: string, stringifiedAction: string): void;

  handleWinMessage(senderId: string, targetId: string, data: any): void;

  getStoreDeclarers(): string;

  getInitStates(clientId: string): any;
}

function encodeUrl(obj: any) {
  let compList: string[] = [];
  for (let key in obj) {
    compList.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}}`);
  }
  return compList.join('&');
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

  // Renderer process register self, Then the main process will send the store the initial state to the renderer process
  private handleRegister = (event: Event, { clientId }: { clientId: string }) => {
    this.multiWinSaver.registerWin(clientId);
  };

  // When renderer process dispatch an action to main process, the handleRendererDispatch will invoke
  // The main process will invoke handleRendererMessage to handle the message and send the result back to renderer process
  private handleRendererDispatch = (event: Event, clientId: string, invokeId: string, stringifiedAction: string) => {
    this.mainClientCallback.handleRendererDispatch(clientId, invokeId, stringifiedAction);
  };

  handleWinMessage = (event: Event, clientId: string, data: any) => {
    let sourceWinInfo = this.multiWinSaver.findWinInfo((item: IWinInfo) => item.webContents === event.sender);
    if (sourceWinInfo) {
      let senderId = sourceWinInfo.winId;
      this.mainClientCallback.handleWinMessage(senderId, clientId, data);
    }
  };
 

  private _sendForWebContents(webContents: WebContents, channel: string, ...args: any[]) {
    if (!webContents.isDestroyed() && !webContents.isCrashed()) {
      webContents.send(channel, ...args);
    }
  }
 
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

  createWin(winId: string, url: string, parentId: string | undefined, params: any) {
    let storeDeclarers = this.mainClientCallback.getStoreDeclarers();
    let initStates = this.mainClientCallback.getInitStates(winId);
    const window = new BrowserWindow({
      ...params,
      show: false,
      x: Math.floor(params.x || 0), y: Math.floor(params.y || 0),
    });

    let query = { url: url, winId: winId, parentId, storeDeclarers, state: initStates };
    if (process.env.NODE_ENV === "development") {
      window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}?${encodeUrl(query)}`);
      // window.webContents.openDevTools();
    } else {
      window.loadURL(require('url').format({
        pathname: require('path').join(__dirname, 'index.html'),
        protocol: 'file',
        slashes: true,
        query: query,
      }));
    }

    if (params.show) {
      window.on('ready-to-show', function() {
        window.show();
      });
    }
    
    return window;
  }

  changeWin(winId: string, url: string, parentId: string | undefined, params: any): void {

  }
}