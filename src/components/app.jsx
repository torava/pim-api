'use strict';

import React from 'react';
import {Switch, Route} from 'react-router';
import Layout from './Layout';
import ReceiptListPage from './ReceiptListPage';
import ItemListPage from './ItemListPage';
import CategoryListPage from './CategoryListPage';
import CategoryPage from './CategoryPage';
import AddReceiptPage from './AddReceiptPage';
import EditReceiptPage from './EditReceiptPage';
import TextBoxTool from './TextBoxTool';
import NotFoundPage from './NotFoundPage';
import { hot } from 'react-hot-loader';

const App = () => <Layout>
  <Switch>
    <Route exact path="/" component={ReceiptListPage}/>
    <Route path="/add" component={AddReceiptPage}/>
    <Route path="/items" component={ItemListPage}/>
    <Route path="/categories" component={CategoryListPage}/>
    <Route path="/category/:id" component={CategoryPage}/>
    <Route path="/edit/:id" component={EditReceiptPage}/>
    <Route path="/tool/hocr" component={TextBoxTool}/>
    <Route path="*" component={NotFoundPage}/>
  </Switch>
</Layout>;

export default hot(module)(App);