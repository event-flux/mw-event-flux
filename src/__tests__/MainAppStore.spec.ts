import MainAppStore from "../MainAppStore";
import { declareStore, StoreBase, RecycleStrategy, declareStoreMap } from "event-flux";
import { IMainClient } from "../mainClientTypes";
import { mainDispatchName, mainReturnName } from "../constants";
import { declareWinStore } from "../StoreDeclarer";

jest.useFakeTimers();

jest.mock("../MainClient", () => {
  class MyMainClient implements IMainClient {
    sendWinMsg = jest.fn();
    activeWin = jest.fn();
    createWin = jest.fn();
    changeWin = jest.fn();
    closeWin = jest.fn();
  }
  return MyMainClient;
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

    jest.runAllTimers();
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenLastCalledWith(
      { winId: "win1" },
      mainDispatchName,
      JSON.stringify({ updated: { todo2: {}, todo1: {} }, deleted: {} })
    );

    mainAppStore.handleReleaseStores("win1", ["todo2Store"]);
    expect(mainAppStore.winHoldStores.win1).toEqual(new Set<string>());
    expect(mainAppStore.winFilters.win1).toEqual({});

    jest.runAllTimers();
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenLastCalledWith(
      { winId: "win1" },
      mainDispatchName,
      JSON.stringify({ updated: {}, deleted: { todo2: true, todo1: true } })
    );
  });

  test("request store and release store for storeMap should behave normally", () => {
    let mainAppStore = new MainAppStore([
      declareStore(StoreBase, [], { stateKey: "todo1", storeKey: "todo1Store" }),
      declareStoreMap(StoreBase, ["todo1Store"], { stateKey: "todo2", storeKey: "todo2Store" }),
    ]);
    mainAppStore.init();

    mainAppStore.multiWinSaver.addWin({ winId: "win1" });
    mainAppStore.multiWinSaver.addWin({ winId: "win2" });

    expect(mainAppStore.winFilters.win1).toEqual({});
    expect(mainAppStore.winHoldStores.win1).toEqual(new Set<string>());

    mainAppStore.handleRequestStores("win1", ["todo2Store"]);
    mainAppStore.handleRequestStores("win2", ["todo2Store"]);
    expect(mainAppStore.winHoldStores.win1).toEqual(new Set<string>(["todo2Store"]));
    expect(mainAppStore.winFilters.win1).toEqual({ todo1: true, todo2: true });
    expect(mainAppStore.winFilters.win2).toEqual({ todo1: true, todo2: true });

    mainAppStore.handleMapRequestStores("win1", "todo2Store", ["key1", "key2"]);
    expect(Array.from(mainAppStore.stores.todo2Store.storeMap.keys())).toEqual(["key1", "key2"]);

    expect(mainAppStore.winHoldStores.win1).toEqual(
      new Set<string>(["todo2Store", "todo2Store@key1", "todo2Store@key2"])
    );
    expect(mainAppStore.winFilters.win1).toEqual({ todo1: true, todo2: { key1: true, key2: true } });
    expect(mainAppStore.winFilters.win2).toEqual({ todo1: true, todo2: {} });

    jest.runAllTimers();
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenNthCalledWith(
      1,
      { winId: "win1" },
      mainDispatchName,
      JSON.stringify({ updated: { todo2: { key1: {}, key2: {} }, todo1: {} }, deleted: {} })
    );
    (mainAppStore.mainClient.sendWinMsg as jest.Mock).mockReset();

    // Request the todo2Store's key2 subStore for win2
    mainAppStore.handleMapRequestStores("win2", "todo2Store", ["key2"]);
    expect(mainAppStore.stores.todo2Store._keyRefs.key2).toBe(2);
    expect(mainAppStore.winHoldStores.win2).toEqual(new Set<string>(["todo2Store", "todo2Store@key2"]));
    expect(mainAppStore.winFilters.win2).toEqual({ todo1: true, todo2: { key2: true } });
    jest.runAllTimers();
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenCalledWith(
      { winId: "win2" },
      mainDispatchName,
      JSON.stringify({ updated: { todo2: { key2: {} } }, deleted: {} })
    );

    mainAppStore.multiWinSaver.addWin({ winId: "win3" });
    mainAppStore.handleRequestStores("win3", ["todo2Store"]);
    expect(mainAppStore.winFilters.win3).toEqual({ todo1: true, todo2: {} });

    (mainAppStore.mainClient.sendWinMsg as jest.Mock).mockReset();
    mainAppStore.handleMapReleaseStores("win1", "todo2Store", ["key1", "key2"]);
    expect(mainAppStore.winFilters.win1).toEqual({ todo1: true, todo2: {} });
    expect(mainAppStore.winHoldStores.win1).toEqual(new Set<string>(["todo2Store"]));
    expect(Array.from(mainAppStore.stores.todo2Store.storeMap.keys())).toEqual(["key2"]);
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenNthCalledWith(
      1,
      { winId: "win1" },
      mainDispatchName,
      JSON.stringify({ updated: {}, deleted: { todo2: { key1: true, key2: true } } })
    );
  });

  test("delete win should release all the stores in that win ", () => {
    let mainAppStore = new MainAppStore([
      declareStore(StoreBase, [], { stateKey: "todo1", storeKey: "todo1Store" }),
      declareStoreMap(StoreBase, ["todo1Store"], { stateKey: "todo2", storeKey: "todo2Store" }),
    ]);
    mainAppStore.setRecycleStrategy(RecycleStrategy.Urgent);
    mainAppStore.init();

    mainAppStore.multiWinSaver.addWin({ winId: "win1" });

    mainAppStore.handleRequestStores("win1", ["todo2Store"]);
    mainAppStore.handleMapRequestStores("win1", "todo2Store", ["key1", "key2"]);

    mainAppStore.multiWinSaver.deleteWin("win1");
    expect(mainAppStore.winFilters).toEqual({});
    expect(mainAppStore.winHoldStores).toEqual({});
    expect(mainAppStore.stores).toEqual({});
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

  test("handleRendererDispatch should can dispatch the method invocation", async () => {
    let mainAppStore = new MainAppStore([
      declareStore(StoreBase, [], { stateKey: "todo2", storeKey: "todo2Store" }),
      declareWinStore(StoreBase, [], { stateKey: "todo1", storeKey: "todo1Store" }),
      declareWinStore(StoreBase, ["todo1Store", "todo2Store"], { stateKey: "todo3", storeKey: "todo3Store" }),
    ]);
    mainAppStore.init();

    mainAppStore.multiWinSaver.addWin({ winId: "win1" });
    mainAppStore.handleRequestStores("win1", ["todo3Store"]);

    await mainAppStore.handleRendererDispatch(
      "win1",
      "1",
      JSON.stringify({ store: "todo2Store", method: "getRefCount", args: [] })
    );
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenLastCalledWith(
      { winId: "win1" },
      mainReturnName,
      "1",
      undefined,
      "1"
    );

    (mainAppStore.mainClient.sendWinMsg as jest.Mock).mockReset();
    await mainAppStore.handleRendererDispatch(
      "win1",
      "2",
      JSON.stringify({ store: "todo1Store", method: "getRefCount", args: [] })
    );
    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenLastCalledWith(
      { winId: "win1" },
      mainReturnName,
      "2",
      undefined,
      "1"
    );

    (mainAppStore.mainClient.sendWinMsg as jest.Mock).mockReset();

    await mainAppStore.handleRendererDispatch(
      "win1",
      "3",
      JSON.stringify({ store: "todo1Store", method: "none", args: [] })
    );

    expect(mainAppStore.mainClient.sendWinMsg).toHaveBeenLastCalledWith(
      { winId: "win1" },
      mainReturnName,
      "3",
      { message: "The store todo1Store's method none is not exists", name: "Error" },
      undefined
    );
  });
});
