'use strict';

import React from 'react';
import {Link} from 'react-router';

export default class AddReceiptPage extends React.Component {
  handleUpload: function(event) {

  }
  render() {
    return (
      <div className="add-receipt">
        <input type="file" name="file" id="file" multiple draggable onChange={this.props.handleUpload}/>
        <div className="receipt-content"/>
      </div>
    );
  }
}