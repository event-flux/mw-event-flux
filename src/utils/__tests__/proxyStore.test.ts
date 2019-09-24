import StoreProxyHandler from '../StoreProxyHandler';

test('basic', () => {
  const storeFilters = {
    store1: {
      type: 'Store' as 'Store',
      filters: null,
      path: ['path1'],
    },
  };
  let mockFn = jest.fn();
  let stores = new StoreProxyHandler().proxyStores(storeFilters, mockFn);
  stores.store1.hello('arg1');
  expect(mockFn.mock.calls[0]).toEqual([{ 
    store: ['path1', 'store1'], method: 'hello', args: ['arg1']
  }]);
});

test('nest', () => {
  const storeFilters = {
    store1: {
      type: 'Store' as 'Store',
      filters: {
        store2: {
          type: 'Store' as 'Store',
          filters: null,
        }
      },
      path: ['path1'],
    }
  };
  let mockFn = jest.fn();
  let stores = new StoreProxyHandler().proxyStores(storeFilters, mockFn);
  stores.store1.store2.hello('world');
  expect(mockFn.mock.calls[0]).toEqual([{
    store: ['path1', 'store1', 'store2'], method: 'hello', args: ['world']
  }]);
});

test('store map', () => {
  const storeFilters = {
    store1: {
      type: 'StoreMap' as 'StoreMap',
      filters: {
        store2: {
          type: 'Store' as 'Store',
          filters: null,
        },
      },
      path: ['path1'],
    }
  };
  let mockFn = jest.fn();
  let stores = new StoreProxyHandler().proxyStores(storeFilters, mockFn);
  stores.store1.get('Key').store2.hello('world');
  expect(mockFn.mock.calls[0]).toEqual([{
    store: ['path1', { name: 'store1', type: 'Map', index: 'Key' }, 'store2'], 
    method: 'hello', 
    args: ['world']
  }]);

  // Expect get the same store when map key is the same
  expect(stores.store1.get('Key')).toBe(stores.store1.get('Key'));
});

test('store map compare', () => {
  const storeFilters = {
    store1: {
      type: 'StoreMap' as 'StoreMap',
      filters: {
        store2: {
          type: 'Store' as 'Store',
          filters: null,
        },
      },
      path: ['path1'],
    },
    store3: {
      type: 'StoreMap' as 'StoreMap',
      filters: {
        store2: {
          type: 'Store' as 'Store',
          filters: null,
        },
      },
      path: [],
    }
  };
  let mockFn = jest.fn();
  let stores = new StoreProxyHandler().proxyStores(storeFilters, mockFn);

  expect(stores.store1.get('Key')).toBe(stores.store1.get('Key'));
  expect(stores.store1.get('Key')).not.toBe(stores.store3.get('Key'));
  expect(stores.store1.get('Key').store2).toBe(stores.store1.get('Key').store2);
});