import { Log, Logger } from "../utils/loggerApply";
import IMainClientCallbacks from "../IMainClientCallbacks";
import IErrorObj from "../IErrorObj";
import { 
  mainInitName, mainDispatchName, mainReturnName, renderDispatchName, renderRegisterName, messageName, winMessageName
} from '../constants';
import { ipcMain, WebContents, BrowserWindow, Event } from 'electron';
import findIndex from '../utils/findIndex';
import IMainClient from '../IMainClient';
import MultiWinSaver from "../MultiWinSaver";

interface IClientInfo {
  webContents: WebContents;
  window: BrowserWindow;
  clientId: string;
};

interface IMainClientCallback {

}

export default class ElectronMainClient implements IMainClient {
  clientInfos: IClientInfo[] = [];
  clientMap: { [key: string]: IClientInfo } = {};

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
    if (!this.clientMap[clientId]) return;
    let webContents = this.clientMap[clientId].webContents;

    this.mainClientCallbacks.handleRendererMessage(stringifiedAction).then(result => {
      this._sendForWebContents(webContents, mainReturnName, invokeId, undefined, result);
    }, (err) => {
      let errObj: IErrorObj | null = null;

      if (err) {
        errObj = { name: err.name, message: err.message } as IErrorObj;
        if (errObj) {
          Object.keys(err).forEach(key => errObj![key] = err[key]);
        }
      }
      
      this._sendForWebContents(webContents, mainReturnName, invokeId, errObj, undefined);
    });
  };

  handleWinMessage = (event: Event, clientId: string, data: any) => {
    if (!this.clientMap[clientId]) return;
    let webContents = this.clientMap[clientId].webContents;
    let existIndex = findIndex(this.clientInfos, (item: IClientInfo) => item.webContents === event.sender);
    if (existIndex !== -1) {
      this._sendForWebContents(webContents, winMessageName, this.clientInfos[existIndex].clientId, data);
    }
  };

  private checkWebContents(webContents: WebContents) {
    return !webContents.isDestroyed() && !webContents.isCrashed();
  }

  private _sendForWebContents(webContents: WebContents, channel: string, ...args: any[]) {
    if (this.checkWebContents(webContents)) {
      webContents.send(channel, ...args);
    }
  }

  getForwardClients(): IClientInfo[] {
    return this.clientInfos;
  }

  dispatchToRenderer(client: IClientInfo, payload: any) {
    let webContents = client.webContents;
    // if (webContents.isDestroyed() || webContents.isCrashed()) {
    //   return this.unregisterRenderer(client.clientId);
    // }
    if (this.checkWebContents(webContents)) {
      webContents.send(mainDispatchName, payload);
    }
  }
  
  sendWinMsg(clientId: string, message: any) {
    if (!this.clientMap[clientId]) return;
    let webContents = this.clientMap[clientId].webContents;
    if (this.checkWebContents(webContents)) {
      webContents.send(messageName, message);
    }
  }

  // 通过clientId获取BrowserWindow
  getWindow(clientId: string): BrowserWindow | undefined {
    if (!this.clientMap[clientId]) return undefined;
    return this.clientMap[clientId].window;
  }

  // 通过clientId获取WebContents
  getWebContents(clientId: string): WebContents | undefined {
    if (!this.clientMap[clientId]) return undefined;
    return this.clientMap[clientId].webContents;
  }

  changeClientAction(clientId: string, params: any) {
    if (this.clientMap[clientId]) {

      let webContents = this.clientMap[clientId].webContents;
      // this.sendMessage(win, { action: 'change-props', url });
      // win.webContents.send("__INIT_WINDOW__", params);
      this._sendForWebContents(webContents, "__INIT_WINDOW__", params);
      this.log((logger) => logger("ElectronMainClient", "init Window", params));

    } else {

      const onRegister = (event: Event, { clientId: nowClientId }: { clientId: string }) => {
        if (nowClientId === clientId) {
          this.changeClientAction(clientId, params);
          ipcMain.removeListener(renderRegisterName, onRegister);
        }
      };
      // 还没有初始化，则监听注册事件，当初始化之后 开始初始化
      ipcMain.on(renderRegisterName, onRegister);
    }
  }

  isRegister(clientId: string): boolean {
    return !!this.clientMap[clientId];
  }

  whenRegister(clientId: string, callback: () => void): void {
    if (this.isRegister(clientId)) {
      return callback();
    }
    const onRegister = (event: Event, { clientId: nowClientId }: { clientId: string }) => {
      if (nowClientId === clientId) {
        callback();
        ipcMain.removeListener(renderRegisterName, onRegister);
      }
    };

    ipcMain.on(renderRegisterName, onRegister);
  }

  isClose(clientId: string): boolean {
    return !this.clientMap[clientId];
  }
}