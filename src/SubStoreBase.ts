import StoreBase from './StoreBase';
import { DisposableLike } from 'event-kit';

class SubIdGenerator {
  count = 0;
  prefix = Math.random().toString(36).slice(2, 5);

  genId() {
    this.count += 1;
    return this.prefix + this.count;
  }
}

// The StoreBase that can subscribe and unsubscribe
export default class SubStoreBase extends StoreBase {
  subMap: { [subId: string]: DisposableLike } = {};
  idGenerator = new SubIdGenerator();

  unsubscribe(subId: string) {
    let dispose = this.subMap[subId];
    if (!dispose) console.error(`The subId ${subId} isnot subscribed`);
    dispose && dispose.dispose();
    delete this.subMap[subId];
  }

  genSubId(dispose: DisposableLike) {
    let id = this.idGenerator.genId();
    this.subMap[id] = dispose;
    return id;
  }

  dispose() {
    super.dispose();
    let subMap = this.subMap;
    Object.keys(subMap).forEach(key => subMap[key] && subMap[key].dispose());
  }
}
