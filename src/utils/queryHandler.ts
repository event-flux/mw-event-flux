export function decodeQuery(queryStr: string) {
  let query: { [key: string]: string } = {};
  queryStr.split("&").forEach(item => {
    let [key, val] = item.split("=");
    query[key] = decodeURIComponent(val);
  });
  return query as any;
}

export function encodeQuery(obj: any): string {
  let compList: string[] = [];
  for (let key in obj) {
    compList.push(`${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}}`);
  }
  return compList.join("&");
}
