'use strict';

import React from 'react';
import { render } from 'react-dom';
import _ from 'lodash';
import axios from 'axios';

import ReactTable from 'react-table';
//import '../../node_modules/react-table/react-table.css';

import treeTableHOC from '../../node_modules/react-table/lib/hoc/treeTable';

const TreeTable = treeTableHOC(ReactTable);

function getTdProps(state, ri, ci) {
  console.log({state, ri, rc});
  return {};
}

class DragAndDropTreeTable extends React.Component {
  constructor() {
    super();

    let that = this;

    axios.get('/api/category/?attributes')
      .then(function(response) {
        that.setState({
          data: response.data
        });
      });
  }
  render() {
    if (!this.state || !this.state.data) return '';

    const { data } = this.state;
    return (
      <div>
        <TreeTable
          data={data}
          pivotBy={['parentId']}
          columns={[
            {
              accessor: 'name.fi-FI'
            },
            {
              accessor: 'parentId'
            }
          ]}
        />
      </div>
    );
  }
}

module.exports = DragAndDropTreeTable;