import { supabase } from '../../../supabaseClient';
import { BalanceSheet } from '../../../types/liability';
import { assetsService } from './assetsService';
import { liabilitiesService } from './liabilitiesService';

export const balanceSheetService = {
  async getBalanceSheet(schoolId: number, asOfDate?: string): Promise<BalanceSheet> {
    const date = asOfDate || new Date().toISOString().split('T')[0];
    
    // Get all active assets
    const assets = await assetsService.getAssets(schoolId, {
      status: 'active',
      endDate: date,
    });
    
    // Get all active liabilities
    const liabilities = await liabilitiesService.getLiabilities(schoolId, {
      status: 'active',
      endDate: date,
    });
    
    // Calculate assets by category
    const assetsByCategory = new Map<number, { name: string; total: number; color: string }>();
    assets.forEach(asset => {
      const catId = asset.categoryId;
      if (!assetsByCategory.has(catId)) {
        assetsByCategory.set(catId, {
          name: asset.category?.name || 'Unknown',
          total: 0,
          color: asset.category?.color || '#3b82f6',
        });
      }
      const cat = assetsByCategory.get(catId)!;
      // Use current value if available, otherwise use purchase cost
      cat.total += (asset.currentValue || asset.purchaseCost);
    });
    
    // Calculate liabilities by category
    const liabilitiesByCategory = new Map<number, { name: string; total: number; color: string }>();
    liabilities.forEach(liability => {
      const catId = liability.categoryId;
      if (!liabilitiesByCategory.has(catId)) {
        liabilitiesByCategory.set(catId, {
          name: liability.category?.name || 'Unknown',
          total: 0,
          color: liability.category?.color || '#ef4444',
        });
      }
      const cat = liabilitiesByCategory.get(catId)!;
      cat.total += liability.currentBalance;
    });
    
    // Calculate totals
    const totalAssets = Array.from(assetsByCategory.values()).reduce((sum, cat) => sum + cat.total, 0);
    const totalLiabilities = Array.from(liabilitiesByCategory.values()).reduce((sum, cat) => sum + cat.total, 0);
    const netWorth = totalAssets - totalLiabilities;
    
    return {
      asOfDate: date,
      assets: {
        total: totalAssets,
        byCategory: Array.from(assetsByCategory.entries()).map(([categoryId, data]) => ({
          categoryId,
          categoryName: data.name,
          total: data.total,
          color: data.color,
        })),
      },
      liabilities: {
        total: totalLiabilities,
        byCategory: Array.from(liabilitiesByCategory.entries()).map(([categoryId, data]) => ({
          categoryId,
          categoryName: data.name,
          total: data.total,
          color: data.color,
        })),
      },
      netWorth,
    };
  },
};





