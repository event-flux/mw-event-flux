
import { Log } from "../utils/loggerApply";
import { 
  renderRegisterName, renderDispatchName, mainDispatchName, mainInitName, mainReturnName, winMessageName, messageName 
} from '../constants';
import { IWinInfo, IMainClient, IMainClientCallback } from '../mainClientTypes';
import MultiWinSaver from "../MultiWinSaver";

export default class BrowserMainClient implements IMainClient {
    multiWinSaver: MultiWinSaver;
    mainClientCallback: IMainClientCallback;
    log: Log;
  
  constructor(multiWinSaver: MultiWinSaver, callback: IMainClientCallback, log: Log) {
    this.multiWinSaver = multiWinSaver;
    this.mainClientCallback = callback;
    this.log = log;

    (window as any).isMainClient = true;

    window.addEventListener("message", this.handleMessage);

    this.multiWinSaver.addWin({
      winId: 'mainClient', 
      window
    });
  }
  
  private handleMessage = (event: MessageEvent) => {
    let { action, data: payload } = event.data || {} as any;
    if (action === renderDispatchName) {    // Renderer register self
      let [clientId, invokeId, stringifiedAction] = payload;
      this.mainClientCallback.handleRendererDispatch(clientId, invokeId, stringifiedAction);
    } else if (action === winMessageName) {
      let [senderId, clientId, data] = payload;
      this.mainClientCallback.handleWinMessage(senderId, clientId, data);
    } else if (action === 'close') {       // Child window has closed
      let [clientId] = payload;
      this.multiWinSaver.deleteWin(clientId);
    } else if (action === renderRegisterName) {
      let [clientId] = payload;
      this.multiWinSaver.registerWin(clientId);
    }
  };

  sendWinMsg(winInfo: IWinInfo, msgName: string, ...args: any[]) {
    winInfo.window.postMessage({ action: msgName, data: args }, '*');
  }

  // closeAllWindows() {
  //   Object.keys(this.clients).forEach(clientId => {
  //     let window = this.clients[clientId];
  //     window && window.close();
  //   });
  // }
  
  activeWin(winInfo: IWinInfo) {}

  createWin(url: string, winId: string, parentId: string | undefined, params: any) {
    let featureStr = Object.keys(params).map(key => `${key}=${params[key]}`).join(',');
    let childWin = window.open(url, "newwindow", featureStr + ", toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no, titlebar=no");
    if (childWin) {
      childWin.onbeforeunload = () => this.multiWinSaver.deleteWin(winId);
    }
    return childWin;
  }

  changeWin(winId: string, params: any): void {}
}