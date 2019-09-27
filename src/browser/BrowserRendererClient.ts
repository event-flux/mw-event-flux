import {
  renderDispatchName,
  renderRegisterName,
  mainDispatchName,
  mainInitName,
  mainReturnName,
  winMessageName,
  messageName,
} from "../constants";
import {
  IStoreCallback,
  IActionCallback,
  IResultCallback,
  IMessageCallback,
  IWinMessageCallback,
} from "../IRendererClient";
import { IRendererClient, IRendererClientCallback } from "../rendererClientTypes";
import { decodeQuery } from "../utils/queryHandler";

export default class BrowserRendererClient implements IRendererClient {
  query: any;
  winId: any;

  constructor(rendererCallback: IRendererClientCallback) {
    this.query = decodeQuery(window.location.search.slice(1));
    this.winId = this.query.winId || "mainClient";

    window.addEventListener("message", event => {
      let { action, data } = event.data || ({} as any);

      if (action === mainDispatchName) {
        rendererCallback.handleDispatchReturn(data[0]);
      } else if (action === mainReturnName) {
        let [invokeId, error, result] = data;
        rendererCallback.handleInvokeReturn(invokeId, error, data);
      } else if (action === messageName) {
        rendererCallback.handleMessage(data[0]);
      } else if (action === winMessageName) {
        let [senderId, payload] = data;
        rendererCallback.handleWinMessage(senderId, payload);
      }
    });
    // window.addEventListener("unload", () => {
    //   mainWin.postMessage({ action: "close", clientId });
    // });
  }

  getQuery(): any {
    return this.query;
  }

  // Forward update to the main process so that it can forward the update to all other renderers
  forward(invokeId: number, action: any) {
    let clientId = this.clientId;
    let mainWin = (window as any).isMainClient ? window : window.opener;
    mainWin.postMessage({ action: renderDispatchName, data: action, invokeId, clientId }, "*");
  }

  requestStores(storeNames: string[]) {
    ipcRenderer.send(renderRequestStore, storeNames);
  }

  releaseStores(storeNames: string[]) {
    ipcRenderer.send(renderReleaseStore, storeNames);
  }

  sendMessage(args: any) {
    let mainWin = (window as any).isMainClient ? window : window.opener;
    mainWin.postMessage({ action: messageName, data: args }, "*");
  }

  sendWindowMessage(clientId: string, args: any) {
    let mainWin = (window as any).isMainClient ? window : window.opener;
    let senderId = this.clientId;
    mainWin.postMessage({ action: winMessageName, senderId, clientId, data: args }, "*");
  }

  sendMainMsg(msgName: string, ...params: any[]) {
    let mainWin = (window as any).isMainClient ? window : window.opener;
    mainWin.postMessage({ action: msgName, data: [this.winId] }, "*");
  }
}
