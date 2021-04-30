import React from 'react';
import {Switch, Route} from 'react-router';

import Layout from './Layout';
import CategoryPage from './CategoryPage';
import NotFoundPage from './NotFoundPage';

import './App.scss';

const App = () => (
  <Switch>
    <Route exact path="/" component={Layout}/>
    <Route path="/category/:id" component={CategoryPage}/>
    <Route path="*" component={NotFoundPage}/>
  </Switch>
);

export default App;
