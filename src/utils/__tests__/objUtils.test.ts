import { union } from "../objUtils";

test("Function union should can return array that contain array a and array b", () => {
  let a = [1, 2, 3, 4];
  let b = [2, 3, 1];
  expect(union(a, b)).toEqual([1, 2, 3, 4]);

  expect(union(undefined, a)).toEqual([1, 2, 3, 4]);
});
