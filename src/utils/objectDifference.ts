/*
  Takes the old and the new version of an immutable object and
  returns a hash of what has updated (added or changed) in the object
  and what has been deleted in the object (with the entry that has
  been deleted given a value of true).

  ex: objectDifference({a: 1}, {b: 2}) would return
    {updated: {b: 2}, deleted: {a: true}}
*/

import { Map, List } from "immutable";
const isObject = require("lodash/isObject");
const isEmpty = require("lodash/isEmpty");
const keys = require("lodash/keys");

const isShallow = (val: any) => Array.isArray(val) || !isObject(val) || List.isList(val);

const isDiffType = (val1: any, val2: any) =>
  (Map.isMap(val1) && !Map.isMap(val2)) || (!Map.isMap(val1) && Map.isMap(val2));

function checkUpdateVal(
  key: string,
  oldVal: any,
  currVal: any,
  updated: { [key: string]: any },
  deleted: { [key: string]: any }
) {
  if (currVal === oldVal) {
    return;
  }

  if (isShallow(currVal) || isShallow(oldVal)) {
    updated[key] = currVal;
  } else if (isDiffType(currVal, oldVal)) {
    updated[key] = currVal;
  } else {
    const diff = objectDifference(oldVal, currVal);
    !isEmpty(diff.updated) && (updated[key] = diff.updated);
    !isEmpty(diff.deleted) && (deleted[key] = diff.deleted);
  }
}

function objectDifference(old: any, curr: any) {
  const updated: { [key: string]: any } = {};
  const deleted: { [key: string]: any } = {};

  if (Map.isMap(old) && Map.isMap(curr)) {
    curr.forEach((val: any, key: string) => checkUpdateVal(JSON.stringify(key), old.get(key), val, updated, deleted));

    old.forEach((val: any, key: string) => {
      if (curr.get(key) === undefined) {
        deleted[JSON.stringify(key)] = true;
      }
    });
  } else {
    keys(curr).forEach((key: string) => checkUpdateVal(key, old[key], curr[key], updated, deleted));
    keys(old).forEach((key: string) => {
      if (curr[key] === undefined) {
        deleted[key] = true;
      }
    });
  }
  return { updated, deleted };
}

export default objectDifference;
