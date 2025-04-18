type Metrics = {
  cpu: string;
  memory: string;
  disk: string;
  network: string;
};

type Budgets = {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
};

export const getOptimizationTips = (metrics: Metrics, budgets: Budgets): string[] => {
  const tips: string[] = [];
  const numericMetrics = {
    cpu: parseFloat(metrics.cpu),
    memory: parseFloat(metrics.memory),
    disk: parseFloat(metrics.disk),
    network: parseFloat(metrics.network)
  };

  if (numericMetrics.cpu > budgets.cpu) {
    tips.push(`High CPU usage (${numericMetrics.cpu}% > ${budgets.cpu}%). Consider optimizing processes or scaling horizontally.`);
  }

  if (numericMetrics.memory > budgets.memory) {
    tips.push(`Memory threshold exceeded (${numericMetrics.memory}% > ${budgets.memory}%). Investigate memory leaks or add more RAM.`);
  }

  if (numericMetrics.disk > budgets.disk) {
    tips.push(`Disk usage critical (${numericMetrics.disk}% > ${budgets.disk}%). Consider archiving old data or expanding storage.`);
  }

  if (numericMetrics.network > budgets.network) {
    tips.push(`Network bandwidth exceeded (${numericMetrics.network}MB/s > ${budgets.network}MB/s). Check for unusual traffic patterns.`);
  }

  if (tips.length === 0) {
    tips.push('System operating within normal parameters. No immediate action needed.');
  }

  return tips;
};