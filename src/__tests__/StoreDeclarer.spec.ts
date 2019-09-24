import { StoreBase, DispatchParent, StoreList } from 'event-flux';
import { declareWinStore, declareWinStoreList, declareWinStoreMap } from "../StoreDeclarer";

class TodoStore extends StoreBase<{ todo2: string }> {
  constructor(appStore: DispatchParent) {
    super(appStore);
    this.state = { todo2: 'todo2' };
  }
}

jest.useFakeTimers();

describe('WinStoreDeclarer', () => {
  test('should create normally for 2 params', () => {
    let storeDeclarer = declareWinStore(TodoStore, { args: "hello" });
    expect(storeDeclarer.Store).toBe(TodoStore);
    expect(storeDeclarer.depStoreNames).toEqual([]);
    expect(storeDeclarer.options).toEqual({ storeKey: "todoStore", stateKey: "todo", args: "hello", isPerWin: true });
  });

  test('should create normally for 3 params', () => {
    let storeDeclarer = declareWinStore(TodoStore, ["todo2", "todo3"], { args: "hello" });
    expect(storeDeclarer.Store).toBe(TodoStore);
    expect(storeDeclarer.depStoreNames).toEqual(["todo2", "todo3"]);
    expect(storeDeclarer.options).toEqual({ storeKey: "todoStore", stateKey: "todo", args: "hello", isPerWin: true });
  });
});

describe('WinStoreListDeclarer', () => {
  test('should create normally for 2 params', () => {
    let storeDeclarer = declareWinStoreList(TodoStore, { args: ["hello"] });
    expect(storeDeclarer.Store).toBe(TodoStore);
    expect(storeDeclarer.depStoreNames).toEqual([]);
    expect(storeDeclarer.options).toEqual({ storeKey: "todoStore", stateKey: "todo", args: ["hello"], isPerWin: true });
  });

  test('should create normally for 3 params', () => {
    let storeDeclarer = declareWinStore(TodoStore, ["todo2", "todo3"], { args: "hello" });
    expect(storeDeclarer.Store).toBe(TodoStore);
    expect(storeDeclarer.depStoreNames).toEqual(["todo2", "todo3"]);
    expect(storeDeclarer.options).toEqual({ storeKey: "todoStore", stateKey: "todo", args: "hello", isPerWin: true });
  });
});

describe('WinStoreMapDeclarer', () => {
  test('should create normally for 2 params', () => {
    let storeDeclarer = declareWinStoreMap(TodoStore, { args: ["hello"] });
    expect(storeDeclarer.Store).toBe(TodoStore);
    expect(storeDeclarer.depStoreNames).toEqual([]);
    expect(storeDeclarer.options).toEqual({ storeKey: "todoStore", stateKey: "todo", args: ["hello"], isPerWin: true });
  });

  test('should create normally for 3 params', () => {
    let storeDeclarer = declareWinStoreMap(TodoStore, ["todo2", "todo3"], { args: ["hello"] });
    expect(storeDeclarer.Store).toBe(TodoStore);
    expect(storeDeclarer.depStoreNames).toEqual(["todo2", "todo3"]);
    expect(storeDeclarer.options).toEqual({ storeKey: "todoStore", stateKey: "todo", args: ["hello"], isPerWin: true });
  });
});