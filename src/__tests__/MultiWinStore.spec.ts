import MultiWinStore from "../MultiWinStore";
import MainAppStore from "../MainAppStore";
import { IMainClient } from "../mainClientTypes";
import MultiWinSaver from "../MultiWinSaver";

jest.useFakeTimers();

jest.mock("../MainClient", () => {
  class MyMainClient implements IMainClient {
    sendWinMsg = jest.fn();
    activeWin = jest.fn();
    createWin = jest.fn(winId => {
      this.multiWinSaver.addWin({ winId });
    });
    changeWin = jest.fn();
    closeWin = jest.fn();
    constructor(private multiWinSaver: MultiWinSaver) {}
  }
  return { default: MyMainClient };
});

describe("MultiWinStore", () => {
  test("Init with no window will create a new window", () => {
    let appStore = new MainAppStore();
    let multiWinStore = new MultiWinStore(appStore);
    multiWinStore.init();

    expect(appStore.mainClient.createWin).toHaveBeenLastCalledWith(
      "mainClient",
      {
        path: "/",
        name: "mainClient",
        groups: ["main"],
      },
      {}
    );
    expect(multiWinStore.clientIds).toEqual(["mainClient"]);
    expect(multiWinStore.clientIdNameMap).toEqual({ mainClient: "mainClient" });
    expect(multiWinStore.clientNameIdMap).toEqual({ mainClient: "mainClient" });
    expect(multiWinStore.groupsMap).toEqual({ mainClient: ["main"] });

    appStore.multiWinSaver.deleteWin("mainClient");
    expect(multiWinStore.clientIds).toEqual([]);
    expect(multiWinStore.clientIdNameMap).toEqual({});
  });

  test("Init with some windows will not create windows", () => {
    let appStore = new MainAppStore();
    appStore.multiWinSaver.addWin({ winId: "mainClient" });

    let multiWinStore = new MultiWinStore(appStore);
    multiWinStore.init();

    expect(appStore.mainClient.createWin).not.toHaveBeenCalled();
    expect(multiWinStore.clientIds).toEqual(["mainClient"]);
    expect(multiWinStore.clientIdNameMap).toEqual({});

    appStore.multiWinSaver.deleteWin("mainClient");
    expect(multiWinStore.clientIds).toEqual([]);
    expect(multiWinStore.clientIdNameMap).toEqual({});
  });

  test("createWin should create window correctly", () => {
    let appStore = new MainAppStore();
    appStore.multiWinSaver.addWin({ winId: "mainClient" });

    let multiWinStore = new MultiWinStore(appStore);
    multiWinStore._genClientId = () => "win1";
    multiWinStore.init();

    multiWinStore.createWin("/home", null, { width: 100, height: 100 });
    expect(appStore.mainClient.createWin).toHaveBeenLastCalledWith(
      "win1",
      { path: "/home", groups: ["main"] },
      { width: 100, height: 100 }
    );

    multiWinStore.createWin({ path: "/home", name: "win1" }, "mainClient", { width: 100, height: 100 });
    expect(appStore.mainClient.createWin).toHaveBeenLastCalledWith(
      "win1",
      { path: "/home", name: "win1", groups: ["main"], parentId: "mainClient" },
      { width: 100, height: 100 }
    );
  });

  test("createOrOpenWin should create window correctly", () => {
    let appStore = new MainAppStore();
    appStore.multiWinSaver.addWin({ winId: "mainClient" });

    let multiWinStore = new MultiWinStore(appStore);
    multiWinStore._genClientId = () => "win1";
    multiWinStore.init();

    multiWinStore.createOrOpenWin("win1", "/home", null, { width: 100, height: 100 });
    expect(appStore.mainClient.createWin).toHaveBeenLastCalledWith(
      "win1",
      { name: "win1", path: "/home", groups: ["main"] },
      { width: 100, height: 100 }
    );
    expect(multiWinStore.clientIds).toEqual(["mainClient", "win1"]);
    expect(multiWinStore.clientIdNameMap).toEqual({ win1: "win1" });
    expect(multiWinStore.groupsMap).toEqual({ win1: ["main"] });

    multiWinStore.createOrOpenWin("win1", "/home2", null, { width: 100, height: 200 });
    expect(multiWinStore.clientIds).toEqual(["mainClient", "win1"]);
    expect(appStore.mainClient.changeWin).toHaveBeenLastCalledWith(
      appStore.multiWinSaver.getWinInfo("win1"),
      { path: "/home2", name: "win1", parentId: null },
      { width: 100, height: 200 }
    );
    expect(multiWinStore.clientIdNameMap).toEqual({ win1: "win1" });

    multiWinStore.createOrOpenWin("win1", { path: "/home2", groups: ["group1"] }, null, { width: 100, height: 200 });
    expect(multiWinStore.groupsMap).toEqual({ win1: ["group1"] });
  });
});
