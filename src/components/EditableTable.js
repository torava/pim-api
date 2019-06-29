import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import { default as TouchBackend } from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';
import EditableTableItem from './EditableTableItem';

class EditableTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: props.columns,
      childView: props.childView,
      resolved_items: props.items,
      filter: props.filter,
      column_orders: {},
      expanded_items: {},
      ready: false
    }

    this.toggleChildren = this.toggleChildren.bind(this);
    this.onColumnTitleClick = this.onColumnTitleClick.bind(this);
    this.getContent = this.getContent.bind(this);
  }
  componentWillReceiveProps(props) {
    this.setState({
      columns: props.columns,
      childView: props.childView,
      resolved_items: this.resolveItems(this.props.items),
      ready: false
    });
  }
  toggleChildren(event, id) {
    event && event.preventDefault();

    let expanded_items = {...this.state.expanded_items};
    if (expanded_items[id]) {
      delete expanded_items[id];
    }
    else {
      expanded_items[id] = true;
    }
    this.setState({
      expanded_items
    });


    /*const indexes = event.target.parentNode.parentNode.id.split('-'),
          items = [...this.state.items];

    let item = items[indexes.shift()];

    for (let i in indexes) {
      item = item.children[indexes[i]];
    }

    item.expanded = !item.expanded;

    this.setState({
      items
    });*/
  }
  onColumnTitleClick(column, event) {
    let column_orders = {...this.state.column_orders},
        that = this;
    if (column.sortable !== false) {
      if (column_orders[column.id] == 'ASC') {
        column_orders[column.id] = 'DESC';
      }
      else if (column_orders[column.id] == 'DESC') {
        delete column_orders[column.id];
      }
      else {
        column_orders[column.id] = 'ASC';
      }
    }
    console.log(column, column.sortable !== false, column_orders);
    this.setState({
      column_orders
    }, () => {
      this.setState({
        resolved_items: that.resolveItems(that.props.items),
        ready: true
      })
    });
  }
  getColumnChildren(column) {
    if (column.columns) {
      let children = this.getColumnChildren(column.columns);
      if (children && children.length) {
        return [column].concat(children);
      }
    }
    else return column;
  }
  resolveItems(items) {
    if (!items) return [];

    let resolved_items = [...items],
        column_orders = this.state.column_orders,
        column_order,
        order,
        a,
        b,
        column;
    resolved_items.sort((a_item, b_item) => {
      for (let id in column_orders) {
        column = this.state.columns.find(c => c.id === id);
        a = this.getValue(a_item, column);
        b = this.getValue(b_item, column);
        console.log(a, b, a_item, b_item, column);
        if (!a && !b) {
          return 1;
        }
        else if (!a) {
          return 1;
        }
        else if (!b) {
          return 1;
        }
        else if (typeof a == 'string' && typeof b == 'string') {
          order = a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'});
        }
        else if (a === b) {
          order = 0;
        }
        else if (a < b) {
          order = -1;
        }
        else if (a > b) {
          order = 1;
        }

        column_order = column_orders[id];
        if (column_order === 'ASC') {
          return order;
        }
        else if (column_order === 'DESC') {
          if (order == 1) {
            return -1;
          }
          else if (order === -1) {
            return 1;
          }
          else {
            return 0;
          }
        }
      }
    });
    return resolved_items;
  }
  renderColumns(columns, indexes, content, total, depth, cols) {
    let count,
        that = this,
        count2 = 0,
        rowspan,
        key;
    depth++;
    columns && columns.visible !== false && columns.map((column, i) => {
      key = "column-"+indexes.join('-')+"-"+i;
      count = 0;
      rowspan = 1;
      if (column.columns) {
        count = Math.max(that.renderColumns(column.columns, indexes.concat(i), content, total, depth, cols), column.columns.length);
      }
      else {
        rowspan = 2+depth;
        cols.push(<col style={column.style}/>);
      }
      if (!content[depth-1]) content[depth-1] = [];
      content[depth-1].push(
        <th colSpan={count || 1}
            rowSpan={rowspan}
            data-depth={depth}
            key={key}
            onClick={this.onColumnTitleClick.bind(this, column)}>
          {column.label} {{'ASC': '\u25B4', 'DESC': '\u25BE' || '&nbsp;'}[this.state.column_orders[column.id]] || ''}
        </th>
      );
      count2+= count;
    });
    return count2;
  }
  getValue(item, column) {
    if (!item || !column) {
      return;
    }
    let value;
    if (typeof column.property == 'function') {
      value = column.property(item);
    }
    else if (typeof column.property == 'string') {
      value = _.get(item, column.property);
    }
    else {
      value = _.get(item, column.id);
    }
    return value;
  }
  getContent(item, column) {
    let value = this.getValue(item, column);
    let content = column.formatter && column.formatter(value, item, item.id) || value;
    return content;
  }
  render() {
    let that = this,
        cols = [],
        col_index = 0,
        content = [],
        total = 0;

    that.renderColumns(that.state.columns, [], content, total, 0, cols);
    let thead = <thead>
                  {content.map((row, i) => {
                    return <tr key={"row"+i}>{row}</tr>
                  })}
                </thead>;

    return (
      <table border="1" {...that.props.tableProps}>
        <colgroup>
          {cols}
        </colgroup>
        {thead}
        <tbody>
          {that.state.resolved_items && that.state.resolved_items.map((item, i) => {
            if (that.state.filter && !that.state.filter(item)) return true;

            return <EditableTableItem
                    key={item.id}
                    item={item}
                    filter={that.state.filter}
                    columns={that.state.columns}
                    expanded_items={this.state.expanded_items}
                    resolveItems={that.resolveItems.bind(that)}
                    getContent={this.getContent}
                    depth={0}
                    toggleChildren={that.toggleChildren}
                    childView={that.state.childView}
                  />
          })}
        </tbody>
      </table>
    );
  }
}

export default DragDropContext(TouchBackend)(EditableTable);