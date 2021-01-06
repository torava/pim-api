import React from 'react';
import {Switch, Route} from 'react-router';
import { hot } from 'react-hot-loader';

import Layout from './Layout';
import OverviewPage from './OverviewPage/OverviewPage';
import ItemListPage from './ItemListPage';
import TransactionListPage from './TransactionListPage';
import CategoryListPage from './CategoryListPage';
import CategoryPage from './CategoryPage';
import AddReceiptPage from './AddReceiptPage';
import EditReceiptPage from './EditReceiptPage';
import TextBoxTool from './TextBoxTool';
import CropTool from './CropTool';
import NotFoundPage from './NotFoundPage';

import './App.css';

const App = () => <Layout>
  <Switch>
    <Route exact path="/" component={OverviewPage}/>
    <Route path="/add" component={AddReceiptPage}/>
    <Route path="/items" component={ItemListPage}/>
    <Route path="/transactions" component={TransactionListPage}/>
    <Route path="/categories" component={CategoryListPage}/>
    <Route path="/category/:id" component={CategoryPage}/>
    <Route path="/edit/:id" component={EditReceiptPage}/>
    <Route path="/tool/hocr" component={TextBoxTool}/>
    <Route path="/tool/crop" component={CropTool}/>
    <Route path="*" component={NotFoundPage}/>
  </Switch>
</Layout>;

export default hot(module)(App);