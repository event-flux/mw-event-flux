import { StoreBase } from "event-flux";
import { IWinProps, IWinParams, IMultiWinStore } from "./mainClientTypes";
import { winManagerStoreName } from "./constants";
import MainAppStore from "./MainAppStore";
import { IMainClient } from "./mainClientTypes";
import MultiWinSaver from "./MultiWinSaver";

function genBrowserUrl(url = "", clientId: string, parentId: string) {
  let genUrl = new URL(url, location.href);
  if (genUrl.search) {
    genUrl.search += `&clientId=${clientId}`;
  } else {
    genUrl.search = `?clientId=${clientId}`;
  }
  genUrl.search += "&isSlave=1";
  if (parentId) {
    genUrl.search += `&parentId=${parentId}`;
  }
  return genUrl.toString();
}

interface IWindow {
  close(): void;
}

export default class MultiWinStore extends StoreBase<any> implements IMultiWinStore {
  clientIds: string[] = [];
  // namedWinId to clientId map
  clientIdNameMap: { [clientId: string]: string } = {};
  // clientId to namedWinId map
  clientNameIdMap: { [winName: string]: string } = {};

  groupsMap: { [clientId: string]: string[] } = {};

  clientWins: { [clientId: string]: IWindow } = {};

  mainClient: IMainClient | undefined;
  multiWinSaver: MultiWinSaver | undefined;

  init() {
    let multiWinSaver = (this._appStore as MainAppStore).multiWinSaver;
    let mainClient = (this._appStore as MainAppStore).mainClient;

    this.mainClient = mainClient;
    this.multiWinSaver = multiWinSaver;

    let winInfos = multiWinSaver.getWinInfos();
    if (winInfos.length === 0) {
      mainClient.createWin("mainClient", { path: "/", name: "mainClient", groups: ["main"] }, {});
    }

    multiWinSaver.onDidDeleteWin((winId: string) => {
      this._removeClientId(winId);
      if (winId === "mainClient") {
        this.closeAllWindows();
      }
    });

    // if (typeof window === "object") {
    //   window.addEventListener("message", event => {
    //     let { action, clientId } = event.data || ({} as any);
    //     if (action === "close") {
    //       this._removeClientId(clientId);
    //     }
    //   });
    //   window.addEventListener("beforeunload", event => {
    //     this.closeAllWindows();
    //   });
    //   // 将main window加入到 新创建窗口列表中
    //   this._addWinProps("mainClient", window, { name: "mainClient", groups: ["main"] });
    // }
  }

  // 新增clientId对应的 winProps
  _addWinProps(clientId: string, win: IWindow | null, winProps: IWinProps) {
    if (!win) {
      return;
    }
    this.clientIds.push(clientId);
    this.clientWins[clientId] = win;

    if (winProps.name) {
      this.clientNameIdMap[winProps.name] = clientId;
      this.clientIdNameMap[clientId] = winProps.name;
    }
    if (winProps.groups) {
      this.groupsMap[clientId] = winProps.groups;
    }
  }

  _parseWinProps(winProps: string | IWinProps, parentId?: string): IWinProps {
    let parseProps: IWinProps = typeof winProps === "string" ? { path: winProps } : winProps;
    // 默认窗口被分组到main分组
    if (parseProps.groups === undefined) {
      parseProps.groups = ["main"];
    }
    if (parentId) {
      parseProps.parentId = parentId;
    }
    return parseProps;
  }

  // 删除窗口的clientId
  _removeClientId(clientId: string) {
    let name = this.clientIdNameMap[clientId];
    delete this.clientWins[clientId];
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

  _createWinForBrowser(winProps: IWinProps | string, parentClientId: string, params: IWinParams): string {
    let clientId = this._genClientId();
    // get url from winProps
    winProps = this._parseWinProps(winProps);
    // create new browser window
    let win = this.createBrowserWin(genBrowserUrl(winProps.path, clientId, parentClientId), clientId, params);

    this._addWinProps(clientId, win, winProps);

    (this._appStore! as any).mainClient.addWin(clientId, win);
    return clientId;
  }

  _createWinForElectron(winProps: IWinProps | string, parentClientId: string, params: IWinParams): string | null {
    return "";
  }

  createWin(winProps: IWinProps | string, parentClientId: string, params: IWinParams): string | null {
    let clientId = this._genClientId();

    // get url from winProps
    winProps = this._parseWinProps(winProps, parentClientId);

    this.mainClient!.createWin(clientId, winProps, params);
    return clientId;
    // if (typeof window === "object") {
    //   return this._createWinForBrowser(winProps, parentClientId, params);
    // } else {
    //   return this._createWinForElectron(winProps, parentClientId, params);
    // }
  }

  // Create new win if the specific winId is not exists
  createOrOpenWin(winName: string, url: string | IWinProps, parentClientId: string, params: any): string | null {
    // winName对应的窗口未存在，则创建新窗口
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
      return clientId;
    }
  }

  closeWin(clientId: string) {
    let win: IWindow | undefined = this.clientWins[clientId];
    if (win) {
      win.close();
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

  activeWin(clientId: string) {}

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
    (this._appStore as any).mainClient.sendWinMsg(clientId, message);
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

  createBrowserWin(url: string, clientId: string, params: any = {}): Window | null {
    if (!params.width) {
      params.width = 400;
    }
    if (!params.height) {
      params.height = 400;
    }
    let featureStr = Object.keys(params)
      .map(key => `${key}=${params[key]}`)
      .join(",");
    let childWin = window.open(
      url,
      "newwindow",
      featureStr + ", toolbar=no, menubar=no, scrollbars=no, resizable=no, location=no, status=no, titlebar=no"
    );
    if (childWin) {
      childWin.onbeforeunload = () => this._removeClientId(clientId);
    }
    return childWin;
  }

  createElectronWin(url: string, clientId: string, parentClientId: string, params: any): string | undefined {
    console.error("Please provide the createElectronWin");
    return;
  }

  onChangeAction(clientId: string, action: string) {}

  getWinRootStore(clientId: string) {
    return (this.appStores[winManagerStoreName] as any).winPackMapStore.get(clientId);
  }
}
