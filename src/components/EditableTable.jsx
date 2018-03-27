import React, {Component} from 'react';
import { default as TouchBackend } from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';
import EditableTableItem from './EditableTableItem';

class EditableTable extends Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: props.columns,
      childView: props.childView,
      items: props.items
    }
  }
  componentWillReceiveProps(props) {
    this.setState({
      columns: props.columns,
      childView: props.childView,
      items: props.items
    });
  }
  toggleChildren(i) {
    let items = this.state.items;
    items[i].expanded = !items[i].expanded;
    this.setState({items: items});
  }
  render() {
    let that = this,
        cols = [],
        col_index = 0,
        thead = <thead>
                  <tr>
                    {that.state.columns.map((column, i) => {
                      return <th rowSpan={column.columns && column.columns.length ? 1 : 2}
                                colSpan={column.columns && column.columns.length ? column.columns.length : 1}
                                key={"column-"+i}>
                              {column.label} {{'ASC': '\u25B4', 'DESC': '\u25BE'}[column.order] || ''}
                            </th>
                    })}
                  </tr>
                  <tr>
                    {that.state.columns.map((parent, i) => {
                      if (parent.columns && parent.columns.length) {
                        return parent.columns.map((column, n) => {
                          cols[col_index] = <col style={column.width ? {minWidth: column.width+'px'} : {}}/>;
                          col_index++;
                          return <th key={"column-"+i+"-"+n}>
                              {column.label} {{'ASC': '\u25B4', 'DESC': '\u25BE'}[column.order] || ''}
                            </th>
                        });
                      }
                      else {
                        cols[col_index] = <col style={parent.width ? {minWidth: parent.width+'px'} : {}}/>;
                      }
                      col_index++;
                    })}
                  </tr>
                </thead>;

    
    return (
      <table border="1">
        <colgroup>
          {cols}
        </colgroup>
        {thead}
        <tbody>
          {that.state.items && that.state.items.map((item, i) => {
            return <EditableTableItem
                    key={i}
                    rowIndex={i}
                    item={item}
                    columns={that.state.columns}
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

module.exports = DragDropContext(TouchBackend)(EditableTable);