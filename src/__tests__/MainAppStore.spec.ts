import MainAppStore from "../MainAppStore";
import { declareStore, StoreBase, RecycleStrategy } from "event-flux";
import { IMainClient } from "../mainClientTypes";
import { mainDispatchName } from "../constants";
import { declareWinStore } from "../StoreDeclarer";

jest.mock("../MainClient", () => {
  class MyMainClient implements IMainClient {
    sendWinMsg = jest.fn();
    activeWin = jest.fn();
    createWin = jest.fn();
    changeWin = jest.fn();
  }
  return { default: MyMainClient };
});

describe("MainAppStore", () => {
  test("should create successfully", () => {
    let mainAppStore = new MainAppStore([declareStore(StoreBase, [], { stateKey: "todo", storeKey: "todoStore" })]);
    mainAppStore.init();
    expect(mainAppStore.outStoreDeclarers).toEqual(
      JSON.stringify([{ storeKey: "todoStore", stateKey: "todo", storeType: "Item", depStoreNames: [] }])
    );
  });

  test("add win and request store should behave normally", () => {
    let mainAppStore = new MainAppStore([
      declareStore(StoreBase, [], { stateKey: "todo1", storeKey: "todo1Store" }),
      declareStore(StoreBase, ["todo1Store"], { stateKey: "todo2", storeKey: "todo2Store" }),
    ]);
    mainAppStore.init();

    mainAppStore.multiWinSaver.addWin({ winId: "win1" });
    expect(mainAppStore.winFilters.win1).toEqual({});
    expect(mainAppStore.winHoldStores.win1).toEqual(new Set<string>());

    mainAppStore.handleRequestStores("win1", ["todo2Store"]);
    expect(mainAppStore.winHoldStores.win1).toEqual(new Set<string>(["todo2Store"]));
    expect(mainAppStore.winFilters.win1).toEqual({ todo1: true, todo2: true });
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenLastCalledWith(
      { winId: "win1" },
      mainDispatchName,
      JSON.stringify({ updated: { todo2: {}, todo1: {} }, deleted: {} })
    );

    mainAppStore.handleReleaseStores("win1", ["todo2Store"]);
    expect(mainAppStore.winHoldStores.win1).toEqual(new Set<string>());
    expect(mainAppStore.winFilters.win1).toEqual({});
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenLastCalledWith(
      { winId: "win1" },
      mainDispatchName,
      JSON.stringify({ updated: {}, deleted: { todo2: true, todo1: true } })
    );
  });

  test("requestStore and releaseStore can handle win specific stores", () => {
    let mainAppStore = new MainAppStore([
      declareStore(StoreBase, [], { stateKey: "todo2", storeKey: "todo2Store" }),
      declareWinStore(StoreBase, [], { stateKey: "todo1", storeKey: "todo1Store" }),
      declareWinStore(StoreBase, ["todo1Store", "todo2Store"], { stateKey: "todo3", storeKey: "todo3Store" }),
    ]);
    mainAppStore.setRecycleStrategy(RecycleStrategy.Urgent);
    mainAppStore.init();

    mainAppStore.requestStore("todo3Store", "win1");
    expect(Object.keys(mainAppStore.stores).sort()).toEqual(["todo1Store@win1", "todo2Store", "todo3Store@win1"]);
    expect(mainAppStore.state).toEqual({ "todo1@win1": {}, todo2: {}, "todo3@win1": {} });

    mainAppStore.releaseStore("todo3Store", "win1");
    expect(mainAppStore.stores).toEqual({});
    expect(mainAppStore.state).toEqual({ "todo1@win1": undefined, todo2: undefined, "todo3@win1": undefined });
  });

  test("transformWinState should transform win spec stateKey to plain key", () => {
    expect(
      MainAppStore.prototype._transformWinState({
        todo2: 12,
        "todo3@win1": 23,
      })
    ).toEqual({ todo2: 12, todo3: 23 });
  });

  test("handleWillChange should forward the diff state to renderer process", () => {
    let mainAppStore = new MainAppStore([
      declareStore(StoreBase, [], { stateKey: "todo2", storeKey: "todo2Store" }),
      declareWinStore(StoreBase, [], { stateKey: "todo1", storeKey: "todo1Store" }),
      declareWinStore(StoreBase, ["todo1Store", "todo2Store"], { stateKey: "todo3", storeKey: "todo3Store" }),
    ]);
    mainAppStore.init();

    mainAppStore.multiWinSaver.addWin({ winId: "win1" });
    mainAppStore.handleRequestStores("win1", ["todo3Store"]);

    mainAppStore.handleWillChange({ todo2: { todo2: 2 } }, { todo2: { todo2: 3, todo3: 1 } });
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenLastCalledWith(
      { winId: "win1" },
      mainDispatchName,
      JSON.stringify({
        updated: { todo2: { todo2: 3, todo3: 1 } },
        deleted: {},
      })
    );

    mainAppStore.handleWillChange({ todo1: 12, "todo1@win1": "win1" }, { todo1: 10, "todo1@win1": "win2" });
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenLastCalledWith(
      { winId: "win1" },
      mainDispatchName,
      JSON.stringify({
        updated: { todo1: "win2" },
        deleted: {},
      })
    );
  });
});
