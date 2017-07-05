'use strict';

import React from 'react';
import {Link} from 'react-router';

export default class addReceiptPage extends React.Component {
  handleUpload(event) {
    event.preventDefault();
    console.log(event);
  }
  render() {
    return (
      <div className="add-receipt">
        <input type="file" name="file" id="file" multiple draggable onChange={this.handleUpload}/>
        <div className="receipt-content"/>
      </div>
    );
  }
};