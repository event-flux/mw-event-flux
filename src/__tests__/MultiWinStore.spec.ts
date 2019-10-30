import MultiWinStore from "../MultiWinStore";
import MainAppStore from "../MainAppStore";
import { IMainClient, IWinInfo } from "../mainClientTypes";
import MultiWinSaver from "../MultiWinSaver";
import { messageName } from "../constants";

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
  return MyMainClient;
});

describe("MultiWinStore", () => {
  test("Init with no window will create a new window", () => {
    let appStore = new MainAppStore();
    let multiWinStore = new MultiWinStore();
    multiWinStore._inject(appStore, MultiWinStore);
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

    let multiWinStore = new MultiWinStore();
    multiWinStore._inject(appStore, MultiWinStore);
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

    let multiWinStore = new MultiWinStore();
    multiWinStore._inject(appStore, MultiWinStore);
    multiWinStore._genClientId = () => "win1";
    multiWinStore.init();

    multiWinStore.createWin("/home", { width: 100, height: 100 });
    expect(appStore.mainClient.createWin).toHaveBeenLastCalledWith(
      "win1",
      { path: "/home", groups: ["main"] },
      { width: 100, height: 100 }
    );

    multiWinStore.createWin({ path: "/home", name: "win1", parentId: "mainClient" }, { width: 100, height: 100 });
    expect(appStore.mainClient.createWin).toHaveBeenLastCalledWith(
      "win1",
      { path: "/home", name: "win1", groups: ["main"], parentId: "mainClient" },
      { width: 100, height: 100 }
    );
  });

  test("createOrOpenWin should create window correctly", () => {
    let appStore = new MainAppStore();
    appStore.multiWinSaver.addWin({ winId: "mainClient" });

    let multiWinStore = new MultiWinStore();
    multiWinStore._inject(appStore, MultiWinStore);
    multiWinStore._genClientId = () => "win1";
    multiWinStore.init();

    multiWinStore.createOrOpenWin("win1", "/home", { width: 100, height: 100 });
    expect(appStore.mainClient.createWin).toHaveBeenLastCalledWith(
      "win1",
      { name: "win1", path: "/home", groups: ["main"] },
      { width: 100, height: 100 }
    );
    expect(multiWinStore.clientIds).toEqual(["mainClient", "win1"]);
    expect(multiWinStore.clientIdNameMap).toEqual({ win1: "win1" });
    expect(multiWinStore.groupsMap).toEqual({ win1: ["main"] });

    multiWinStore.createOrOpenWin("win1", "/home2", { width: 100, height: 200 });
    expect(multiWinStore.clientIds).toEqual(["mainClient", "win1"]);
    expect(appStore.mainClient.changeWin).toHaveBeenLastCalledWith(
      appStore.multiWinSaver.getWinInfo("win1"),
      { path: "/home2", name: "win1" },
      { width: 100, height: 200 }
    );
    expect(multiWinStore.clientIdNameMap).toEqual({ win1: "win1" });

    multiWinStore.createOrOpenWin("win1", { path: "/home2", groups: ["group1"] }, { width: 100, height: 200 });
    expect(multiWinStore.groupsMap).toEqual({ win1: ["group1"] });
  });

  test("closeWin/activeWin/sendWinMsg should close window", () => {
    let appStore = new MainAppStore();
    appStore.multiWinSaver.addWin({ winId: "mainClient" });

    let multiWinStore = new MultiWinStore();
    multiWinStore._inject(appStore, MultiWinStore);
    multiWinStore._genClientId = () => "win1";
    multiWinStore.init();

    multiWinStore.createWin({ name: "myWin", path: "/home", groups: ["myGroup"] }, { width: 100, height: 100 });
    multiWinStore.closeWin("win1");
    multiWinStore.activeWin("win1");
    multiWinStore.sendWinMsg("win1", "message");
    expect(appStore.mainClient.closeWin).toHaveBeenCalledWith(appStore.multiWinSaver.getWinInfo("win1"));
    expect(appStore.mainClient.activeWin).toHaveBeenCalledWith(appStore.multiWinSaver.getWinInfo("win1"));
    expect(appStore.mainClient.sendWinMsg).toHaveBeenCalledWith(
      appStore.multiWinSaver.getWinInfo("win1"),
      messageName,
      "message"
    );

    (appStore.mainClient.closeWin as jest.Mock).mockReset();
    (appStore.mainClient.activeWin as jest.Mock).mockReset();
    (appStore.mainClient.sendWinMsg as jest.Mock).mockReset();
    multiWinStore.closeWinByName("myWin");
    multiWinStore.activeWinByName("myWin");
    multiWinStore.sendWinMsgByName("myWin", "message");
    expect(appStore.mainClient.closeWin).toHaveBeenCalledWith(appStore.multiWinSaver.getWinInfo("win1"));
    expect(appStore.mainClient.activeWin).toHaveBeenCalledWith(appStore.multiWinSaver.getWinInfo("win1"));
    expect(appStore.mainClient.sendWinMsg).toHaveBeenCalledWith(
      appStore.multiWinSaver.getWinInfo("win1"),
      messageName,
      "message"
    );

    (appStore.mainClient.closeWin as jest.Mock).mockReset();
    (appStore.mainClient.activeWin as jest.Mock).mockReset();
    (appStore.mainClient.sendWinMsg as jest.Mock).mockReset();
    multiWinStore.closeWinByGroup("myGroup");
    multiWinStore.activeWinByGroup("myGroup");
    multiWinStore.sendWinMsgByGroup("myGroup", "message");
    expect(appStore.mainClient.closeWin).toHaveBeenCalledWith(appStore.multiWinSaver.getWinInfo("win1"));
    expect(appStore.mainClient.activeWin).toHaveBeenCalledWith(appStore.multiWinSaver.getWinInfo("win1"));
    expect(appStore.mainClient.sendWinMsg).toHaveBeenCalledWith(
      appStore.multiWinSaver.getWinInfo("win1"),
      messageName,
      "message"
    );
  });

  test("closeAllWindows should close all window", () => {
    let appStore = new MainAppStore();
    appStore.mainClient.closeWin = jest.fn((winInfo: IWinInfo) => appStore.multiWinSaver.deleteWin(winInfo.winId));
    appStore.multiWinSaver.addWin({ winId: "mainClient" });

    let multiWinStore = new MultiWinStore();
    multiWinStore._inject(appStore, MultiWinStore);
    multiWinStore._genClientId = () => "win1";
    multiWinStore.init();

    multiWinStore.createWin("/home", {});
    multiWinStore.closeAllWindows();
    expect(appStore.mainClient.closeWin).toHaveBeenCalledTimes(2);
    expect((appStore.mainClient.closeWin as jest.Mock).mock.calls[0][0].winId).toEqual("mainClient");
    expect((appStore.mainClient.closeWin as jest.Mock).mock.calls[1][0].winId).toEqual("win1");
  });
});
