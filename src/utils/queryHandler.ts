export function decodeQuery(queryStr: string) {
  let query: { [key: string]: string } = {};
  if (queryStr) {
    queryStr.split("&").forEach(item => {
      let [key, val] = item.split("=");
      if (key && val) {
        query[key] = decodeURIComponent(val);
      }
    });
  }
  return query as any;
}

export function encodeQuery(obj: any): string {
  let compList: string[] = [];
  for (let key in obj) {
    if (obj[key]) {
      compList.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`);
    }
  }
  return compList.join("&");
}
