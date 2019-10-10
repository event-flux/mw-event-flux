import { StoreProxy } from "../storeProxy/StoreProxy";

describe("StoreProxy", () => {
  test("StoreProxy should can proxy other methods", () => {
    let storeDispatcher = {
      handleDispatch: jest.fn(),
      handleDispatchNoReturn: jest.fn(),
    };
    let newStore = new StoreProxy(storeDispatcher, "helloStore");
    newStore._addRef();
    expect(newStore._refCount).toEqual(1);
    expect(newStore.getRefCount()).toBe(1);

    expect(newStore._decreaseRef());
    expect(newStore.getRefCount()).toBe(0);

    newStore.hello("hello");
    expect(storeDispatcher.handleDispatch).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "hello",
      args: ["hello"],
    });
  });
});
