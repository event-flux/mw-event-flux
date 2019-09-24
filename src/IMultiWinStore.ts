import StoreBase from "./StoreBase";

export interface IWinParams {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  title?: string;
  useContentSize?: boolean;
}

export interface IWinProps {
  path?: string;   // The path of the window
  name?: string; // The name of this window
  groups?: string[];  // The groups that the window belongs to
}

export default interface IMultiWinStore {
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

  onChangeAction(clientId: string, action: string): void;

  getWinRootStore(clientId: string): StoreBase;
}