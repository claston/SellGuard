function priorityWeight(priority) {
  if (priority === "high") {
    return 20;
  }

  if (priority === "medium") {
    return 10;
  }

  return 0;
}

function keywordHits(content, keywords = []) {
  if (!Array.isArray(keywords) || keywords.length === 0) {
    return 0;
  }

  const normalized = content.toLowerCase();
  return keywords.filter((keyword) => normalized.includes(String(keyword).toLowerCase())).length;
}

function riskFromScore(score) {
  if (score >= 70) {
    return "high";
  }

  if (score >= 40) {
    return "medium";
  }

  return "low";
}

export function scoreRelevance({ monitoredUrl, previousContent, currentContent }) {
  const delta = Math.abs((currentContent || "").length - (previousContent || "").length);
  const deltaScore = Math.min(50, delta);
  const keywordScore = keywordHits(currentContent || "", monitoredUrl.keywords) * 15;
  const score = Math.min(100, deltaScore + keywordScore + priorityWeight(monitoredUrl.priority));
  const riskLevel = riskFromScore(score);

  return {
    score,
    riskLevel,
    isRelevant: score >= 40
  };
}
