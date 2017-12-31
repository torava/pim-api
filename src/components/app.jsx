'use strict';

import React from 'react';
import {Switch, Route} from 'react-router';
import Layout from './Layout';
import ReceiptListPage from './ReceiptListPage';
import ItemListPage from './ItemListPage';
import CategoryListPage from './CategoryListPage';
import AddReceiptPage from './AddReceiptPage';
import EditReceiptPage from './EditReceiptPage';
import NotFoundPage from './NotFoundPage';

export default class App extends React.Component {
  render() {
    return (
      <Layout>
        <Switch>
          <Route exact path="/" component={ReceiptListPage}/>
          <Route path="/add" component={AddReceiptPage}/>
          <Route path="/items" component={ItemListPage}/>
          <Route path="/categories" component={CategoryListPage}/>
          <Route path="/edit/:id" component={EditReceiptPage}/>
          <Route path="*" component={NotFoundPage}/>
        </Switch>
      </Layout>
    );
  }
};