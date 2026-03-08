import { get } from './client';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface MetricResponse {
  value: number;
}

export interface FormattedMetricResponse {
  value: number;
  formatted: string;
}

export interface ChartDataPoint {
  month: string;
  value: number;
}

export interface ChartDataResponse {
  data: ChartDataPoint[];
}

export interface PieChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

export interface PieChartDataResponse {
  data: PieChartDataPoint[];
}

export interface TopUserItem {
  name: string;
  dept: string;
  count: number;
}

export interface TopUserResponse {
  data: TopUserItem[];
}

export interface TopKeywordItem {
  text?: string;
  keyword?: string;
  word?: string;
  name?: string;
  value?: number;
  count?: number;
}

export interface TopKeywordResponse {
  data: TopKeywordItem[];
}

export const fetchTotalUsage = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<MetricResponse>> => {
  return get<ApiResponse<MetricResponse>>('/api/v1/dashboard/total-usage', {
    start_date: startDate,
    end_date: endDate,
  });
};

export const fetchAvgResponseTime = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<MetricResponse>> => {
  return get<ApiResponse<MetricResponse>>('/api/v1/dashboard/avg-response-time', {
    start_date: startDate,
    end_date: endDate,
  });
};

export const fetchSuccessRate = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<MetricResponse>> => {
  return get<ApiResponse<MetricResponse>>('/api/v1/dashboard/success-rate', {
    start_date: startDate,
    end_date: endDate,
  });
};

export const fetchActiveUsers = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<MetricResponse>> => {
  return get<ApiResponse<MetricResponse>>('/api/v1/dashboard/active-users', {
    start_date: startDate,
    end_date: endDate,
  });
};

export const fetchActiveUsersTrend = async (
  startDate: string,
  endDate: string,
  aggregation: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Promise<ApiResponse<ChartDataResponse>> => {
  return get<ApiResponse<ChartDataResponse>>('/api/v1/dashboard/charts/active-users-trend', {
    start_date: startDate,
    end_date: endDate,
    aggregation,
  });
};

export const fetchTokenUsage = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<FormattedMetricResponse>> => {
  return get<ApiResponse<FormattedMetricResponse>>('/api/v1/dashboard/token-usage', {
    start_date: startDate,
    end_date: endDate,
  });
};

export const fetchEstimatedCost = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<FormattedMetricResponse>> => {
  return get<ApiResponse<FormattedMetricResponse>>('/api/v1/dashboard/estimated-cost', {
    start_date: startDate,
    end_date: endDate,
  });
};

export const fetchUsageTrend = async (
  startDate: string,
  endDate: string,
  aggregation: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Promise<ApiResponse<ChartDataResponse>> => {
  return get<ApiResponse<ChartDataResponse>>('/api/v1/dashboard/charts/usage-trend', {
    start_date: startDate,
    end_date: endDate,
    aggregation,
  });
};

export const fetchResponseStatus = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<PieChartDataResponse>> => {
  return get<ApiResponse<PieChartDataResponse>>('/api/v1/dashboard/charts/response-status', {
    start_date: startDate,
    end_date: endDate,
  });
};

export const fetchTokenCostTrend = async (
  startDate: string,
  endDate: string,
  aggregation: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Promise<ApiResponse<ChartDataResponse>> => {
  return get<ApiResponse<ChartDataResponse>>('/api/v1/dashboard/charts/token-cost-trend', {
    start_date: startDate,
    end_date: endDate,
    aggregation,
  });
};

export const fetchTopUsers = async (
  startDate: string,
  endDate: string,
  limit: number = 5
): Promise<ApiResponse<TopUserResponse>> => {
  return get<ApiResponse<TopUserResponse>>('/api/v1/dashboard/top-users', {
    start_date: startDate,
    end_date: endDate,
    limit,
  });
};

export const fetchTopKeywords = async (
  startDate: string,
  endDate: string
): Promise<ApiResponse<TopKeywordResponse>> => {
  return get<ApiResponse<TopKeywordResponse>>('/api/v1/dashboard/keywords/top30', {
    start_date: startDate,
    end_date: endDate,
  });
};
