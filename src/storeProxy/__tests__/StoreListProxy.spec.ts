import { StoreListProxy } from "../StoreListProxy";
import { IStoreDispatcher } from "../DispatchItemProxy";

describe("StoreListProxy", () => {
  test("should can proxy other methods", () => {
    let storeDispatcher: IStoreDispatcher = {
      handleDispatch: jest.fn(),
      handleDispatchNoReturn: jest.fn(),
      handleDispatchDisposable: jest.fn(),
    };
    let newStore = new StoreListProxy(storeDispatcher, "helloStore");

    newStore.setSize(2);
    expect(storeDispatcher.handleDispatchNoReturn).toHaveBeenLastCalledWith({
      store: "helloStore",
      method: "setSize",
      args: [2],
    });
    expect(newStore.storeArray.length).toEqual(2);

    expect(newStore.get(1).doSome("hello", "do"));
    expect(storeDispatcher.handleDispatch).toHaveBeenLastCalledWith({
      store: "helloStore",
      index: 1,
      method: "doSome",
      args: ["hello", "do"],
    });
  });
});
