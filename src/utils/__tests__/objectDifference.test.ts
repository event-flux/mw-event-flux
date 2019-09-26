import objectDifference from "../objectDifference";
import { Map, List } from "immutable";

test("base diff", () => {
  let sameObj = { hello: "a" };
  let oldObj = { d: "b", same: sameObj };
  let newObj = { m: "b", same: sameObj };
  let retObj = objectDifference(oldObj, newObj);
  expect(retObj).toEqual({
    updated: { m: "b" },
    deleted: { d: true },
  });
});

test("immutable diff", () => {
  let val1 = Map({ a: 2, b: 3 });
  let val2: Map<any, any> = Map({ a: 3, c: 4 });
  val2 = val2.set({ key: "key" }, { value: "value" });

  let retObj = objectDifference(val1, val2);
  expect(retObj).toEqual({
    updated: {
      [JSON.stringify("a")]: 3,
      [JSON.stringify("c")]: 4,
      [JSON.stringify({ key: "key" })]: { value: "value" },
    },
    deleted: { [JSON.stringify("b")]: true },
  });
});

test("immutable and not immutable diff", () => {
  let val1 = { a: Map({ a: 2, b: 3 }) };
  let val2 = { a: 2, b: 3 };

  let retObj = objectDifference(val1, val2);
  expect(retObj).toEqual({
    updated: {
      a: 2,
      b: 3,
    },
    deleted: {},
  });
});
