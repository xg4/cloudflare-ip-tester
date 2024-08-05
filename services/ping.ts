import { compact, groupBy, map, ping } from "../deps.ts";

export interface PingResult {
  host: string;
  time: number;
}

export interface HostStats {
  host: string;
  averageTime: string;
  standardDeviation: string;
  totalPings: number;
  successfulPings: number;
  lossRate: number;
}

export async function pingHost(host: string): Promise<PingResult> {
  try {
    const response = await ping.promise.probe(host);
    if (response.alive) {
      return { host, time: response.time };
    }
  } catch {}

  return {
    host,
    time: -1,
  };
}

export function calculateBestIps(data: PingResult[]): HostStats[] {
  const grouped: Record<string, HostStats[]> = groupBy(data, "host");

  const list = map(grouped, (items: HostStats[], host: string) => {
    const times: number[] = map(items, "time");
    if (times.every((i) => i < 0)) {
      return null;
    }
    const validTimes = times.filter((i) => i > 0);
    if (validTimes.length < 1) {
      return null;
    }
    const lossRate = 1 - validTimes.length / times.length;
    if (lossRate > 0.8) {
      return null;
    }
    const mean = validTimes.reduce((acc, val) => acc + val, 0) /
      validTimes.length;
    if (mean > 200) {
      return null;
    }
    const sumsq = validTimes.reduce(
      (acc, val) => acc + Math.pow(val - mean, 2),
      0,
    );
    const std = Math.sqrt(sumsq / validTimes.length);
    return {
      host,
      totalPings: times.length,
      successfulPings: validTimes.length,
      averageTime: mean.toFixed(1),
      standardDeviation: std.toFixed(1),
      lossRate,
    };
  });

  return compact(list);
}
