import filterDifference from "../filterDifference";

test("base diff", () => {
  let retObj = filterDifference({ "*": true, a: 1 }, { "*": false, b: 2 });
  expect(retObj).toEqual({
    updated: { "*": false, b: 2, "*@exclude": ["b"] },
    deleted: { a: true },
  });

  expect(filterDifference({ "*": true, b: 1 }, { "*": false, b: 1 })).toEqual({
    updated: { "*": false, "*@exclude": ["b"] },
    deleted: {},
  });

  expect(filterDifference({ "*": true, b: { c: "hello" }, f: "d" }, { "*": true, b: { c: "world" }, d: "mm" })).toEqual(
    {
      updated: { b: { c: "world" }, d: "mm" },
      deleted: { f: true },
    }
  );
});
