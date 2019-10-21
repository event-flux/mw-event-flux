export interface IWinInfo {
  winId: string;
  [key: string]: any;
}

export interface IWinProps {
  path: string;
  parentId?: string | null;
  name?: string;
  groups?: string[];
  [key: string]: any;
}

export interface IWinParams {
  x?: number;
  y?: number;
  show?: boolean;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  title?: string;
  useContentSize?: boolean;
  [key: string]: any;
}

export interface IOutStoreDeclarer {
  storeType: "Item" | "List" | "Map";
  storeKey: string;
  stateKey: string;
  depStoreNames: string[] | undefined;
  [key: string]: any;
}

export interface IErrorObj {
  name: string;
  message: string;
  [key: string]: any;
}

export interface IMainClient {
  sendWinMsg(winInfo: IWinInfo, msgName: string, ...args: any[]): void;

  activeWin(winInfo: IWinInfo): void;

  createWin(winId: string, winProps: IWinProps, winParams: IWinParams): any;

  changeWin(winInfo: IWinInfo, winProps: IWinProps, winParams: IWinParams): void;

  closeWin(winInfo: IWinInfo): void;
}

export interface IMainClientCallback {
  handleRendererDispatch(winId: string, invokeId: string, stringifiedAction: string): void;

  handleRendererDispatchNoReturn(winId: string, stringifiedAction: string): void;

  handleRendererDispatchObserve(winId: string, invokeId: string, methodInfo: any): void;

  handleRendererDispatchDispose(winId: string, invokeId: string): void;

  handleWinMessage(senderId: string, targetId: string, data: any): void;

  handleRequestStores(winId: string, storeKeys: string[]): void;

  handleReleaseStores(winId: string, storeKeys: string[]): void;

  handleMapRequestStores(winId: string, storeKey: string, mapKeys: string[]): void;

  handleMapReleaseStores(winId: string, storeKey: string, mapKeys: string[]): void;

  initWin(winId: string, params: IWinProps): void;

  getStoreDeclarers(): string;

  getInitStates(clientId: string): any;
}

export interface IMultiWinStore {
  // Create new win if the name is not exists, else will change the window url only
  createWin(url: IWinProps | string, parentId: string, params: IWinParams): string | null;

  createOrOpenWin(winName: string, url: string | IWinProps, parentClientId: string, params: IWinParams): string | null;

  closeWin(clientId: string): void;

  closeWinByName(name: string): void;

  closeWinByGroup(group: string): void;

  activeWin(clientId: string): void;

  activeWinByName(name: string): void;

  activeWinByGroup(group: string): void;

  sendWinMsg(clientId: string, message: any): void;

  sendWinMsgByName(name: string, message: any): void;

  sendWinMsgByGroup(group: string, message: any): void;
}
