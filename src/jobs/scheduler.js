function createRunId(now = new Date()) {
  return `run-${now.toISOString()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createScheduler({
  runPipeline,
  intervalMinutes,
  metrics = null,
  logger = console,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  nowFn = () => new Date()
}) {
  if (typeof runPipeline !== "function") {
    throw new Error("Scheduler requires runPipeline function.");
  }

  if (!Number.isInteger(intervalMinutes) || intervalMinutes <= 0) {
    throw new Error("Scheduler requires a positive integer intervalMinutes.");
  }

  let isRunning = false;
  let timer = null;

  async function runTick(trigger) {
    if (isRunning) {
      logger.warn("pipeline run skipped because previous run is still in progress", { trigger });
      return { skipped: true, reason: "overlap" };
    }

    isRunning = true;
    const startedAt = nowFn();
    const runId = createRunId(startedAt);

    logger.info("pipeline run started", { runId, trigger, startedAt: startedAt.toISOString() });
    metrics?.increment?.("runs", 1);

    try {
      const result = await runPipeline({ runId, trigger });
      const finishedAt = nowFn();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      metrics?.increment?.("relevant_changes", result?.createdChangeEvents ?? 0);
      metrics?.increment?.("emails_sent", result?.sentEmails ?? 0);

      logger.info("pipeline run completed", {
        runId,
        trigger,
        durationMs,
        processedUrls: result?.processedUrls ?? 0,
        persistedSnapshots: result?.persistedSnapshots ?? 0,
        createdChangeEvents: result?.createdChangeEvents ?? 0
      });

      return { skipped: false, runId, durationMs, result };
    } catch (error) {
      const finishedAt = nowFn();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      metrics?.increment?.("failures", 1);

      logger.error("pipeline run failed", {
        runId,
        trigger,
        durationMs,
        error: error?.message ?? "Unknown error"
      });

      throw error;
    } finally {
      isRunning = false;
    }
  }

  return {
    async runNow() {
      return runTick("manual");
    },
    start() {
      if (timer) {
        return;
      }

      const intervalMs = intervalMinutes * 60 * 1000;
      timer = setIntervalFn(() => {
        void runTick("scheduled");
      }, intervalMs);
    },
    stop() {
      if (!timer) {
        return;
      }

      clearIntervalFn(timer);
      timer = null;
    }
  };
}

