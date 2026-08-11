export interface Agent {
  id: string;
  name: string;
  phone?: string | null;
  commissionPercent: number;
  isActive: boolean;
  notes?: string | null;
}

export interface AgentEntry {
  agentId: string;
  amount: number;
  agent: Agent;
}

export interface CommissionSource {
  id: string;
  description: string;
  amount: number;
}

export interface CommissionRecord {
  id: string;
  totalPool: number;
  ourAmount: number;
  notes?: string | null;
  agentEntries: AgentEntry[];
  sources: CommissionSource[];
}

export interface Partner {
  id: string;
  sharePercent: number;
  isActive: boolean;
  user: { name: string };
}
