/*
  Apply the origin state with updated filter
  
  origin states are link { a: 1, b: 2, c: { c1: 'he', c2: 'dd' }}
  updated filter is like this: { b: true }

  ex: 
  1. filterApply(
    { a: 1, b: 2, c: { c1: 'he', c2: 'dd' } },
    { c: true },
  ) would return
    { c: { c1: 'he', c2: 'dd' } }

  2. filterApply(
    { a: 1, b: { m: 'd' } },
    { b: true },
  ) would return
    { b: { m: 'd' } }

  3. filterApply(
    { a: { d: 1 }, b: { m: 'd' } },
    { a: true },
  ) would return
    { a: { d: 1 } }

  4. filterApply(
    { a: { d: 1 }, b: { m: 'd' } },
    { a: true },
  ) would return
    { a: { d: 1 } }
*/
import { isObject } from "./objUtils";

interface IFilterObject {
  [key: string]: any;
}

export default function filterApply(origin: IFilterObject, updated: IFilterObject) {
  let merged: IFilterObject = {};

  if (isObject(updated)) {
    Object.keys(updated).forEach(key => {
      if (origin.hasOwnProperty(key) && updated[key]) {
        if (updated[key] === true) {
          merged[key] = origin[key];
          return;
        }
        merged[key] = filterApply(origin[key], updated[key]);
      }
    });
  }
  return merged;
}
