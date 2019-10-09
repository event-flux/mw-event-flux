export interface IWinInfo {
  winId: string;
  [key: string]: any;
}

export interface IWinProps {
  path: string;
  parentId: string | undefined;
  name: string | undefined;
  groups: string[] | undefined;
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

export interface IMainClient {
  sendWinMsg(winInfo: IWinInfo, msgName: string, ...args: any[]): void;

  activeWin(winInfo: IWinInfo): void;

  createWin(winId: string, winProps: IWinProps, winParams: IWinParams): void;

  changeWin(winInfo: IWinInfo, winProps: IWinProps, winParams: IWinParams): void;
}

export interface IMainClientCallback {
  handleRendererDispatch(winId: string, invokeId: string, stringifiedAction: string): void;

  handleRendererDispatchNoReturn(winId: string, stringifiedAction: string): void;

  handleWinMessage(senderId: string, targetId: string, data: any): void;

  handleRequestStores(winId: string, storeKeys: string[]): void;

  handleReleaseStores(winId: string, storeKeys: string[]): void;

  initWin(winId: string, params: IWinProps): void;

  getStoreDeclarers(): string;

  getInitStates(clientId: string): any;
}
