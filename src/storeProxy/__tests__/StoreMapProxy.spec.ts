import { StoreMapProxy } from "../StoreMapProxy";

describe("StoreMapProxy", () => {
  test("should add and delete store proxy", () => {
    let storeDispatcher = {
      handleDispatch: jest.fn(),
      handleDispatchNoReturn: jest.fn(),
    };
    let newStore = new StoreMapProxy(storeDispatcher, "helloStore");

    newStore.add("key1");
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
  });

  test("should requestStore and releaseStore store proxy", () => {
    let storeDispatcher = {
      handleDispatch: jest.fn(),
      handleDispatchNoReturn: jest.fn(),
    };
    let newStore = new StoreMapProxy(storeDispatcher, "helloStore");

    newStore.requestStore("key1");
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "requestStore",
      args: ["key1"],
    });
    storeDispatcher.handleDispatchNoReturn.mockReset();

    newStore.requestStore("key1");
    expect(storeDispatcher.handleDispatchNoReturn).not.toHaveBeenCalled();
    expect(newStore._keyRefs.key1).toEqual(2);

    newStore.releaseStore("key1");
    expect(storeDispatcher.handleDispatchNoReturn).not.toHaveBeenCalled();

    newStore.releaseStore("key1");
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "releaseStore",
      args: ["key1"],
    });
    expect(Array.from(newStore.storeMap.keys())).toEqual([]);

    let disposable1 = newStore.request("key1");
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key1"]);

    let disposable2 = newStore.request("key1");
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key1"]);

    disposable1.dispose();
    expect(Array.from(newStore.storeMap.keys())).toEqual(["key1"]);

    disposable2.dispose();
    expect(Array.from(newStore.storeMap.keys())).toEqual([]);
  });
});
