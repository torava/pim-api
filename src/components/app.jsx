'use strict';

import React from 'react';
import {Switch, Route} from 'react-router';
import Layout from './Layout';
import ReceiptListPage from './ReceiptListPage';
import ItemListPage from './ItemListPage';
import AddReceiptPage from './AddReceiptPage';
import NotFoundPage from './NotFoundPage';

export default class App extends React.Component {
  render() {
    return (
      <Layout>
        <Switch>
          <Route exact path="/" component={ReceiptListPage}/>
          <Route path="/add" component={AddReceiptPage}/>
          <Route path="/items" component={ItemListPage}/>
          <Route path="*" component={NotFoundPage}/>
        </Switch>
      </Layout>
    );
  }
};