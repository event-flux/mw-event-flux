import { mainDispatchName, mainReturnName, winMessageName, messageName, initMessageName } from "../constants";
import { IRendererClient, IRendererClientCallback } from "../rendererClientTypes";
import { decodeQuery } from "../utils/queryHandler";

export default class BrowserRendererClient implements IRendererClient {
  query: any;
  winId: any;
  rendererCallback: IRendererClientCallback;

  constructor(rendererCallback: IRendererClientCallback) {
    this.rendererCallback = rendererCallback;
    this.query = decodeQuery(window.location.search.slice(1));
    this.winId = this.query.winId || "mainClient";

    window.addEventListener("message", this._handleMessage.bind(this));
    window.addEventListener("unload", () => {
      this.sendMainMsg("close", this.winId);
    });
  }

  getQuery(): any {
    return this.query;
  }

  sendMainMsg(msgName: string, ...params: any[]) {
    let mainWin = this.winId === "mainClient" ? window : window.opener;
    mainWin.postMessage({ action: msgName, data: params }, "*");
  }

  _handleMessage(event: MessageEvent) {
    let { action, data } = event.data || ({} as any);

    if (action === mainDispatchName) {
      this.rendererCallback.handleDispatchReturn(data[0]);
    } else if (action === mainReturnName) {
      let [invokeId, error, result] = data;
      this.rendererCallback.handleInvokeReturn(invokeId, error, result);
    } else if (action === messageName) {
      this.rendererCallback.handleMessage(data[0]);
    } else if (action === winMessageName) {
      let [senderId, payload] = data;
      this.rendererCallback.handleWinMessage(senderId, payload);
    } else if (action === initMessageName) {
      this.rendererCallback.handleInit(data[0]);
    }
  }
}
