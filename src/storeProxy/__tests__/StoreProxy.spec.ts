import { StoreProxy } from "../StoreProxy";
import { IStoreDispatcher } from "../DispatchItemProxy";

describe("StoreProxy", () => {
  test("should can proxy other methods", () => {
    let storeDispatcher: IStoreDispatcher = {
      handleDispatch: jest.fn(),
      handleDispatchNoReturn: jest.fn(),
      handleDispatchDisposable: jest.fn(),
    };
    let newStore = new StoreProxy(storeDispatcher, "helloStore", ["onDidUpdate"], ["doInvoke"]);
    newStore._addRef();
    expect(newStore._refCount).toEqual(1);
    expect(newStore.getRefCount()).toBe(1);

    expect(newStore._decreaseRef());
    expect(newStore.getRefCount()).toBe(0);

    newStore.hello("hello");
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "hello",
      args: ["hello"],
    });

    newStore.doInvoke("hello");
    expect(storeDispatcher.handleDispatch).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "doInvoke",
      args: ["hello"],
    });

    let observer = jest.fn();
    newStore.onDidUpdate(observer);
    expect(storeDispatcher.handleDispatchDisposable).toHaveBeenLastCalledWith(
      {
        store: "helloStore",
        method: "onDidUpdate",
      },
      observer
    );
  });
});
