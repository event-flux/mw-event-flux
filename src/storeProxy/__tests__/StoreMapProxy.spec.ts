import { StoreMapProxy } from "../StoreMapProxy";
import { OperateMode, StoreBase, RecycleStrategy } from "event-flux";
import { IStoreDispatcher } from "../DispatchItemProxy";

describe("StoreMapProxy", () => {
  test("should handle initial keys options", () => {
    let storeDispatcher: IStoreDispatcher = {
      handleDispatch: jest.fn(),
      handleDispatchNoReturn: jest.fn(),
      handleDispatchDisposable: jest.fn(),
    };
    let newStore = new StoreMapProxy(storeDispatcher, "helloStore");
    newStore._inject(StoreBase, "hello", {}, undefined, { keys: ["key1"] });
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "add",
      args: [["key1"]],
    });
  });

  test("should add and delete store proxy", () => {
    let storeDispatcher: IStoreDispatcher = {
      handleDispatch: jest.fn(),
      handleDispatchNoReturn: jest.fn(),
      handleDispatchDisposable: jest.fn(),
    };
    let newStore = new StoreMapProxy(storeDispatcher, "helloStore");

    newStore.add("key1");
    expect(newStore.operateModeSwitch.operateMode).toEqual(OperateMode.Direct);
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "add",
      args: ["key1"],
    });
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key1"]);

    newStore.add(["key1", "key2", "key3"]);
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "add",
      args: [["key1", "key2", "key3"]],
    });
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key1", "key2", "key3"]);

    newStore.delete("key1");
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "delete",
      args: ["key1"],
    });
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key2", "key3"]);

    newStore.delete(["key1"]);
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "delete",
      args: [["key1"]],
    });
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key2", "key3"]);

    expect(newStore.get("key2")!.doSome("hello", "do"));
    expect(storeDispatcher.handleDispatch).toHaveBeenLastCalledWith({
      store: "helloStore",
      index: "key2",
      method: "doSome",
      args: ["hello", "do"],
    });

    expect(() => newStore.request("key2")).toThrowError();
  });

  test("should requestStore and releaseStore store proxy", () => {
    let storeDispatcher: IStoreDispatcher = {
      handleDispatch: jest.fn(),
      handleDispatchNoReturn: jest.fn(),
      handleDispatchDisposable: jest.fn(),
      handleMainMapRequestStores: jest.fn(),
      handleMainMapReleaseStores: jest.fn(),
      _recycleStrategy: RecycleStrategy.Urgent,
    };
    let newStore = new StoreMapProxy(storeDispatcher, "helloStore");

    newStore.requestStore("key1");
    expect(storeDispatcher.handleMainMapRequestStores).toHaveBeenLastCalledWith("helloStore", ["key1"]);
    (storeDispatcher.handleMainMapRequestStores as jest.Mock).mockReset();

    newStore.requestStore("key1");
    expect(storeDispatcher.handleMainMapRequestStores).not.toHaveBeenCalled();
    expect(newStore._keyRefs.key1).toEqual(2);

    newStore.releaseStore("key1");
    expect(storeDispatcher.handleMainMapRequestStores).not.toHaveBeenCalled();

    newStore.releaseStore("key1");
    expect(storeDispatcher.handleMainMapReleaseStores).toHaveBeenLastCalledWith("helloStore", ["key1"]);
    expect(Array.from(newStore.storeMap.keys())).toEqual([]);

    let disposable1 = newStore.request("key1");
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key1"]);

    let disposable2 = newStore.request("key1");
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key1"]);

    disposable1.dispose();
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key1"]);

    disposable2.dispose();
    expect(Array.from(newStore.storeMap.keys())).toEqual([]);

    expect(() => newStore.add("key2")).toThrowError();
  });

  test("should request with recycle strategy", () => {
    let storeDispatcher: IStoreDispatcher = {
      handleDispatch: jest.fn(),
      handleDispatchNoReturn: jest.fn(),
      handleDispatchDisposable: jest.fn(),
      handleMainMapRequestStores: jest.fn(),
      handleMainMapReleaseStores: jest.fn(),
      _recycleStrategy: RecycleStrategy.Urgent,
    };
    let newStore = new StoreMapProxy(storeDispatcher, "helloStore");
    newStore.requestStore("key1");
    newStore.releaseStore("key1");
    expect(Array.from(newStore.storeMap.keys())).toEqual([]);

    storeDispatcher._recycleStrategy = RecycleStrategy.Never;
    newStore.requestStore("key1");
    newStore.releaseStore("key1");
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key1"]);

    newStore.setRecycleStrategy(RecycleStrategy.Urgent);
    expect(Array.from(newStore.storeMap.keys())).toEqual([]);

    newStore.setRecycleStrategy(RecycleStrategy.Cache, { cacheLimit: 2 });
    ["key1", "key2", "key3"].forEach(name => newStore.requestStore(name));
    ["key1", "key2", "key3"].forEach(name => newStore.releaseStore(name));
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key2", "key3"]);

    newStore.requestStore("key2");
    expect(Object.keys(newStore._keyCache!.cache)).toEqual(["key3"]);
  });
});
