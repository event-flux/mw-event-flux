import addStateFilter from "../stateFilterDecorator";
import addStateFilterForMap from "../stateFilterMapDecorator";
import { Emitter } from "event-kit";

class MockManagerStore {
  emitter = new Emitter();
  clientIds: string[] = [];

  getClienIds() {
    return this.clientIds;
  }

  addWin(clientId: string) {
    this.clientIds.push(clientId);
    this.emitter.emit("add-win", clientId);
  }

  removeWin(clientId: string) {
    let index = this.clientIds.indexOf(clientId);
    if (index !== -1) {
      this.clientIds.splice(index, 1);
    }
    this.emitter.emit("remove-win", clientId);
  }

  onDidAddWin(callback: (win: any) => void) {
    return this.emitter.on("add-win", callback);
  }

  onDidRemoveWin(callback: (clientId: string) => void) {
    return this.emitter.on("remove-win", callback);
  }
}

let managerStore: MockManagerStore;
let Base1Class: any;

beforeEach(() => {
  managerStore = new MockManagerStore();
  Base1Class = class {
    emitter = new Emitter();
    appStores = {
      winManagerStore: managerStore,
    };
    batchUpdater = {
      addTask: (fn: () => void) => {
        fn();
      },
    };

    getSubStoreInfos() {
      return [];
    }
    _initWrap() {}
  };
});

test("addStateFilter", () => {
  const Base1DeriveClass = addStateFilter(Base1Class);
  let base1Instance = new Base1DeriveClass();
  class Base2Class extends Base1Class {
    subStore = base1Instance;
    getSubStoreInfos() {
      return [[null, null, "subStore", "subState"]];
    }
  }

  let StateFilterClass = addStateFilter(Base2Class as any);
  let stateFilterInstance = new StateFilterClass();

  base1Instance._initWrap();
  stateFilterInstance._initWrap();
  managerStore.addWin("client1");
  stateFilterInstance._handleAddWin("client1");

  expect(base1Instance._stateFilters).toEqual({ client1: { "*": false } });
  expect(stateFilterInstance._stateFilters).toEqual({ client1: { "*": false, subState: { "*": false } } });

  let filterFn = jest.fn();
  stateFilterInstance.emitter.on("did-filter-update", filterFn);
  base1Instance.listen("client1");
  expect(stateFilterInstance._stateFilters).toEqual({ client1: { "*": false, subState: { "*": true } } });
  expect(filterFn).toHaveBeenCalledWith({
    clientId: "client1",
    filters: { "*": false, subState: { "*": true } },
  });

  stateFilterInstance.listen("client1");
  expect(stateFilterInstance._stateFilters).toEqual({ client1: { "*": true, subState: { "*": true } } });
  expect(filterFn).toHaveBeenCalledWith({
    clientId: "client1",
    filters: { "*": true, subState: { "*": true } },
  });

  stateFilterInstance.unlisten("client1");
  expect(stateFilterInstance._stateFilters).toEqual({ client1: { "*": false, subState: { "*": true } } });
});

test("addStateFilter for defaultFilter option", () => {
  const Base1DeriveClass = addStateFilter(Base1Class);
  let base1Instance = new Base1DeriveClass();

  class Base2Class extends Base1Class {
    options = { defaultFilter: true };
    subStore = base1Instance;
    getSubStoreInfos() {
      return [[null, null, "subStore", "subState"]];
    }
  }

  let StateFilterClass = addStateFilter(Base2Class as any);
  let stateFilterInstance = new StateFilterClass();
  base1Instance._initWrap();
  stateFilterInstance._initWrap();
  managerStore.addWin("client1");
  stateFilterInstance._handleAddWin("client1");

  expect(base1Instance._stateFilters).toEqual({ client1: { "*": false } });
  expect(stateFilterInstance._stateFilters).toEqual({ client1: { "*": true, subState: { "*": false } } });
});

test("addStateFilterForMap", () => {
  const Base1DeriveClass = addStateFilter(Base1Class);
  let base1Instance = new Base1DeriveClass();
  let base2Instance = new Base1DeriveClass();
  class Base2Class extends Base1Class {
    storeMap = new Map([["item1", base1Instance], ["item2", base2Instance]]);
  }

  let StateFilterClass: any = addStateFilterForMap(Base2Class as any);
  let stateFilterInstance = new StateFilterClass();

  base1Instance._initWrap();
  base2Instance._initWrap();
  stateFilterInstance._initWrap();
  managerStore.addWin("client1");
  stateFilterInstance._handleAddWin("client1");

  expect(stateFilterInstance._stateFilters).toEqual({ client1: { "*": false } });

  let filterFn = jest.fn();
  stateFilterInstance.emitter.on("did-filter-update", filterFn);

  base1Instance.listen("client1");
  base2Instance.listen("client1");
  stateFilterInstance.listenForKeys("client1", "item1");
  expect(stateFilterInstance._stateFilters).toEqual({ client1: { "*": false, item1: { "*": true } } });
  expect(filterFn).toHaveBeenCalledWith({ clientId: "client1", filters: { "*": false, item1: { "*": true } } });

  stateFilterInstance.listenForKeys("client1", "item2");
  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": false, item1: { "*": true }, item2: { "*": true } },
  });

  stateFilterInstance.unlistenForKeys("client1", "item2");
  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": false, item1: { "*": true }, item2: false },
  });

  base1Instance.unlisten("client1");
  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": false, item1: { "*": false }, item2: false },
  });
});

test("addStateFilterForMap for multi listen and unlisten", () => {
  const Base1DeriveClass = addStateFilter(Base1Class);
  let base1Instance = new Base1DeriveClass();
  let base2Instance = new Base1DeriveClass();
  class Base2Class extends Base1Class {
    storeMap = new Map([["item1", base1Instance], ["item2", base2Instance]]);
  }

  let StateFilterClass: any = addStateFilterForMap(Base2Class as any);
  let stateFilterInstance = new StateFilterClass();

  base1Instance._initWrap();
  base2Instance._initWrap();
  stateFilterInstance._initWrap();
  managerStore.addWin("client1");
  managerStore.addWin("client2");
  stateFilterInstance._handleAddWin("client1");
  stateFilterInstance._handleAddWin("client2");

  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": false },
    client2: { "*": false },
  });

  let filterFn = jest.fn();
  stateFilterInstance.emitter.on("did-filter-update", filterFn);

  base1Instance.listen("client1");
  base2Instance.listen("client1");

  for (let i = 0; i < 2; i += 1) {
    stateFilterInstance.listenForKeys("client1", ["item1"]);
    expect(stateFilterInstance._stateFilters).toEqual({
      client1: { "*": false, item1: { "*": true } },
      client2: { "*": false },
    });
    base1Instance.listen("client1");
  }
  expect(stateFilterInstance._stateListeners).toEqual({
    ["client1" + "item1"]: 2,
  });

  stateFilterInstance.unlistenForKeys("client1", ["item1"]);
  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": false, item1: { "*": true } },
    client2: { "*": false },
  });
  stateFilterInstance.unlistenForKeys("client1", ["item1"]);
  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": false, item1: false },
    client2: { "*": false },
  });
  expect(stateFilterInstance._stateListeners).toEqual({
    ["client1" + "item1"]: 0,
  });

  base2Instance.listen("client1");
  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": false, item1: false },
    client2: { "*": false },
  });
});

test("addStateFilterForMap for defaultFilter option", () => {
  const Base1DeriveClass = addStateFilter(Base1Class);
  let base1Instance = new Base1DeriveClass();
  let base2Instance = new Base1DeriveClass();
  class Base2Class extends Base1Class {
    options = { defaultFilter: true };
    storeMap = new Map([["item1", base1Instance], ["item2", base2Instance]]);
    add(key: string) {
      let newStore = new Base1DeriveClass();
      newStore._initWrap();
      return newStore;
    }
    delete(key: string) {}
  }

  let StateFilterClass: any = addStateFilterForMap(Base2Class as any);
  let stateFilterInstance = new StateFilterClass();

  base1Instance._initWrap();
  base2Instance._initWrap();
  stateFilterInstance._initWrap();
  managerStore.addWin("client1");
  stateFilterInstance._handleAddWin("client1");

  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": true, item1: { "*": false }, item2: { "*": false } },
  });

  stateFilterInstance.add("item3", null);
  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": true, item1: { "*": false }, item2: { "*": false }, item3: { "*": false } },
  });

  stateFilterInstance.delete("item3");
  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": true, item1: { "*": false }, item2: { "*": false }, item3: null },
  });

  managerStore.addWin("client2");
  stateFilterInstance._handleAddWin("client2");

  expect(stateFilterInstance._stateFilters).toEqual({
    client1: { "*": true, item1: { "*": false }, item2: { "*": false }, item3: null },
    client2: { "*": true, item1: { "*": false }, item2: { "*": false } },
  });
});
