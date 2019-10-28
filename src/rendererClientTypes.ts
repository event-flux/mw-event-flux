import { IDispatchInfo } from "./storeProxy/DispatchItemProxy";

export interface IRendererClient {
  getQuery(): any;

  sendMainMsg(msgName: string, ...params: any[]): void;
}

export interface IRendererClientCallback {
  handleDispatchReturn(data: any): void;

  handleInvokeReturn(invokeId: string, error: any, data: any): void;

  handleMainInvoke(args: IDispatchInfo): void;

  handleMainEmit(invokeId: string, args: any[]): void;

  handleMessage(data: any): void;

  handleWinMessage(senderId: string, data: any): void;

  handleInit(data: any): void;
}
