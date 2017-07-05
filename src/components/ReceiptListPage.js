'use strict';

import React from 'react';
import {Link} from 'react-router';

export default class ReceiptList extends React.Component {
  render() {
    return (
      <ul className="receipt-list">
        {!this.props.receipts || !this.props.receipts.length ? <li>Ei kuitteja</li> : this.props.receipts.map((receipt) => {
          return <Link key={receipt.id} to={'/receipt/'+receipt.id} activeClassName="active">
            {receipt.name}
          </Link>
        })}
      </ul>
    );
  }
}