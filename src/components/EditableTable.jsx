import React, {Component} from 'react';
import { default as TouchBackend } from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';
import EditableTableItem from './EditableTableItem';

class EditableTable extends Component {
  render() {
    let that = this;
    return (
      <table border="1">
        <thead>
          <tr>
            {that.props.columns.map((column, i) => {
              return <th rowSpan={column.columns && column.columns.length ? 1 : 2}
                         colSpan={column.columns && column.columns.length ? column.columns.length : 1}
                         key={"column-"+i}>
                       {column.label} {{'ASC': '\u25B4', 'DESC': '\u25BE'}[column.order] || ''}
                     </th>
            })}
          </tr>
          <tr>
            {that.props.columns.map((parent, i) => {
              if (parent.columns && parent.columns.length) {
                return parent.columns.map((column, n) => {
                  return <th key={"column-"+i+"-"+n}>
                       {column.label} {{'ASC': '\u25B4', 'DESC': '\u25BE'}[column.order] || ''}
                     </th>
                });
              }
            })}
          </tr>
        </thead>
        <tbody>
          {that.props.items && that.props.items.map((item, i) => {
            return <EditableTableItem
                    key={i}
                    rowIndex={i}
                    item={item}
                    columns={that.props.columns}
                    depth={0}
                  />
          })}
        </tbody>
      </table>
    );
  }
}

module.exports = DragDropContext(TouchBackend)(EditableTable);