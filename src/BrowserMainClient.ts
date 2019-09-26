import { Log } from "./utils/loggerApply";
import IMainClientCallbacks from "./IMainClientCallbacks";
import IErrorObj from "./IErrorObj";
import findIndex from "./utils/findIndex";

import {
  renderRegisterName,
  renderDispatchName,
  mainDispatchName,
  mainInitName,
  mainReturnName,
  winMessageName,
  messageName,
} from "./constants";
import IMainClient, { IClientInfo } from "./IMainClient";

export default class BrowserMainClient implements IMainClient {
  callbacks: IMainClientCallbacks;
  clients: { [clientId: string]: Window } = {};
  clientInfos: IClientInfo[] = [];

  constructor(callbacks: IMainClientCallbacks, log: Log) {
    this.callbacks = callbacks;
    (window as any).isMainClient = true;

    window.addEventListener("message", this.handleMessage);

    this.addWin("mainClient", window);
  }

  addWin(clientId: string, newWin: Window) {
    this.clients[clientId] = newWin;
  }

  getForwardClients() {
    return this.clientInfos;
  }

  dispatchToRenderer(client: IClientInfo, payload: any) {
    let window = this.clients[client.clientId];
    window && window.postMessage({ action: mainDispatchName, data: payload }, "*");
  }

  // sendMessage(win, message) {
  //   win && win.postMessage({ action: messageName, data: message }, '*');
  // }

  sendWinMsg(clientId: string, message: any) {
    let win = this.clients[clientId];
    win && win.postMessage({ action: messageName, data: message }, "*");
  }

  // closeAllWindows() {
  //   Object.keys(this.clients).forEach(clientId => {
  //     let window = this.clients[clientId];
  //     window && window.close();
  //   });
  // }

  changeClientAction(clientId: string, params: any) {
    let win = this.clients[clientId];
    // this.sendMessage(win, { action: 'change-props', url });
    win && win.postMessage({ action: "__INIT_WINDOW__", data: params }, "*");
  }

  isRegister(clientId: string): boolean {
    return !!this.clients[clientId];
  }

  whenRegister(clientId: string, callback: () => void) {
    if (this.isRegister(clientId)) {
      return callback();
    }
    const whenMessage = (event: MessageEvent) => {
      let { action } = event.data || ({} as any);
      if (action === renderDispatchName) {
        window.removeEventListener("message", whenMessage);
        callback();
      }
    };
    window.addEventListener("message", whenMessage);
  }

  isClose(clientId: string): boolean {
    return !this.clients[clientId];
  }

  private handleMessage = (event: MessageEvent) => {
    let callbacks = this.callbacks;
    let { action, data, invokeId, senderId, clientId } = event.data || ({} as any);
    if (action === renderDispatchName) {
      // Renderer register self
      callbacks.handleRendererMessage(data).then(
        result => {
          this.clients[clientId].postMessage(
            {
              action: mainReturnName,
              invokeId,
              data: result,
            },
            "*"
          );
        },
        err => {
          let errObj: IErrorObj = { name: err.name, message: err.message };
          Object.keys(err).forEach(key => (errObj[key] = err[key]));
          this.clients[clientId].postMessage(
            {
              action: mainReturnName,
              invokeId,
              error: errObj,
            },
            "*"
          );
        }
      );
    } else if (action === winMessageName) {
      this.clients[clientId].postMessage(
        {
          action: winMessageName,
          senderId,
          data,
        },
        "*"
      );
    } else if (action === "close") {
      // Child window has closed
      let index = findIndex(this.clientInfos, item => item.clientId === clientId);
      if (index !== -1) {
        this.clientInfos.splice(index, 1);
      }
      delete this.clients[clientId];
      callbacks.deleteWin(clientId);
    } else if (action === renderRegisterName) {
      callbacks.addWin(clientId);
      this.clientInfos.push({ clientId });
      this.clients[clientId].postMessage(
        {
          action: mainInitName,
          data: [callbacks.getInitStates(clientId), callbacks.getStores(clientId)],
        },
        "*"
      );
    }
  };
}
