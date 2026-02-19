export function summarizeChange({ monitoredUrl, relevance }) {
  return {
    summary: `Detected content change on ${monitoredUrl.name}`,
    businessImpact: `Risk level ${relevance.riskLevel} with score ${relevance.score}.`,
    recommendation: "Review updated policy section and confirm operational impact."
  };
}
