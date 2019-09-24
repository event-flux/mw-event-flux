type IFindIndexCallback<T>  = (value: T, index: number, obj: T[]) => boolean;

export default function findIndex<T>(array: T[], callback: IFindIndexCallback<T>): number {
  if (array.findIndex) {
    return array.findIndex(callback);
  }
  let length = array.length;
  for (let i = 0; i < length; i += 1) {
    if (callback(array[i], i, array)) {
      return i;
    }
  }
  return -1;
}