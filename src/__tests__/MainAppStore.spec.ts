import MainAppStore from "../MainAppStore";
import { declareStore, StoreBase } from "event-flux";
import { IMainClient } from "../mainClientTypes";

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
    expect(mainAppStore.winFilters.win1).toEqual([]);
    expect(mainAppStore.winHoldStores.win1).toEqual([]);

    mainAppStore.handleRequestStores("win1", ["todo2Store"]);
    expect(mainAppStore.winHoldStores.win1).toEqual(["todo2Store"]);
    expect(mainAppStore.winHoldStores.win1).toEqual([]);
  });
});
