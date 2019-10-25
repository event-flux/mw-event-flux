import { IMainClient, IWinInfo } from "../../mainClientTypes";
import MultiWinSaver from "../../MultiWinSaver";
import MainAppStore from "../../MainAppStore";
import MultiWinCacheStore, { WindowManager } from "../MultiWinCacheStore";
import IStorage from "../../storage/IStorage";
import { BrowserWindow, app } from "electron";

jest.useFakeTimers();

jest.mock("../../MainClient", () => {
  class MyMainClient implements IMainClient {
    sendWinMsg = jest.fn();
    activeWin = jest.fn();
    createWin = jest.fn(winId => {
      let win = new BrowserWindow();
      this.multiWinSaver.addWin({ winId, window: win });
      win.on("closed", () => {
        this.multiWinSaver.deleteWin(winId);
      });
      return win;
    });
    changeWin = jest.fn();
    closeWin = jest.fn((winInfo: IWinInfo) => {
      winInfo.window.close();
    });
    constructor(private multiWinSaver: MultiWinSaver) {}
  }
  return MyMainClient;
});

class MyStorage implements IStorage {
  _storage: any = {};

  set(key: string | { [key: string]: any }, value: any) {
    if (typeof key === "object") {
      for (let k in key) {
        this.set(k, key[k]);
      }
    } else {
      this._storage[key] = value;
    }
  }

  get(key: string, defaultValue?: any): any {
    return this._storage[key] || defaultValue;
  }

  delete(key: string): void {
    delete this._storage[key];
  }

  getNSStore(namespace: string): IStorage {
    return this;
  }
}

describe("MultiWinStore", () => {
  let multiWinStore: MultiWinCacheStore;
  let appStore: MainAppStore;

  beforeEach(() => {
    appStore = new MainAppStore();
    multiWinStore = new MultiWinCacheStore(appStore);
    let storage = new MyStorage();
    multiWinStore.getStorage = () => storage;
  });

  test("loadClients should generate default client when storage not contain clients", async () => {
    multiWinStore.getStorage()!.set("clients", []);
    multiWinStore.init();

    await app.whenReady();
    expect(multiWinStore.clientIds).toEqual(["mainClient"]);
    expect(multiWinStore.clientIdNameMap.mainClient).toBe("mainClient");
    expect(multiWinStore.groupsMap.mainClient).toEqual(["main"]);
  });

  test("WindowManager should can get window", async () => {
    let winManager = new WindowManager(multiWinStore);
    await app.whenReady();

    expect(winManager.windows.length).toBe(winManager.winSize);
    let winInfo = winManager.getWin();
    expect(winManager.windows.length).toBe(winManager.winSize);
    expect(multiWinStore.multiWinSaver.getWinInfos().length).toEqual(2);
    winManager.dispose();
    expect(multiWinStore.multiWinSaver.getWinInfos().length).toEqual(1);
  });

  test("loadClients with clients should behave correctly", async () => {
    multiWinStore
      .getStorage()!
      .set("clients", [
        { winId: "mainClient", name: "mainClient", groups: ["main"], path: "/home", winState: { x: 10 } },
        { winId: "win1", name: "win1", groups: ["main"], path: "/home2", winState: { y: 20 } },
      ]);
    multiWinStore.init();
    await app.whenReady();

    expect(appStore.mainClient.createWin).toHaveBeenNthCalledWith(
      2,
      "mainClient",
      { path: "/home", parentId: undefined },
      { x: 10, y: 0, width: 800, height: 600, useContentSize: false }
    );
    expect(appStore.mainClient.createWin).toHaveBeenNthCalledWith(
      3,
      "win1",
      { path: "/home2", parentId: undefined },
      { x: 0, y: 20, width: 800, height: 600, useContentSize: false }
    );
    expect(multiWinStore.clientIds).toEqual(["mainClient", "win1"]);
    expect(multiWinStore.clientIdNameMap).toEqual({ mainClient: "mainClient", win1: "win1" });
    expect(multiWinStore.groupsMap).toEqual({ mainClient: ["main"], win1: ["main"] });
    expect(Object.keys(multiWinStore.clientInfoMap)).toEqual(["mainClient", "win1"]);
    expect(multiWinStore.clientInfoMap.mainClient).toEqual({
      path: "/home",
      winId: "mainClient",
      groups: ["main"],
      name: "mainClient",
      winState: {
        x: 10,
        y: 0,
        width: 800,
        height: 600,
        useContentSize: false,
      },
    });
  });

  test("create window should behave correctly", async () => {
    multiWinStore.getStorage()!.set("clients", []);
    multiWinStore.init();
    await app.whenReady();

    appStore.multiWinSaver.getWinInfo("mainClient").window.setBounds({ x: 100, y: 100, width: 1000, height: 700 });

    multiWinStore.createWin({ path: "/hello", name: "hello", parentId: "mainClient" }, {});
    let win1Id = multiWinStore.clientIds[1];
    expect(appStore.mainClient.changeWin).toHaveBeenLastCalledWith(
      appStore.multiWinSaver.getWinInfo(win1Id),
      { path: "/hello", parentId: "mainClient" },
      { x: 200, y: 150, width: 800, height: 600, useContentSize: false, show: true }
    );
    expect(multiWinStore.clientInfoMap[multiWinStore.clientIds[1]]).toEqual({
      path: "/hello",
      winId: multiWinStore.clientIds[1],
      name: "hello",
      parentId: "mainClient",
      groups: ["main"],
      winState: {
        x: 200,
        y: 150,
        width: 800,
        height: 600,
        useContentSize: false,
        show: true,
      },
    });

    multiWinStore.createWin({ path: "/hello", name: "hello" }, {});
    expect(appStore.mainClient.changeWin).toHaveBeenLastCalledWith(
      appStore.multiWinSaver.getWinInfo(multiWinStore.clientIds[2]),
      { path: "/hello", parentId: undefined },
      { x: 200, y: 100, width: 800, height: 600, useContentSize: false, show: true }
    );
    expect(multiWinStore.getStorage()!.get("clients").length).toEqual(3);

    appStore.multiWinSaver.getWinInfo(multiWinStore.clientIds[2]).window.close();
    expect(multiWinStore.clientIds.length).toBe(2);
    expect(Object.keys(multiWinStore.clientInfoMap).length).toBe(2);

    appStore.multiWinSaver.getWinInfo("mainClient").window.close();
    expect(multiWinStore.clientIds.length).toBe(0);
    expect(Object.keys(multiWinStore.clientInfoMap).length).toBe(0);
    expect(multiWinStore.clientIdNameMap).toEqual({});
    expect(
      multiWinStore
        .getStorage()!
        .get("clients")
        .map((item: any) => item.winId)
    ).toEqual(["mainClient", win1Id]);
  });

  test("loadClients with clients should behave correctly", async () => {
    multiWinStore
      .getStorage()!
      .set("clients", [
        { winId: "mainClient", name: "mainClient", groups: ["main"], path: "/home", winState: { x: 10 } },
      ]);
    multiWinStore.init();
    await app.whenReady();
    multiWinStore.changeWinProps("mainClient", { path: "/home2" });
    expect(multiWinStore.getStorage()!.get("clients")).toMatchObject([
      { winId: "mainClient", path: "/home2", name: "mainClient", groups: ["main"], winState: { x: 10 } },
    ]);
  });
});
