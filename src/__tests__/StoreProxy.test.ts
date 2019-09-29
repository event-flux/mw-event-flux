import { StoreProxy } from "../StoreProxy";

describe("StoreProxy", () => {
  test("StoreProxy should can proxy other methods", () => {
    let storeDispatcher = {
      handleDispatch: jest.fn(),
    };
    let newStore = new StoreProxy(storeDispatcher, "helloStore");
    newStore._addRef();
    expect(newStore._refCount).toEqual(0);
  });
});
