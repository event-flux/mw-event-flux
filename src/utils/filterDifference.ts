/*
  Takes the old and the new version of an immutable object and
  returns a hash of what has updated (added or changed) in the object
  and what has been deleted in the object (with the entry that has
  been deleted given a value of true).

  ex: 
  1. filterDifference({ m: true, a: 1 }, { m: false, b: 2 }) would return
    { updated: { m: false, b: 2 }, deleted: { a: true } }

  1. filterDifference({ m: true, b: 1 }, { m: false, b: 1 }) would return
    { updated: { m: false } }
*/

import { isObject, isEmpty } from "./objUtils";

const isShallow = (val: any) => Array.isArray(val) || !isObject(val);

interface IFilterObject {
  [key: string]: any;
}

function checkUpdateVal(
  key: string,
  old: IFilterObject,
  curr: IFilterObject,
  updated: IFilterObject,
  deleted: IFilterObject
) {
  let oldVal = old[key];
  let currVal = curr[key];
  if (currVal === oldVal) {
    return;
  }

  if (isShallow(currVal) || isShallow(oldVal)) {
    updated[key] = currVal;
  } else {
    const diff = filterDifference(oldVal, currVal);
    !isEmpty(diff.updated) && (updated[key] = diff.updated);
    !isEmpty(diff.deleted) && (deleted[key] = diff.deleted);
  }
}

function filterDifference(old: IFilterObject, curr: IFilterObject) {
  if (old == null || curr == null) {
    return { updated: curr, deleted: {} };
  }

  const updated: IFilterObject = {};
  const deleted: IFilterObject = {};

  Object.keys(curr).forEach(key => checkUpdateVal(key, old, curr, updated, deleted));
  Object.keys(old).forEach(key => {
    if (!curr.hasOwnProperty(key)) {
      deleted[key] = true;
    }
  });
  return { updated, deleted };
}

export default filterDifference;
