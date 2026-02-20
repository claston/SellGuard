const DEFAULT_COUNTERS = {
  runs: 0,
  failures: 0,
  relevant_changes: 0,
  emails_sent: 0
};

export function createInMemoryMetrics(initialCounters = {}) {
  const counters = {
    ...DEFAULT_COUNTERS,
    ...initialCounters
  };

  return {
    increment(name, value = 1) {
      if (!Object.prototype.hasOwnProperty.call(counters, name)) {
        counters[name] = 0;
      }

      counters[name] += value;
      return counters[name];
    },
    snapshot() {
      return { ...counters };
    }
  };
}

