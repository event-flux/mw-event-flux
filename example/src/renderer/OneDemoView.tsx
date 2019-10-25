import * as React from "react";
import Typography from "@material-ui/core/Typography";
import { withStyles } from "@material-ui/core/styles";

const styles = theme => ({
  root: {
    background: "#11181e",
  },
  title: {
    height: 36,
    lineHeight: "36px",
    "border-bottom": "1px solid #F4F4F5",
  },
  view: {
    textAlign: "center" as "center",
    padding: 8,
  },
  bar: {
    height: 36,
    width: "100%",
    background: "#2196f3",
  },
});

class OneDemoView extends React.PureComponent<any, any> {
  render() {
    let { title, Component, classes, onDragStart, onDragEnd, ...otherProps } = this.props;
    return (
      <div className={classes.root} draggable={true} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className={classes.bar} {...otherProps} />
        <Typography variant="inherit" component="h2" color="primary">
          {title}
        </Typography>
        <div className={classes.view}>
          <Component />
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(OneDemoView);
