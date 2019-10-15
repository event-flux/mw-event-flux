import {
  mainInitName,
  renderRegisterName,
  renderDispatchName,
  renderRequestStoreName,
  renderReleaseStoreName,
  mainDispatchName,
  mainReturnName,
  winMessageName,
  messageName,
} from "../constants";
import { ipcRenderer, remote } from "electron";
import { Log, Logger } from "../utils/loggerApply";
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
    ipcRenderer.on(messageName, (event: Event, params: any) => {
      this.rendererCallback.handleMessage(params);
    });
    ipcRenderer.on(winMessageName, (event: Event, senderId: string, params: any) => {
      this.rendererCallback.handleWinMessage(senderId, params);
    });
    ipcRenderer.on(mainInitName, (event: Event, arg: any) => {
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
