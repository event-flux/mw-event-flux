import StoreBase from '../StoreBase';
import { declareStore, declareStoreMap, declareStoreList } from '../src/StoreDeclarer';
import buildAppStore from '../src/MainAppStore';

class F1Store extends StoreBase {
  constructor() {
    super();
    this.state = { count: 0 };
  }

  add() {
    this.setState({ count: this.state.count + 1 });
  }
}

class F2Store extends StoreBase {
  constructor() {
    super();
    this.state = { size: 0 };
  }

  add() {
    this.setState({ size: this.state.size + 1 });
  }
}
F2Store.innerStores = {
  f1Key: declareStore(F1Store),
  f1ListKey: declareStoreList(F1Store),
  f1MapKey: declareStoreMap(F1Store),
}

test('Build simple app store', () => {
  let appStore = buildAppStore({ f2: F2Store });
  expect(appStore.state.f2.f1Key).toEqual({ count: 0 });
  expect(appStore.state.f2).toEqual({ size: 0, f1Key: { count: 0 }});
  appStore.stores.f2Store.add();
  expect(appStore.state.f2).toEqual({ size: 1, f1Key: { count: 0 }});
});

test('Build simple app store with List', () => {
  let appStore = buildAppStore({ f2: F2Store });
  appStore.stores.f2Store.f1ListKeyStore.setSize(2);
  // console.log('Add List Result:', appStore.state.f2)
  expect(appStore.state.f2.f1ListKey).toEqual([{ count: 0 }, { count: 0 }]);

  appStore.stores.f2Store.f1ListKeyStore.get(0).add();
  expect(appStore.state.f2.f1ListKey).toEqual([{ count: 1 }, { count: 0 }]);

  appStore.stores.f2Store.f1ListKeyStore.get(1).add();
  expect(appStore.state.f2.f1ListKey).toEqual([{ count: 1 }, { count: 1 }]);
});

test('Build simple app store with Map', () => {
  let appStore = buildAppStore({ f2: F2Store });
  appStore.stores.f2Store.f1MapKeyStore.add('d1');
  appStore.stores.f2Store.f1MapKeyStore.add('d2');

  expect(appStore.state.f2.f1MapKey).toEqual({ d1: { count: 0 }, d2: { count: 0 } });

  appStore.stores.f2Store.f1MapKeyStore.get('d1').add();
  expect(appStore.state.f2.f1MapKey).toEqual({ d1: { count: 1 }, d2: { count: 0 } });

  appStore.stores.f2Store.f1MapKeyStore.get('d2').add();
  expect(appStore.state.f2.f1MapKey).toEqual({ d1: { count: 1 }, d2: { count: 1 } });
});