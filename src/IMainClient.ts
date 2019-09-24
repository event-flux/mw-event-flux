import IMainClientCallbacks from "./IMainClientCallbacks";
import { Log } from "./utils/loggerApply";

export interface IClientInfo {
  clientId: string;
}

export interface IMainClientConstructor {
  new (callbacks: IMainClientCallbacks, log: Log): IMainClient;
}

// App窗口注册器，用于跟renderer进程进行交互，传递store和state等
export default interface IMainClient {

  // 获得所有Register的 clientId
  getForwardClients(): IClientInfo[]; 

  dispatchToRenderer(client: IClientInfo, payload: any): void;

  changeClientAction(clientId: string, params: any): void;

  // 检查clientId对应的窗口是否已经注册
  isRegister(clientId: string): boolean;

  whenRegister(clientId: string, callback: () => void): void;

  // 检查clientId对应的窗口是否已经销毁
  isClose(clientId: string): boolean;
}