/*'use strict';

import React from 'react';
import axios from 'axios';
/*
const category_columns = [
  {
    label: 'Name',
    id: 'name',
    order: 'ASC'
  }
];


import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { compose } from 'redux';
import { cloneDeep, findIndex } from 'lodash';
import * as Table from 'reactabular-table';
import * as resolve from 'table-resolver';
import * as tree from 'treetabular';
import * as dnd from 'reactabular-dnd';

class CategoryListPage extends React.Component {
  constructor(props) {
    super(props);
    
    let that = this;

    axios.get('/api/category/')
    .then(function(response) {
      that.setState({
        rows: response.data,
        columns: that.getColumns()
      });
    })
    .catch(function(error) {
      console.error(error);
    });

    this.onRow = this.onRow.bind(this);
    this.onMoveRow = this.onMoveRow.bind(this);
  }
  getColumns() {
    return [
      {
        property: 'name',
        props: {
          style: { width: 200 }
        },
        header: {
          label: 'Name'
        },
        cell: {
          formatters: [
            tree.toggleChildren({
              getRows: () => this.state.rows,
              getShowingChildren: ({ rowData }) => rowData.showingChildren,
              toggleShowingChildren: rowIndex => {
                const rows = cloneDeep(this.state.rows);

                rows[rowIndex].showingChildren = !rows[rowIndex].showingChildren;

                this.setState({ rows });
              }
            })
          ]
        }
      }
    ];
  }
  render() {
    if (!this.state) return '';

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
      tree.fixOrder({ parentField: 'parentId', idField: 'id' }),
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
    let that = this;
    const rows = tree.moveRows({
      operation: function() {
        let rows = that.state.rows;
        console.log(sourceRowId, targetRowId);
        for (let i in rows) {
          if (rows[i].id == sourceRowId) {
            rows[i].parentId = targetRowId;
            break;
          }
        }
        return rows;
      },
      retain: ['showingChildren']
    })(this.state.rows);
    console.log(rows);
    if (rows) {
      this.setState({ rows });
    }
  }
}

module.exports = DragDropContext(HTML5Backend)(CategoryListPage);*/

import React from 'react';
import axios from 'axios';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { compose } from 'redux';
import { cloneDeep, findIndex, orderBy, set } from 'lodash';
import * as sort from 'sortabular';
import * as Table from 'reactabular-table';
import * as resolve from 'table-resolver';
import * as tree from 'treetabular';
import * as dnd from 'reactabular-dnd';
import * as edit from 'react-edit';
import uuid from 'uuid';

const _rows = [
  {
    _index: 0,
    id: 123,
    name: 'Demo'
  },
  {
    _index: 1,
    id: 456,
    name: 'Another',
    parentId: 123
  },
  {
    _index: 2,
    id: 789,
    name: 'Yet Another',
    parentId: 123
  },
  {
    _index: 3,
    id: 532,
    name: 'Foobar'
  }
];

const schema = {
  type: 'object',
  properties: {
    id: {
      type: 'string'
    },
    name: {
      type: 'string'
    },
    age: {
      type: 'integer'
    }
  },
  required: ['id', 'name', 'age']
};

class DragAndDropTreeTable extends React.Component {
  constructor(props) {
    super(props);

    let that = this;

    axios.get('/api/category/')
    .then(function(response) {
      let rows = response.data,
          columns = that.getColumns();
    
      for (let i in rows) {
        if (rows[i].parentId == null) {
          rows[i].parentId = -1;
        }
      }
      rows.unshift({name: 'Categories', showChildren: true, parentId: null, id: -1, attributes: [], editable: false});

      rows = resolve.resolve({columns})(rows);
      rows = compose(
        tree.fixOrder({ parentField: 'parentId', idField: 'id' })
      )(rows);
      that.setState({
        rows: rows,
        columns: columns,
        sortingColumns: {}
      });

      console.log(that.state.rows, response.data);
    })
    .catch(function(error) {
      console.error(error);
    });

    this.onRow = this.onRow.bind(this);
    this.onMoveRow = this.onMoveRow.bind(this);
    this.onAdd = this.onAdd.bind(this);
    this.onRemove = this.onRemove.bind(this);
    this.onSave = this.onSave.bind(this);
  }
  getColumns() {
    const getSortingColumns = () => this.state.sortingColumns || {};
    const sortable = sort.sort({
      // Point the transform to your rows. React state can work for this purpose
      // but you can use a state manager as well.
      getSortingColumns,

      // The user requested sorting, adjust the sorting state accordingly.
      // This is a good chance to pass the request through a sorter.
      onSort: selectedColumn => {
        this.setState({
          sortingColumns: sort.byColumns({ // sort.byColumn would work too
            sortingColumns: this.state.sortingColumns,
            selectedColumn
          })
        });
      },

      // Use property strategy over index one given we have nested data
      strategy: sort.strategies.byProperty
    });

    const resetable = sort.reset({
      event: 'onDoubleClick',
      getSortingColumns,
      onReset: ({ sortingColumns }) => this.setState({ sortingColumns }),
      strategy: sort.strategies.byProperty
    });

    const editable = edit.edit({
      isEditing: ({ columnIndex, rowData }) => columnIndex === rowData.editing,
      onActivate: ({ columnIndex, rowData }) => {
        const index = findIndex(this.state.rows, { id: rowData.id });
        const rows = cloneDeep(this.state.rows);

        rows[index].editing = columnIndex;

        this.setState({ rows });
      },
      onValue: ({ value, rowData, property }) => {
        const index = findIndex(this.state.rows, { id: rowData.id });
        const rows = cloneDeep(this.state.rows);

        rows[index][property] = value;
        delete rows[index].editing;
        this.setState({ rows });
      }
    });

    return [
      {
        property: 'name',
        props: {
          style: { width: 200 }
        },
        header: {
          label: 'Name',
          transforms: [resetable],
          formatters: [
            sort.header({
              sortable,
              getSortingColumns,
              strategy: sort.strategies.byProperty
            })
          ]
        },
        cell: {
          formatters: [
            tree.toggleChildren({
              parentField: 'parentId',
              getRows: () => this.state.rows,
              getShowingChildren: ({ rowData }) => rowData.showingChildren,
              toggleShowingChildren: rowIndex => {
                const rows = cloneDeep(this.state.rows);

                rows[rowIndex].showingChildren = !rows[rowIndex].showingChildren;

                this.setState({ rows });
              }
            })
          ],
          transforms: [editable(edit.input())]
        }
      },
      {
        header: {
          label: 'Nutritional Attributes'
        },
        children: 
          ['Energy', 'Protein', 'Carbohydrate', 'Fiber'].map(function(item) { return {
            property: 'attributes.'+item.toLowerCase(),
            props: { 
              style: { width: 200 }
            },
            header: {
              label: item,
              transforms: [resetable],
              formatters: [
                sort.header({
                  sortable,
                  getSortingColumns,
                  strategy: sort.strategies.byProperty
                })
              ]
            },
            cell: {
              transforms: [editable(edit.input())]
            }
        }})
      },
      {
        header: {
          label: 'Environmental Attributes'
        },
        children: 
          ['CO2', 'Methane'].map(function(item) { return {
            property: 'attributes.'+item.toLowerCase(),
            props: { 
              style: { width: 200 }
            },
            header: {
              label: item,
              transforms: [resetable],
              formatters: [
                sort.header({
                  sortable,
                  getSortingColumns,
                  strategy: sort.strategies.byProperty
                })
              ]
            },
            cell: {
              transforms: [editable(edit.input())]
            }
        }})
      },
      {
        props: {
          style: {
            width: 50
          }
        },
        cell: {
          formatters: [
            (value, { rowData }) => (
              <span
                className="remove"
                onClick={() => this.onRemove(rowData.id)} style={{ cursor: 'pointer' }}
              >
                &#10007;
              </span>
            )
          ]
        }
      }
    ];
  }
  render() {
    if (!this.state) return '';
    
    const components = {
      header: {
        cell: dnd.Header
      },
      body: {
        row: dnd.Row
      }
    };
    let { columns, sortingColumns } = this.state,
      rows = this.state.rows;
    console.log(rows);
    let resolvedColumns = resolve.columnChildren({ columns });
    let resolvedRows = compose(
      /*sort.sorter({
        columns: columns,
        sortingColumns,
        sort: orderBy,
        strategy: sort.strategies.byProperty
      }),
      tree.filter({ parentField: 'parentId', fieldName: 'showingChildren' }),
      tree.fixOrder({ parentField: 'parentId', idField: 'id' }),*/
      tree.filter({ parentField: 'parentId', fieldName: 'showingChildren' }),
      tree.wrap({
        operations: [
          sort.sorter({
            columns: resolvedColumns,
            sortingColumns,
            sort: orderBy,
            strategy: sort.strategies.byProperty
          })
        ]
      }),
      resolve.resolve({
        columns: resolvedColumns,
        method: resolve.nested
      }),
      tree.fixOrder({ parentField: 'parentId', idField: 'id' })
    )(rows);

    console.log(resolvedRows);

    return (
      <div>
        <button type="button" onClick={this.onAdd}>Add new</button>
        <button type="button" onClick={this.onSave}>Save</button>
        <Table.Provider
          components={components}
          columns={resolvedColumns}
        >
          <Table.Header headerRows={resolve.headerRows({ columns })} />

          <Table.Body
            rows={resolvedRows}
            rowKey="id"
            onRow={this.onRow}
          />
        </Table.Provider>
      </div>
    );
  }
  onRow(row) {
    return {
      rowId: row.id,
      onMove: o => this.onMoveRow(o),
      onMoveEnd: function(o, b) { console.log('loppu', this, o, b)}
    };
  }
  onMoveRow({ sourceRowId, targetRowId }) {
    let that = this,
        rows = that.state.rows,
        targetRowIndex = null,
        sourceRowIndex = null;

    for (let i in rows) {
      if (rows[i].id == targetRowId) {
        targetRowIndex = parseInt(i);
      }
      if (rows[i].id == sourceRowId) {
        sourceRowIndex = parseInt(i);
      }
      if (targetRowIndex !== null && sourceRowIndex !== null) {
        break;
      }
    }

    console.log(targetRowIndex, sourceRowIndex);

    let children = tree.getChildren({index: sourceRowIndex, idField: 'id', parentField: 'parentId'})(rows);

    for (let i in children) {
      if (targetRowId == children[i].id) {
        return;
      }
    }

    rows[targetRowIndex].showingChildren = true;
    rows[sourceRowIndex].parentId = targetRowId;

    rows = compose(
      tree.fixOrder({ parentField: 'parentId', idField: 'id' }),
    )(rows);
``
    console.log(rows);
    if (rows) {
      this.setState({ rows });
    }
  }
  onAdd(e) {
    e.preventDefault();

    const rows = cloneDeep(this.state.rows);

    rows.unshift({
      id: uuid.v4(),
      name: ''
    });

    this.setState({ rows });
  }
  onRemove(id) {
    const rows = cloneDeep(this.state.rows);
    
    const idx = findIndex(rows, { id });

    // this could go through flux etc.
    rows.splice(idx, 1);

    // doesn't anyone think of the children
    for (let i = idx; i < rows.length; i++) {
      if (rows[i].parentId == id) {
        rows.splice(i, 1);
      }
    }

    this.setState({ rows });
  }
  onSave(event) {
    let rows = cloneDeep(this.state.rows),
        attributes;
    for (let i in rows) {
      delete rows[i].showingChildren;
      delete rows[i].editing;
      attributes = [];
      for (let a in rows[i].attributes) {
        attributes.push({name: a, value: rows[i].attributes[a]});
      }
      rows[i].attributes = attributes;
    }
    axios.post('/api/category/', rows)
    .then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.error(error);
    });
  }
}

module.exports = DragDropContext(HTML5Backend)(DragAndDropTreeTable);