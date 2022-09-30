import React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import App from '../renderer/App';

describe('App', () => {
  it('should render', () => {
    const ipcRenderer: any = {
      on: jest.fn(),
      once: jest.fn(),
      send: jest.fn(),
      removeAllListeners: jest.fn(),
    };
    window.electron = { ipcRenderer };
    expect(render(<App />)).toBeTruthy();
  });
});
