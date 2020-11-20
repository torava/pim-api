import Axios from 'axios';
import React from 'react';
import { getByTitle, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

global.Tesseract = jest.fn();

jest.mock('axios');

Axios.get.mockResolvedValue({data: []});

it('renders without crashing', async () => {
  render(<BrowserRouter><App /></BrowserRouter>);
  await waitFor(() => screen.getByTitle('Upload'));
});
