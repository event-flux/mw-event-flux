import objectDifference from "../objectDifference";
import objectMerge from "../objectMerge";
import { Map, List, is, fromJS } from "immutable";

test("base merge", () => {
  let sameObj = { hello: "a" };
  let oldObj = { d: "b", same: sameObj };
  let newObj = { m: "b", same: sameObj };
  let { updated, deleted } = objectDifference(oldObj, newObj);
  let retObj = objectMerge(oldObj, updated, deleted);
  expect(retObj).toEqual(newObj);
});

test("base merge with undefined value", () => {
  let sameObj = { hello: "a" };
  let oldObj = { d: "b", same: sameObj, p: 1 };
  let newObj = { m: "b", same: sameObj, p: undefined };
  let { updated, deleted } = objectDifference(oldObj, newObj);
  let retObj = objectMerge(oldObj, updated, deleted);
  expect(retObj).toEqual(newObj);
});

test("base merge with undefined immutable value", () => {
  let sameObj = { hello: "a" };
  let oldObj = fromJS({ d: "b", same: sameObj, same2: sameObj, p: 1 });
  let newObj = fromJS({ m: "b", same: {}, same2: { hello: "b" }, p: undefined });
  let { updated, deleted } = objectDifference(oldObj, newObj);
  expect(updated).toEqual({
    [JSON.stringify("m")]: "b",
    [JSON.stringify("p")]: undefined,
    [JSON.stringify("same2")]: { [JSON.stringify("hello")]: "b" },
  });
  expect(deleted).toEqual({
    [JSON.stringify("d")]: true,
    [JSON.stringify("same")]: { [JSON.stringify("hello")]: true },
  });
  let retObj = objectMerge(oldObj, updated, deleted);
  expect(retObj).toEqual(newObj);
});

test("immutable diff", () => {
  let val1 = Map({ a: 2, b: 3, c: 4 });
  let val2: Map<any, any> = Map({ a: 3, c: 4 });
  val2 = val2.set(10, 10);

  let { updated, deleted } = objectDifference(val1, val2);
  let retObj = objectMerge(val1, updated, deleted);
  expect(retObj.get("b")).toBeUndefined();
  expect(is(retObj, val2)).toBeTruthy();
  expect(retObj.get(10)).toBe(10);
});

test("immutable diff 2", () => {
  let oldPortfolio = {
    portfolioChartInfo: {
      t_913243980: fromJS({
        useIndicatorNames: [],
        compareTickers: [],
        interval: "m5K",
        selectLineType: null,
        tickerSettings: {},
        timespan: "Day5",
        chartType: "candles",
        useShape: "candle",
      }),
    },
  };
  let newPortfolio = {
    portfolioChartInfo: {
      t_913243980: fromJS({
        useIndicatorNames: [],
        compareTickers: [],
        selectLineType: null,
        tickerSettings: {},
        chartType: "candles",
        useShape: "candle",
      }),
    },
  };
  let { updated, deleted } = objectDifference(oldPortfolio, newPortfolio);
  let retObj = objectMerge(oldPortfolio, updated, deleted);
  expect(is(retObj.portfolioChartInfo.t_913243980, newPortfolio.portfolioChartInfo.t_913243980)).toBeTruthy();
});
