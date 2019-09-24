function getQuery(): any {
  let query = {};
  window.location.search.slice(1).split('&').forEach(item => {
    let [key, val] = item.split('=');
    query[key] = val;
  });
  return query;
}

export default getQuery();