import {
  mainDispatchName,
  mainReturnName,
  winMessageName,
  messageName,
  initMessageName,
  mainInvokeName,
} from "../constants";
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

    switch (action) {
      case mainDispatchName:
        return this.rendererCallback.handleDispatchReturn(data[0]);
      case mainReturnName: {
        let [invokeId, error, result] = data;
        return this.rendererCallback.handleInvokeReturn(invokeId, error, result);
      }
      case mainInvokeName: {
        let [invokeId, args] = data;
        return this.rendererCallback.handleMainInvoke(invokeId, args);
      }
      case messageName: {
        return this.rendererCallback.handleMessage(data[0]);
      }
      case winMessageName: {
        let [senderId, payload] = data;
        return this.rendererCallback.handleWinMessage(senderId, payload);
      }
      case initMessageName: {
        return this.rendererCallback.handleInit(data[0]);
      }
    }
  }
}
