import { List, Map } from 'immutable';
const isObject = require('lodash/isObject');
const keys = require('lodash/keys');
const union = require('lodash/union');

const isShallow = (val: any) => Array.isArray(val) || !isObject(val) || List.isList(val);

export default function objectMerge(origin: any, updated: any, deleted: any) {
  /**
   * origin is shallow
   * origin is not shallow, updated is shallow and deleted is deleted is empty(NO Update and No Delete)
   */
  if (isShallow(origin) || (isShallow(updated) && !isObject(deleted))) {
    return updated;
  }

  if (Map.isMap(origin)) {
    let merged, deleteKeys: string[] = [];
    // deleted = isObject(deleted) ? deleted : {};
    merged = origin.withMutations((map: Map<any, any>) => {
      keys(deleted).forEach((key: string) => {
        if (deleted[key] === true) {
          map.delete(JSON.parse(key))
        } else {
          deleteKeys.push(key);
        }
      });
      union(keys(updated), deleteKeys).forEach((key: string) => {
        let originKey = JSON.parse(key);
        map.set(originKey, objectMerge(origin.get(originKey), updated && updated[key], deleted && deleted[key]));
      });
    });
    return merged;
  } else {
    let merged: { [key: string]: any } | undefined;
    let deleteKeys;
    if (isObject(deleted)) {
      merged = {};
      keys(origin).forEach((key: string) => {
        if (deleted[key] !== true) merged![key] = origin[key];
      });
      deleteKeys = keys(deleted).filter((d: string) => deleted[d] !== true)
    } else {
      merged = { ...origin };
    }
    union(keys(updated), deleteKeys).forEach((key: string) => {
      merged![key] = objectMerge(origin[key], updated && updated[key], deleted && deleted[key])
    });
    return merged;
  }
};
