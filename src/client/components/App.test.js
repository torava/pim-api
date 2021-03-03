import Axios from 'axios';
import React from 'react';
import { render, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { setupWorker } from '../utils/tesseractWorker';

global.Tesseract = jest.fn();

jest.mock('axios');
jest.mock('../utils/tesseractWorker');

Axios.get.mockResolvedValue({data: []});
setupWorker.mockImplementation((callback) => {
  callback({status: 'initialized api'});
  return {};
});

it('renders without crashing', async () => {
  const result = render(<BrowserRouter><App /></BrowserRouter>);
  const {findByText} = within(result.container);
  expect(await findByText('Loading...')).toBeInTheDocument();
  expect(await findByText('Upload:')).toBeInTheDocument();
});
