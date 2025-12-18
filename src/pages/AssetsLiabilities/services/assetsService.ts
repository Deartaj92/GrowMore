import { supabase } from '../../../supabaseClient';
import {
  AssetCategory,
  Asset,
  AssetDepreciation,
  AssetAttachment,
  AssetFilters,
  AssetSummary
} from '../../../types/asset';

export const assetsService = {
  // Asset Categories
  async getAssetCategories(schoolId: number, includeInactive: boolean = false): Promise<AssetCategory[]> {
    let query = supabase
      .from('asset_categories')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });
    
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      name: item.name,
      description: item.description,
      depreciationMethod: item.depreciation_method || 'straight_line',
      defaultDepreciationRate: item.default_depreciation_rate ? parseFloat(item.default_depreciation_rate) : undefined,
      color: item.color || '#3b82f6',
      isActive: item.is_active,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  },

  async createAssetCategory(category: Omit<AssetCategory, 'id' | 'createdAt' | 'updatedAt'>): Promise<AssetCategory> {
    const { schoolId, name, description, depreciationMethod, defaultDepreciationRate, color, isActive } = category;
    const { data, error } = await supabase
      .from('asset_categories')
      .insert({
        school_id: schoolId,
        name,
        description,
        depreciation_method: depreciationMethod || 'straight_line',
        default_depreciation_rate: defaultDepreciationRate || null,
        color: color || '#3b82f6',
        is_active: isActive !== undefined ? isActive : true,
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      name: data.name,
      description: data.description,
      depreciationMethod: data.depreciation_method,
      defaultDepreciationRate: data.default_depreciation_rate ? parseFloat(data.default_depreciation_rate) : undefined,
      color: data.color,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  async updateAssetCategory(
    id: number,
    schoolId: number,
    updates: Partial<Pick<AssetCategory, 'name' | 'description' | 'depreciationMethod' | 'defaultDepreciationRate' | 'color' | 'isActive'>>
  ): Promise<void> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.depreciationMethod !== undefined) updateData.depreciation_method = updates.depreciationMethod;
    if (updates.defaultDepreciationRate !== undefined) updateData.default_depreciation_rate = updates.defaultDepreciationRate || null;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    updateData.updated_at = new Date().toISOString();
    
    const { error } = await supabase
      .from('asset_categories')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  async deleteAssetCategory(id: number, schoolId: number): Promise<void> {
    // Check if category is used by any assets
    const { data: assets, error: checkError } = await supabase
      .from('assets')
      .select('id')
      .eq('category_id', id)
      .eq('school_id', schoolId)
      .limit(1);
    
    if (checkError) throw checkError;
    
    if (assets && assets.length > 0) {
      throw new Error('Cannot delete category that has associated assets. Please deactivate it instead.');
    }
    
    const { error } = await supabase
      .from('asset_categories')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Assets
  async getAssets(schoolId: number, filters: AssetFilters = {}): Promise<Asset[]> {
    let query = supabase
      .from('assets')
      .select(`
        *,
        asset_categories (
          id,
          name,
          description,
          depreciation_method,
          default_depreciation_rate,
          color,
          is_active
        )
      `)
      .eq('school_id', schoolId)
      .order('purchase_date', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }
    
    if (filters.startDate) {
      query = query.gte('purchase_date', filters.startDate);
    }
    
    if (filters.endDate) {
      query = query.lte('purchase_date', filters.endDate);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    let assets = (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      categoryId: item.category_id,
      name: item.name,
      description: item.description,
      purchaseDate: item.purchase_date,
      purchaseCost: parseFloat(item.purchase_cost),
      currentValue: item.current_value ? parseFloat(item.current_value) : undefined,
      depreciationMethod: item.depreciation_method || 'straight_line',
      depreciationRate: item.depreciation_rate ? parseFloat(item.depreciation_rate) : undefined,
      usefulLifeYears: item.useful_life_years || undefined,
      location: item.location || undefined,
      vendorName: item.vendor_name || undefined,
      invoiceNumber: item.invoice_number || undefined,
      serialNumber: item.serial_number || undefined,
      status: item.status,
      disposedDate: item.disposed_date || undefined,
      disposedValue: item.disposed_value ? parseFloat(item.disposed_value) : undefined,
      notes: item.notes || undefined,
      createdBy: item.created_by || undefined,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      category: item.asset_categories ? {
        id: item.asset_categories.id,
        schoolId: item.asset_categories.school_id,
        name: item.asset_categories.name,
        description: item.asset_categories.description,
        depreciationMethod: item.asset_categories.depreciation_method || 'straight_line',
        defaultDepreciationRate: item.asset_categories.default_depreciation_rate ? parseFloat(item.asset_categories.default_depreciation_rate) : undefined,
        color: item.asset_categories.color,
        isActive: item.asset_categories.is_active,
      } : undefined,
    }));
    
    // Apply search filter if provided
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase();
      assets = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchLower) ||
        asset.description?.toLowerCase().includes(searchLower) ||
        asset.vendorName?.toLowerCase().includes(searchLower) ||
        asset.invoiceNumber?.toLowerCase().includes(searchLower) ||
        asset.serialNumber?.toLowerCase().includes(searchLower) ||
        asset.location?.toLowerCase().includes(searchLower)
      );
    }
    
    return assets;
  },

  async getAsset(id: number, schoolId: number): Promise<Asset | null> {
    const { data, error } = await supabase
      .from('assets')
      .select(`
        *,
        asset_categories (
          id,
          name,
          description,
          depreciation_method,
          default_depreciation_rate,
          color,
          is_active
        )
      `)
      .eq('id', id)
      .eq('school_id', schoolId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    if (!data) return null;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      categoryId: data.category_id,
      name: data.name,
      description: data.description,
      purchaseDate: data.purchase_date,
      purchaseCost: parseFloat(data.purchase_cost),
      currentValue: data.current_value ? parseFloat(data.current_value) : undefined,
      depreciationMethod: data.depreciation_method || 'straight_line',
      depreciationRate: data.depreciation_rate ? parseFloat(data.depreciation_rate) : undefined,
      usefulLifeYears: data.useful_life_years || undefined,
      location: data.location || undefined,
      vendorName: data.vendor_name || undefined,
      invoiceNumber: data.invoice_number || undefined,
      serialNumber: data.serial_number || undefined,
      status: data.status,
      disposedDate: data.disposed_date || undefined,
      disposedValue: data.disposed_value ? parseFloat(data.disposed_value) : undefined,
      notes: data.notes || undefined,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.asset_categories ? {
        id: data.asset_categories.id,
        schoolId: data.asset_categories.school_id,
        name: data.asset_categories.name,
        description: data.asset_categories.description,
        depreciationMethod: data.asset_categories.depreciation_method || 'straight_line',
        defaultDepreciationRate: data.asset_categories.default_depreciation_rate ? parseFloat(data.asset_categories.default_depreciation_rate) : undefined,
        color: data.asset_categories.color,
        isActive: data.asset_categories.is_active,
      } : undefined,
    };
  },

  async createAsset(asset: Omit<Asset, 'id' | 'createdAt' | 'updatedAt' | 'category' | 'createdByUser'>): Promise<Asset> {
    const {
      schoolId,
      categoryId,
      name,
      description,
      purchaseDate,
      purchaseCost,
      currentValue,
      depreciationMethod,
      depreciationRate,
      usefulLifeYears,
      location,
      vendorName,
      invoiceNumber,
      serialNumber,
      status,
      notes,
      createdBy,
      paymentMethod,
      accountId,
    } = asset as any;
    
    const { data, error } = await supabase
      .from('assets')
      .insert({
        school_id: schoolId,
        category_id: categoryId,
        name,
        description,
        purchase_date: purchaseDate,
        purchase_cost: purchaseCost,
        current_value: currentValue || null,
        depreciation_method: depreciationMethod || 'straight_line',
        depreciation_rate: depreciationRate || null,
        useful_life_years: usefulLifeYears || null,
        location: location || null,
        vendor_name: vendorName || null,
        invoice_number: invoiceNumber || null,
        serial_number: serialNumber || null,
        status: status || 'active',
        notes: notes || null,
        payment_method: paymentMethod || 'cash',
        account_id: accountId || null,
        cheque_number: (asset as any).chequeNumber || null,
        transaction_id: (asset as any).transactionId || null,
        created_by: createdBy || null,
      })
      .select(`
        *,
        asset_categories (
          id,
          name,
          description,
          depreciation_method,
          default_depreciation_rate,
          color,
          is_active
        )
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      categoryId: data.category_id,
      name: data.name,
      description: data.description,
      purchaseDate: data.purchase_date,
      purchaseCost: parseFloat(data.purchase_cost),
      currentValue: data.current_value ? parseFloat(data.current_value) : undefined,
      depreciationMethod: data.depreciation_method || 'straight_line',
      depreciationRate: data.depreciation_rate ? parseFloat(data.depreciation_rate) : undefined,
      usefulLifeYears: data.useful_life_years || undefined,
      location: data.location || undefined,
      vendorName: data.vendor_name || undefined,
      invoiceNumber: data.invoice_number || undefined,
      serialNumber: data.serial_number || undefined,
      status: data.status,
      disposedDate: data.disposed_date || undefined,
      disposedValue: data.disposed_value ? parseFloat(data.disposed_value) : undefined,
      notes: data.notes || undefined,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.asset_categories ? {
        id: data.asset_categories.id,
        schoolId: data.asset_categories.school_id,
        name: data.asset_categories.name,
        description: data.asset_categories.description,
        depreciationMethod: data.asset_categories.depreciation_method || 'straight_line',
        defaultDepreciationRate: data.asset_categories.default_depreciation_rate ? parseFloat(data.asset_categories.default_depreciation_rate) : undefined,
        color: data.asset_categories.color,
        isActive: data.asset_categories.is_active,
      } : undefined,
    };
  },

  async updateAsset(
    id: number,
    schoolId: number,
    updates: Partial<Omit<Asset, 'id' | 'schoolId' | 'createdAt' | 'updatedAt' | 'category' | 'createdByUser'>>
  ): Promise<Asset> {
    const updateData: any = {};
    
    if (updates.categoryId !== undefined) updateData.category_id = updates.categoryId;
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.purchaseDate !== undefined) updateData.purchase_date = updates.purchaseDate;
    if (updates.purchaseCost !== undefined) updateData.purchase_cost = updates.purchaseCost;
    if (updates.currentValue !== undefined) updateData.current_value = updates.currentValue || null;
    if (updates.depreciationMethod !== undefined) updateData.depreciation_method = updates.depreciationMethod;
    if (updates.depreciationRate !== undefined) updateData.depreciation_rate = updates.depreciationRate || null;
    if (updates.usefulLifeYears !== undefined) updateData.useful_life_years = updates.usefulLifeYears || null;
    if (updates.location !== undefined) updateData.location = updates.location || null;
    if (updates.vendorName !== undefined) updateData.vendor_name = updates.vendorName || null;
    if (updates.invoiceNumber !== undefined) updateData.invoice_number = updates.invoiceNumber || null;
    if (updates.serialNumber !== undefined) updateData.serial_number = updates.serialNumber || null;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.disposedDate !== undefined) updateData.disposed_date = updates.disposedDate || null;
    if (updates.disposedValue !== undefined) updateData.disposed_value = updates.disposedValue || null;
    if (updates.notes !== undefined) updateData.notes = updates.notes || null;
    if ((updates as any).paymentMethod !== undefined) updateData.payment_method = (updates as any).paymentMethod;
    if ((updates as any).accountId !== undefined) updateData.account_id = (updates as any).accountId || null;
    if ((updates as any).chequeNumber !== undefined) updateData.cheque_number = (updates as any).chequeNumber || null;
    if ((updates as any).transactionId !== undefined) updateData.transaction_id = (updates as any).transactionId || null;
    
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('assets')
      .update(updateData)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select(`
        *,
        asset_categories (
          id,
          name,
          description,
          depreciation_method,
          default_depreciation_rate,
          color,
          is_active
        )
      `)
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      categoryId: data.category_id,
      name: data.name,
      description: data.description,
      purchaseDate: data.purchase_date,
      purchaseCost: parseFloat(data.purchase_cost),
      currentValue: data.current_value ? parseFloat(data.current_value) : undefined,
      depreciationMethod: data.depreciation_method || 'straight_line',
      depreciationRate: data.depreciation_rate ? parseFloat(data.depreciation_rate) : undefined,
      usefulLifeYears: data.useful_life_years || undefined,
      location: data.location || undefined,
      vendorName: data.vendor_name || undefined,
      invoiceNumber: data.invoice_number || undefined,
      serialNumber: data.serial_number || undefined,
      status: data.status,
      disposedDate: data.disposed_date || undefined,
      disposedValue: data.disposed_value ? parseFloat(data.disposed_value) : undefined,
      notes: data.notes || undefined,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      category: data.asset_categories ? {
        id: data.asset_categories.id,
        schoolId: data.asset_categories.school_id,
        name: data.asset_categories.name,
        description: data.asset_categories.description,
        depreciationMethod: data.asset_categories.depreciation_method || 'straight_line',
        defaultDepreciationRate: data.asset_categories.default_depreciation_rate ? parseFloat(data.asset_categories.default_depreciation_rate) : undefined,
        color: data.asset_categories.color,
        isActive: data.asset_categories.is_active,
      } : undefined,
    };
  },

  async deleteAsset(id: number, schoolId: number): Promise<void> {
    // Delete depreciations first
    await supabase
      .from('asset_depreciations')
      .delete()
      .eq('asset_id', id)
      .eq('school_id', schoolId);
    
    // Delete attachments
    await supabase
      .from('asset_attachments')
      .delete()
      .eq('asset_id', id)
      .eq('school_id', schoolId);
    
    // Delete asset
    const { error } = await supabase
      .from('assets')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Asset Depreciations
  async getAssetDepreciations(assetId: number, schoolId: number): Promise<AssetDepreciation[]> {
    const { data, error } = await supabase
      .from('asset_depreciations')
      .select('*')
      .eq('asset_id', assetId)
      .eq('school_id', schoolId)
      .order('depreciation_date', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      assetId: item.asset_id,
      depreciationDate: item.depreciation_date,
      depreciationAmount: parseFloat(item.depreciation_amount),
      accumulatedDepreciation: parseFloat(item.accumulated_depreciation),
      remainingValue: parseFloat(item.remaining_value),
      notes: item.notes || undefined,
      createdBy: item.created_by || undefined,
      createdAt: item.created_at,
    }));
  },

  async createAssetDepreciation(depreciation: Omit<AssetDepreciation, 'id' | 'createdAt'>): Promise<AssetDepreciation> {
    const { schoolId, assetId, depreciationDate, depreciationAmount, accumulatedDepreciation, remainingValue, notes, createdBy } = depreciation;
    
    const { data, error } = await supabase
      .from('asset_depreciations')
      .insert({
        school_id: schoolId,
        asset_id: assetId,
        depreciation_date: depreciationDate,
        depreciation_amount: depreciationAmount,
        accumulated_depreciation: accumulatedDepreciation,
        remaining_value: remainingValue,
        notes: notes || null,
        created_by: createdBy || null,
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    // Update asset's current value
    await supabase
      .from('assets')
      .update({ current_value: remainingValue })
      .eq('id', assetId)
      .eq('school_id', schoolId);
    
    return {
      id: data.id,
      schoolId: data.school_id,
      assetId: data.asset_id,
      depreciationDate: data.depreciation_date,
      depreciationAmount: parseFloat(data.depreciation_amount),
      accumulatedDepreciation: parseFloat(data.accumulated_depreciation),
      remainingValue: parseFloat(data.remaining_value),
      notes: data.notes || undefined,
      createdBy: data.created_by || undefined,
      createdAt: data.created_at,
    };
  },

  async deleteAssetDepreciation(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('asset_depreciations')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Asset Attachments
  async getAssetAttachments(assetId: number, schoolId: number): Promise<AssetAttachment[]> {
    const { data, error } = await supabase
      .from('asset_attachments')
      .select('*')
      .eq('asset_id', assetId)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return (data || []).map(item => ({
      id: item.id,
      schoolId: item.school_id,
      assetId: item.asset_id,
      fileName: item.file_name,
      fileUrl: item.file_url,
      fileType: item.file_type,
      fileSize: item.file_size,
      uploadedBy: item.uploaded_by,
      createdAt: item.created_at,
    }));
  },

  async createAssetAttachment(attachment: Omit<AssetAttachment, 'id' | 'createdAt'>): Promise<AssetAttachment> {
    const { schoolId, assetId, fileName, fileUrl, fileType, fileSize, uploadedBy } = attachment;
    
    const { data, error } = await supabase
      .from('asset_attachments')
      .insert({
        school_id: schoolId,
        asset_id: assetId,
        file_name: fileName,
        file_url: fileUrl,
        file_type: fileType,
        file_size: fileSize,
        uploaded_by: uploadedBy,
      })
      .select('*')
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      schoolId: data.school_id,
      assetId: data.asset_id,
      fileName: data.file_name,
      fileUrl: data.file_url,
      fileType: data.file_type,
      fileSize: data.file_size,
      uploadedBy: data.uploaded_by,
      createdAt: data.created_at,
    };
  },

  async deleteAssetAttachment(id: number, schoolId: number): Promise<void> {
    const { error } = await supabase
      .from('asset_attachments')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    
    if (error) throw error;
  },

  // Asset Summary/Analytics
  async getAssetSummary(schoolId: number, filters: AssetFilters = {}): Promise<AssetSummary> {
    const assets = await this.getAssets(schoolId, filters);
    
    const totalAssets = assets.length;
    const totalValue = assets.reduce((sum, asset) => sum + asset.purchaseCost, 0);
    const totalCurrentValue = assets.reduce((sum, asset) => sum + (asset.currentValue || asset.purchaseCost), 0);
    const totalDepreciation = totalValue - totalCurrentValue;
    
    // By category
    const categoryMap = new Map<number, { name: string; count: number; totalValue: number; totalCurrentValue: number; color: string }>();
    assets.forEach(asset => {
      const catId = asset.categoryId;
      if (!categoryMap.has(catId)) {
        categoryMap.set(catId, {
          name: asset.category?.name || 'Unknown',
          count: 0,
          totalValue: 0,
          totalCurrentValue: 0,
          color: asset.category?.color || '#3b82f6',
        });
      }
      const cat = categoryMap.get(catId)!;
      cat.count += 1;
      cat.totalValue += asset.purchaseCost;
      cat.totalCurrentValue += (asset.currentValue || asset.purchaseCost);
    });
    
    // By status
    const statusMap = new Map<string, { count: number; totalValue: number }>();
    assets.forEach(asset => {
      const status = asset.status;
      if (!statusMap.has(status)) {
        statusMap.set(status, { count: 0, totalValue: 0 });
      }
      const stat = statusMap.get(status)!;
      stat.count += 1;
      stat.totalValue += asset.purchaseCost;
    });
    
    // By location
    const locationMap = new Map<string, { count: number; totalValue: number }>();
    assets.forEach(asset => {
      const location = asset.location || 'Unknown';
      if (!locationMap.has(location)) {
        locationMap.set(location, { count: 0, totalValue: 0 });
      }
      const loc = locationMap.get(location)!;
      loc.count += 1;
      loc.totalValue += asset.purchaseCost;
    });
    
    return {
      totalAssets,
      totalValue,
      totalCurrentValue,
      totalDepreciation,
      byCategory: Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        count: data.count,
        totalValue: data.totalValue,
        totalCurrentValue: data.totalCurrentValue,
        color: data.color,
      })),
      byStatus: Array.from(statusMap.entries()).map(([status, data]) => ({
        status: status as any,
        count: data.count,
        totalValue: data.totalValue,
      })),
      byLocation: Array.from(locationMap.entries()).map(([location, data]) => ({
        location,
        count: data.count,
        totalValue: data.totalValue,
      })),
    };
  },
};





