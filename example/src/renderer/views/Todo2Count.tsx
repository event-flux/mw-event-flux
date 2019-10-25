import * as React from "react";
import Button from "@material-ui/core/Button";
import { withStyles } from "@material-ui/core/styles";
import { withEventFlux, Filter } from "react-event-flux";

const styles = theme => ({
  root: {
    "& > *": {
      margin: theme.spacing.unit,
    },
  },
});

function Todo2Demo({ simple, simpleList, simpleMap, simpleStore, simpleStoreList, simpleStoreMap, classes }) {
  if (!simple && !simpleList && !simpleMap) {
    return null;
  }
  let { size: todo3Size } = simple;
  let { size: todo3Slice0Size } = simpleList[0] || { size: undefined };
  let { size: todo3MyKeySize } = simpleMap.myKey || { size: undefined };

  const onClick = () => {
    simpleStore.addSize();
  };
  const onClick2 = () => simpleStoreList.get(0).addSize();
  const onClick3 = () => simpleStoreMap.get("myKey").addSize();
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
    </div>
  );
}

const eventFluxArgs = {
  simpleStore: Filter.FA,
  simpleStoreList: Filter.EA,
  simpleStoreMap: Filter.EA,
};

export default {
  title: "simple embed Count Demo",
  Component: withEventFlux(eventFluxArgs)(withStyles(styles)(Todo2Demo)),
};
