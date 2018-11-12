'use strict';

import React from 'react';
import ReactDOM from 'react-dom';
import {Link} from 'react-router';
import axios from 'axios';
import Cropper from 'react-cropper';
import moment from 'moment';
import ReceiptEditor from './ReceiptEditor';

export default class editReceiptPage extends React.Component {
  constructor(props) {
    super(props);

    let that = this;

    this.state = {
      products: [],
      rotate: 0,
      rotate_adjust: 0,
      data: {},
      categories: [],
      manufacturers: [],
      transactions: [],
      version: 0
    };

    console.log(this.props);

    axios.get('/api/receipt/data/'+this.props.match.params.id)
    .then(function(response) {
      let state = response.data;

      // Update version
      state.version = Date.now();

      that.setState(state);

      console.log(that.state);
    })
    .catch(function(error) {
      console.error(error);
    });
  }

  render() {
    return (
      <div className="edit-receipt">
        <ReceiptEditor id="receipt-editor"
                       version={this.state.version}
                       products={this.state.products}
                       manufacturers={this.state.manufacturers}
                       categories={this.state.categories}
                       transactions={this.state.transactions}/>
      </div>
    );
  }
};