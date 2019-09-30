import filterDifference from "../filterDifference";

test("base diff", () => {
  let retObj = filterDifference({ "*": true, a: 1 }, { "*": false, b: 2 });
  expect(retObj).toEqual({
    updated: { "*": false, b: 2 },
    deleted: { a: true },
  });

  expect(filterDifference({ "*": true, b: 1 }, { "*": false, b: 1 })).toEqual({
    updated: { "*": false },
    deleted: {},
  });

  expect(filterDifference({ "*": true, b: { c: "hello" }, f: "d" }, { "*": true, b: { c: "world" }, d: "mm" })).toEqual(
    {
      updated: { b: { c: "world" }, d: "mm" },
      deleted: { f: true },
    }
  );

  expect(filterDifference({ b: { c: "hello" }, f: "d" }, { b: { c: "world" }, d: "mm" })).toEqual({
    updated: { b: { c: "world" }, d: "mm" },
    deleted: { f: true },
  });

  expect(filterDifference({ b: { c: true }, f: "d" }, { b: { c: { m: true } }, d: "mm" })).toEqual({
    updated: { b: { c: { m: true } }, d: "mm" },
    deleted: { f: true },
  });
});
