import * as React from "react";
import Button from "@material-ui/core/Button";
import { withStyles } from "@material-ui/core/styles";
import { withEventFlux, Filter } from "react-event-flux";
import { StoreDefineObj } from "react-event-flux/lib/withEventFlux";

const styles = theme => ({
  root: {
    "& > *": {
      margin: theme.spacing.unit,
    },
  },
});

function Todo2Demo({
  simple,
  simpleList,
  simpleMap,
  dynamicMap,
  simpleStore,
  simpleStoreList,
  simpleStoreMap,
  dynamicStoreMap,
  classes,
}) {
  if (!simple && !simpleList && !simpleMap) {
    return null;
  }
  let { size: todo3Size } = simple;
  let { size: todo3Slice0Size } = simpleList[0] || { size: undefined };
  let { size: todo3MyKeySize } = simpleMap.myKey || { size: undefined };
  let { size: todo4MyKeySize } = dynamicMap || { size: undefined };

  const onClick = () => {
    simpleStore.addSize();
  };
  const onClick2 = () => simpleStoreList.get(0).addSize();
  const onClick3 = () => simpleStoreMap.get("myKey").addSize();
  const onClick4 = () => dynamicStoreMap.addSize();
  return (
    <div className={classes.root}>
      <Button color="primary" variant="contained" onClick={onClick}>
        Add Simple Size {todo3Size}
      </Button>
      <Button color="primary" variant="contained" onClick={onClick2}>
        Add Simple List Size {todo3Slice0Size}
      </Button>
      <Button color="primary" variant="contained" onClick={onClick3}>
        Add Simple Map Size {todo3MyKeySize}
      </Button>
      <Button color="primary" variant="contained" onClick={onClick4}>
        Add Dynamic Map Size {todo4MyKeySize}
      </Button>
    </div>
  );
}

const eventFluxArgs: StoreDefineObj = {
  simpleStore: Filter.FA,
  simpleStoreList: Filter.EA,
  simpleStoreMap: Filter.EA,
  dynamicStoreMap: { filter: Filter.FA, mapSpread: () => "key" },
};

export default {
  title: "simple embed Count Demo",
  Component: withEventFlux(eventFluxArgs)(withStyles(styles)(Todo2Demo)),
};
