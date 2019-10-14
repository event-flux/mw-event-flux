import { StoreBase, AppStore } from "event-flux";
import { IWinProps, IWinParams, IMultiWinStore } from "./mainClientTypes";
import { messageName } from "./constants";
import MainAppStore from "./MainAppStore";
import { IMainClient } from "./mainClientTypes";
import MultiWinSaver from "./MultiWinSaver";

export default class MultiWinStore extends StoreBase<any> implements IMultiWinStore {
  clientIds: string[] = [];
  // namedWinId to clientId map
  clientIdNameMap: { [clientId: string]: string } = {};
  // clientId to namedWinId map
  clientNameIdMap: { [winName: string]: string } = {};

  groupsMap: { [clientId: string]: string[] } = {};

  mainClient: IMainClient;
  multiWinSaver: MultiWinSaver;

  constructor(appStore: MainAppStore) {
    super(appStore);
    this.multiWinSaver = (this._appStore as MainAppStore).multiWinSaver;
    this.mainClient = (this._appStore as MainAppStore).mainClient;
  }

  init() {
    let winInfos = this.multiWinSaver.getWinInfos();
    if (winInfos.length === 0) {
      // this.mainClient.createWin("mainClient", { path: "/", name: "mainClient", groups: ["main"] }, {});
      let winProps = { path: "/", name: "mainClient", groups: ["main"] };
      this.mainClient!.createWin("mainClient", winProps, {});
      this._addWinProps("mainClient", winProps);
    } else {
      this.clientIds = winInfos.map(item => item.winId);
    }

    this.multiWinSaver.onDidDeleteWin((winId: string) => {
      this._removeClientId(winId);
      if (winId === "mainClient") {
        this.closeAllWindows();
      }
    });
  }

  // add winProps for clientId
  _addWinProps(clientId: string, winProps: IWinProps) {
    this.clientIds.push(clientId);

    this._updateWinProps(clientId, winProps);
  }

  _updateWinProps(clientId: string, winProps: IWinProps) {
    if (winProps.name) {
      this.clientNameIdMap[winProps.name] = clientId;
      this.clientIdNameMap[clientId] = winProps.name;
    }
    if (winProps.groups) {
      this.groupsMap[clientId] = winProps.groups;
    }
  }

  _parseWinProps(winProps: string | IWinProps, parentId?: string | null): IWinProps {
    let parseProps: IWinProps = typeof winProps === "string" ? { path: winProps } : winProps;
    // default window will be distributed to main group
    if (parseProps.groups === undefined) {
      parseProps.groups = ["main"];
    }
    if (parentId) {
      parseProps.parentId = parentId;
    }
    return parseProps;
  }

  _removeClientId(clientId: string) {
    let name = this.clientIdNameMap[clientId];
    if (name) {
      delete this.clientNameIdMap[name];
      delete this.clientIdNameMap[clientId];
    }
    delete this.groupsMap[clientId];

    let index = this.clientIds.indexOf(clientId);
    if (index !== -1) {
      this.clientIds.splice(index, 1);
    }
  }

  createWin(
    winProps: IWinProps | string,
    parentClientId?: string | null | undefined,
    params?: IWinParams
  ): string | null {
    let clientId = this._genClientId();

    // get url from winProps
    winProps = this._parseWinProps(winProps, parentClientId);

    this.mainClient!.createWin(clientId, winProps, params || {});
    this._addWinProps(clientId, winProps);

    return clientId;
  }

  // Create new win if the specific winId is not exists
  createOrOpenWin(
    winName: string,
    url: string | IWinProps,
    parentClientId: string | null | undefined,
    params: any
  ): string | null {
    // If the window named winName not exists, then we will create new window
    if (!this.clientNameIdMap[winName]) {
      let winProps: IWinProps = typeof url === "string" ? { path: url, name: winName } : { ...url, name: winName };
      return this.createWin(winProps, parentClientId, params);
    } else {
      let clientId = this.clientNameIdMap[winName];
      // this.changeClientAction(clientId, typeof url === "string" ? url : url.path!);
      let winProps: IWinProps = typeof url === "string" ? { path: url } : { ...url };
      winProps.name = winName;
      winProps.parentId = parentClientId;

      this.mainClient!.changeWin(this.multiWinSaver!.getWinInfo(clientId), winProps, params);
      this.activeWin(clientId);
      this._updateWinProps(clientId!, winProps);
      return clientId;
    }
  }

  closeWin(clientId: string) {
    let winInfo = this.multiWinSaver.getWinInfo(clientId);
    if (winInfo) {
      this.mainClient.closeWin(winInfo);
    }
  }

  closeWinByName(name: string) {
    let clientId = this.clientNameIdMap[name];
    if (clientId) {
      this.closeWin(clientId);
    }
  }

  closeWinByGroup(group: string) {
    for (let clientId of this.clientIds) {
      let groups = this.groupsMap[clientId];
      if (groups && groups.indexOf(group) !== -1) {
        this.closeWin(clientId);
      }
    }
  }

  activeWin(clientId: string) {
    let winInfo = this.multiWinSaver.getWinInfo(clientId);
    if (winInfo) {
      this.mainClient.activeWin(winInfo);
    }
  }

  activeWindow(clientId: string) {
    this.activeWin(clientId);
  }

  activeWinByName(name: string) {
    let clientId = this.clientNameIdMap[name];
    if (clientId) {
      this.activeWin(clientId);
    }
  }

  activeWinByGroup(group: string) {
    for (let clientId of this.clientIds) {
      let groups = this.groupsMap[clientId];
      if (groups && groups.indexOf(group) !== -1) {
        this.activeWin(clientId);
      }
    }
  }

  sendWinMsg(clientId: string, message: any) {
    let winInfo = this.multiWinSaver.getWinInfo(clientId);
    if (winInfo) {
      this.mainClient.sendWinMsg(winInfo, messageName, message);
    }
  }

  sendWinMsgByName(name: string, message: any) {
    let clientId = this.clientNameIdMap[name];
    if (clientId) {
      this.sendWinMsg(clientId, message);
    }
  }

  sendWinMsgByGroup(group: string, message: any) {
    for (let clientId of this.clientIds) {
      let groups = this.groupsMap[clientId];
      if (groups && groups.indexOf(group) !== -1) {
        this.sendWinMsg(clientId, message);
      }
    }
  }

  _genClientId(): string {
    let clientId = "win" + Math.floor(Math.random() * 10000);
    if (this.clientIds.indexOf(clientId) !== -1) {
      return this._genClientId();
    }
    return clientId;
  }

  closeAllWindows() {
    this.clientIds.slice(0).forEach(clientId => {
      this.closeWin(clientId);
    });
  }
}
