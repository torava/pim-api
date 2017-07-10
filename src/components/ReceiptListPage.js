'use strict';

import React from 'react';
import {Link} from 'react-router';

export default class ReceiptList extends React.Component {
  constructor(props) {
    super(props);
  }
  render() {
    return (
      <ul className="receipt-list">
        {!this.props.receipts || !this.props.receipts.length ? <li>No receipts yet</li> : this.props.receipts.map((receipt) => {
          return <li><Link key={receipt.id} to={'/receipt/'+receipt.id} activeClassName="active">
            {receipt.name}
          </Link></li>
        })}
      </ul>
    );
  }
}