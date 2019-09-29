import {
  renderDispatchName,
  renderRegisterName,
  mainDispatchName,
  mainInitName,
  mainReturnName,
  winMessageName,
  messageName,
  initMessageName,
} from "../constants";
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
        rendererCallback.handleInvokeReturn(invokeId, error, result);
      } else if (action === messageName) {
        rendererCallback.handleMessage(data[0]);
      } else if (action === winMessageName) {
        let [senderId, payload] = data;
        rendererCallback.handleWinMessage(senderId, payload);
      } else if (action === initMessageName) {
        rendererCallback.handleInit(data[0]);
      }
    });
    window.addEventListener("unload", () => {
      // mainWin.postMessage({ action: "close", clientId });
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
}
