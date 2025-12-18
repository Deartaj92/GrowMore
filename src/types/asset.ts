// Asset Management Types

export type DepreciationMethod = 'straight_line' | 'declining_balance' | 'none';
export type AssetStatus = 'active' | 'disposed' | 'under_maintenance' | 'sold';

export interface AssetCategory {
  id: number;
  schoolId: number;
  name: string;
  description?: string;
  depreciationMethod: DepreciationMethod;
  defaultDepreciationRate?: number; // Annual percentage
  color: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Asset {
  id: number;
  schoolId: number;
  categoryId: number;
  name: string;
  description?: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue?: number; // Calculated or manual
  depreciationMethod: DepreciationMethod;
  depreciationRate?: number; // Annual percentage
  usefulLifeYears?: number;
  location?: string;
  vendorName?: string;
  invoiceNumber?: string;
  serialNumber?: string;
  status: AssetStatus;
  disposedDate?: string;
  disposedValue?: number;
  notes?: string;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  // Joined data
  category?: AssetCategory;
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AssetDepreciation {
  id: number;
  schoolId: number;
  assetId: number;
  depreciationDate: string;
  depreciationAmount: number;
  accumulatedDepreciation: number;
  remainingValue: number;
  notes?: string;
  createdBy?: number;
  createdAt?: string;
  // Joined data
  asset?: Asset;
  createdByUser?: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AssetAttachment {
  id: number;
  schoolId: number;
  assetId: number;
  fileName: string;
  fileUrl: string;
  fileType?: string;
  fileSize?: number;
  uploadedBy?: number;
  createdAt?: string;
}

export interface AssetFilters {
  categoryId?: number;
  status?: AssetStatus | string;
  location?: string;
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
}

export interface AssetSummary {
  totalAssets: number;
  totalValue: number;
  totalCurrentValue: number;
  totalDepreciation: number;
  byCategory: Array<{
    categoryId: number;
    categoryName: string;
    count: number;
    totalValue: number;
    totalCurrentValue: number;
    color: string;
  }>;
  byStatus: Array<{
    status: AssetStatus;
    count: number;
    totalValue: number;
  }>;
  byLocation: Array<{
    location: string;
    count: number;
    totalValue: number;
  }>;
}





