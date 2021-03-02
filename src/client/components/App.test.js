import Axios from 'axios';
import React from 'react';
import { render, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

global.Tesseract = jest.fn();

jest.mock('axios');

Axios.get.mockResolvedValue({data: []});

it('renders without crashing', async () => {
  const result = render(<BrowserRouter><App /></BrowserRouter>);
  const {getByText} = within(result.container);
  await waitFor(() => getByText('Upload:'));
});
