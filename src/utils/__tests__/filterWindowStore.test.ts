import { filterWindowStore, filterWindowState, filterWindowDelta } from '../filterWindowStore';

test('filterWindowStore test', () => {
  expect(filterWindowStore({
    winManagerStore: {
      type: "Store",
      filters: {
        winPackMapStore: {
          filters: {
            winTodoStore: { type: "Store" }
          },
          type: "StoreMap"
        }
      }
    }
  }, 'winManagerStore', 'mainClient')).toEqual({
    winTodoStore: { 
      type: "Store", 
      path: ['winManagerStore', {type: "Map", name: "winPackMapStore", index: "mainClient"}] 
    }
  });
});

test('filterWindowState test', () => {
  expect(filterWindowState({ 
    winManager: { 
      winPackMap: { 
        mainClient: 
        { winTodo: { todo: 0 } }
      } 
    }  
  }, 'winManager', 'mainClient')).toEqual({ winTodo: { todo: 0 } });

  expect(filterWindowDelta({ 
    winManager: { 
      winPackMap: { 
        mainClient: 
        { winTodo: { todo: 0 } }
      } 
    }  
  }, { winManager: {} }, 'winManager', 'mainClient')).toEqual(
    [{ winTodo: { todo: 0 } }, {}]
  );
});