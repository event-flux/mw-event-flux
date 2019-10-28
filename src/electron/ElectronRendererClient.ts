import {
  initMessageName,
  mainDispatchName,
  mainReturnName,
  winMessageName,
  messageName,
  mainEmitName,
  mainInvokeName,
} from "../constants";
import { ipcRenderer } from "electron";
import { IRendererClientCallback } from "../rendererClientTypes";
import { decodeQuery } from "../utils/queryHandler";

export default class ElectronRendererClient {
  query: any;
  winId: any;
  rendererCallback: IRendererClientCallback;

  constructor(rendererCallback: IRendererClientCallback) {
    this.rendererCallback = rendererCallback;
    this.query = decodeQuery(window.location.search.slice(1));
    this.winId = this.query.winId || "mainClient";

    ipcRenderer.on(mainDispatchName, (event: Event, args: string) => {
      this.rendererCallback.handleDispatchReturn(args);
    });
    ipcRenderer.on(mainReturnName, (event: Event, invokeId: string, error: Error, result: any) => {
      this.rendererCallback.handleInvokeReturn(invokeId, error, result);
    });
    ipcRenderer.on(mainEmitName, (event: Event, invokeId: string, args: any[]) => {
      this.rendererCallback.handleMainEmit(invokeId, args);
    });
    ipcRenderer.on(mainInvokeName, (event: Event, args: any) => {
      this.rendererCallback.handleMainInvoke(args);
    });
    ipcRenderer.on(messageName, (event: Event, params: any) => {
      this.rendererCallback.handleMessage(params);
    });
    ipcRenderer.on(winMessageName, (event: Event, senderId: string, params: any) => {
      this.rendererCallback.handleWinMessage(senderId, params);
    });
    ipcRenderer.on(initMessageName, (event: Event, arg: any) => {
      this.rendererCallback.handleInit(arg);
    });
  }

  getQuery(): any {
    return this.query;
  }

  sendMainMsg(msgName: string, ...params: any[]) {
    ipcRenderer.send(msgName, ...params);
  }
}
