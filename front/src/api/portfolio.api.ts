import { api } from './client';

import type { PortfolioItem } from '../types/portfolio.types';

export const getPortfolio = async (): Promise<PortfolioItem[]> => {
  const response = await api.get('/portfolio');

  return response.data;
};