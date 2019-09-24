import * as React from 'react';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  root: {
    '& > *': {
      margin: theme.spacing.unit,
    }
  },
});

function Todo2Demo({ state, store, classes }) {
  if (!state.winTodo) return null;
  let { size } = state.winTodo.todo2;
  let { size: todo3Size } = state.winTodo.todo2.todo3;
  let { size: todo3Slice0Size } = state.winTodo.todo2.todo3List[0];
  // let { size: todo3MyKeySize } = state.winTodo.todo2.todo3Map['myKey'];
  const onClick = () => store.stores.winTodoStore.todo2Store.addSize();
  const onClick2 = () => store.stores.winTodoStore.todo2Store.decreaseSize();
  const onClick3 = () => store.stores.winTodoStore.todo2Store.todo3Store.addSize();
  const onClick4 = () => store.stores.winTodoStore.todo2Store.todo3StoreList.get(0).addSize();
  const onClick5 = () => store.stores.winTodoStore.todo2Store.todo3StoreMap.myKey.addSize();
  return (
    <div className={classes.root}>
      <Button color="primary" variant="contained" onClick={onClick}>Add Size {size}</Button>
      <Button color="primary" variant="contained" onClick={onClick2}>Decrease Size {size}</Button>
      <Button color="primary" variant="contained" onClick={onClick3}>Add Todo3 Size {todo3Size}</Button>
      <Button color="primary" variant="contained" onClick={onClick4}>Add Todo3 List Size {todo3Slice0Size}</Button>
      {/* <Button color="primary" variant="contained" onClick={onClick5}>Add Todo3 Map Size {todo3MyKeySize}</Button> */}
    </div>
  );
}

export default {
  title: 'Todo3 Window Local embed Count Demo',
  Component: withStyles(styles)(Todo2Demo),
};