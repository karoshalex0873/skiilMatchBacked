"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOptimizationTips = void 0;
const getOptimizationTips = (metrics, budgets) => {
    const tips = [];
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
exports.getOptimizationTips = getOptimizationTips;
