import filterApply from "../filterApply";

test("base apply filter", () => {
  expect(filterApply({ a: 1, b: 2, c: { c1: "he", c2: "dd" } }, { c: true })).toEqual({ c: { c1: "he", c2: "dd" } });

  expect(
    filterApply({ a: 1, b: 2, c: { c1: "he", c2: "dd" }, d: { d1: "d" } }, { a: true, b: true, c: true, d: {} })
  ).toEqual({ a: 1, b: 2, c: { c1: "he", c2: "dd" }, d: {} });

  expect(filterApply({ a: 1, b: 2, c: { c1: { cc1: "d" }, c2: "dd" }, d: { d1: "d" } }, { c: { c1: true } })).toEqual({
    c: { c1: { cc1: "d" } },
  });

  expect(filterApply({ a: { d: 1 }, b: { m: "d" } }, { a: true, b: null })).toEqual({ a: { d: 1 } });
});
