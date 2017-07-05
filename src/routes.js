'use strict';

import React from 'react';
import {Switch, Route} from 'react-router';
import Layout from './components/Layout';
import ReceiptListPage from './components/ReceiptListPage';
import AddReceiptPage from './components/AddReceiptPage';
import NotFoundPage from './components/NotFoundPage';

const routes = (
  <Switch>
    <Route path="/" component={Layout}>
      <Route path="/" component={ReceiptListPage}/>
      <Route path="add" component={AddReceiptPage}/>
      <Route path="*" component={NotFoundPage}/>
    </Route>
  </Switch>
);

/*const routes = [
  { path: "/", component: AddReceiptPage },
  { path: "add", component: ReceiptListPage },
  { path: "*", component: NotFoundPage }
]*/

export default routes;