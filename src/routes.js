'use strict':

import React from 'react';
import {Route, IndexRoute } from 'react-router';
import Layout from './components/Layout';
import AddReceiptPage from './components/AddReceiptPage';
import ReceiptListPage from './components/ReceiptListPage';
import NotFoundPage from './components/NotFoundPage';

const routes = (
  <Route path="/" component={Layout}>
    <IndexRoute component={ReceiptListPage}/>
    <Route path="add" component={AddReceiptPage}/>
    <Route path="*" component={NotFoundPage}/>
  </Route>
);

export default routes;