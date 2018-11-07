import React from 'react';
import axios from 'axios';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { compose } from 'redux';
import { cloneDeep, findIndex } from 'lodash';
import * as Table from 'reactabular-table';
import * as resolve from 'table-resolver';
import * as tree from 'treetabular';
import * as dnd from 'reactabular-dnd';

class DragAndDropTreeTable extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      columns: this.props.columns,
      rows: this.props.rows
    };

    this.onRow = this.onRow.bind(this);
    this.onMoveRow = this.onMoveRow.bind(this);
  }

  render() {
    const components = {
      header: {
        cell: dnd.Header
      },
      body: {
        row: dnd.Row
      }
    };
    const { columns } = this.state;
    const rows = compose(
      tree.filter({ fieldName: 'showingChildren' }),
      resolve.resolve({ columns, method: resolve.index })
    )(this.state.rows);

    return (
      <Table.Provider
        components={components}
        columns={columns}
      >
        <Table.Header />

        <Table.Body
          rows={rows}
          rowKey="id"
          onRow={this.onRow}
        />
      </Table.Provider>
    );
  }
  onRow(row) {
    return {
      rowId: row.id,
      onMove: o => this.onMoveRow(o)
    };
  }
  onMoveRow({ sourceRowId, targetRowId }) {
    const rows = tree.moveRows({
      operation: dnd.moveRows({ sourceRowId, targetRowId }),
      retain: ['showingChildren']
    })(this.state.rows);

    if (rows) {
      this.setState({ rows });
    }
  }
}

module.exports = DragDropContext(HTML5Backend)(DragAndDropTreeTable);