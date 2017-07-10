'use strict';

import React from 'react';
import {Link} from 'react-router';

export default class addReceiptPage extends React.Component {
  constructor(props) {
    super(props);
    this.handleUpload = this.handleUpload.bind(this);
  }
  handleUpload(event) {
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