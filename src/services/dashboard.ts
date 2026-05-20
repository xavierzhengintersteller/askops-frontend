import { request } from '@umijs/max';

export interface DashboardStatsData {
  agentTotal: number;
  agentOnline: number;
  agentOffline: number;
  containerTotal: number;
}

export async function getDashboardStats() {
  const res = await request('/api/dashboard/stats');
  return (
    res.data || {
      agentTotal: 0,
      agentOnline: 0,
      agentOffline: 0,
      containerTotal: 0,
    }
  );
}
