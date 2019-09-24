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
  if (!state.todo) return null;
  let { size } = state.todo.todo2;
  let { size: todo3Size } = state.todo.todo2.todo3;
  let { size: todo3Slice0Size } = state.todo.todo2.todo3List[0] || { size: undefined };
  let { size: todo3MyKeySize } = state.todo.todo2.todo3Map['myKey'] || { size: undefined };
  const onClick = () => store.stores.todoStore.todo2Store.addSize();
  const onClick2 = () => store.stores.todoStore.todo2Store.decreaseSize();
  const onClick3 = () => {
    store.stores.todoStore.todo2Store.todo3Store.addSize().then((result) => {
      console.log('todo3 size:', result);
    });
  };
  const onClick4 = () => store.stores.todoStore.todo2Store.todo3StoreList.get(0).addSize();
  const onClick5 = () => store.stores.todoStore.todo2Store.todo3StoreMap.myKey.addSize();
  return (
    <div className={classes.root}>
      <Button color="primary" variant="contained" onClick={onClick}>Add Size {size}</Button>
      <Button color="primary" variant="contained" onClick={onClick2}>Decrease Size {size}</Button>
      <Button color="primary" variant="contained" onClick={onClick3}>Add Todo3 Size {todo3Size}</Button>
      <Button color="primary" variant="contained" onClick={onClick4}>Add Todo3 List Size {todo3Slice0Size}</Button>
      <Button color="primary" variant="contained" onClick={onClick5}>Add Todo3 Map Size {todo3MyKeySize}</Button>
    </div>
  );
}

export default {
  title: 'Todo2 embed Count Demo',
  Component: withStyles(styles)(Todo2Demo),
};