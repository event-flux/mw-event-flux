import filterApply from "../filterApply";
import { Map, List } from "immutable";

test("base apply filter", () => {
  expect(
    filterApply({ a: 1, b: 2, c: { c1: "he", c2: "dd" } }, { "*": false, "*@exclude": ["c"], c: { "*": true } }, {})
  ).toEqual({ c: { c1: "he", c2: "dd" } });

  expect(
    filterApply(
      { a: 1, b: 2, c: { c1: "he", c2: "dd" }, d: { d1: "d" } },
      { "*": true, "*@exclude": ["c", "d"], c: { "*": true } },
      { d: true }
    )
  ).toEqual({ a: 1, b: 2, c: { c1: "he", c2: "dd" }, d: undefined });

  expect(
    filterApply(
      { a: 1, b: 2, c: { c1: { cc1: "d" }, c2: "dd" }, d: { d1: "d" } },
      { "*": true, "*@exclude": ["c", "d"], c: { c1: { "*": true } } },
      { d: true }
    )
  ).toEqual({ a: 1, b: 2, c: { c1: { cc1: "d" } }, d: undefined });

  expect(filterApply({ a: { d: 1 }, b: { m: "d" } }, { a: { "*": true }, b: null }, {})).toEqual({ a: { d: 1 } });
});

test("advanced apply test", () => {
  expect(
    filterApply(
      {
        winManager: {
          clientIds: ["mainClient", "win4851"],
          winPackMap: {
            mainClient: {
              actionRecord: {},
              winTodo: {
                count: 0,
                isComplete: undefined,
                todo2: {
                  size: 0,
                  todo3: { size: 0 },
                  todo3List: [{ size: 0 }],
                  todo3Map: { myKey: { size: 0 } },
                  todo4: { todo4Map: Map(), todo4List: List() },
                },
              },
            },
          },
        },
      },
      {
        "*": false,
        multiWin: { "*": true },
        todo: { "*": true },
        winManager: {
          "*": false,
          winPackMap: {
            "*": true,
            mainClient: {
              "*": true,
              actionRecord: { "*": true },
              winTodo: {
                "*": false,
                todo2: {
                  "*": false,
                  todo3: { "*": false },
                  todo3List: { "*": true },
                  todo3Map: { "*": false },
                  todo4: { "*": false },
                },
              },
            },
          },
        },
      },
      null
    )
  ).toEqual({
    winManager: {
      winPackMap: {
        mainClient: {
          actionRecord: {},
          winTodo: {
            todo2: {
              todo3: {},
              todo3List: [{ size: 0 }],
              todo3Map: {},
              todo4: {},
            },
          },
        },
      },
    },
  });
});
