import { compact, groupBy, map } from "npm:lodash-es";
import ping from "npm:ping";
import { args } from "../main.ts";
import { HostStats, PingResult, probeType } from "../types.ts";
import { fetchWithTimeout } from "../utils/request.ts";

export async function fetchHost(host: string): Promise<PingResult> {
  try {
    const now = Date.now();
    const response = await fetchWithTimeout(
      `http://${host}/cdn-cgi/trace?t=${now}`,
    );
    if (response.ok) {
      const text = await response.text();
      const params = Object.fromEntries(
        text.trim().split("\n").map((line) => line.split("=")),
      );
      return {
        host,
        time: params.ts * 1e3 - now,
        colo: params.colo,
      };
    }
  } catch {
    //
  }
  return { host, time: -1 };
}

export async function pingHost(host: string): Promise<PingResult> {
  try {
    const response = await ping.promise.probe(host);
    if (response.alive) {
      return { host, time: response.time };
    }
  } catch {
    //
  }

  return {
    host,
    time: -1,
  };
}

export function calculateBestIps(data: PingResult[]): HostStats[] {
  const grouped: Record<string, HostStats[]> = groupBy(data, "host");

  const list = map(grouped, (items: HostStats[], host: string) => {
    const times: number[] = map(items, "time");
    const colo: string[] = map(items, "colo").filter(Boolean);
    if (times.length > 3 && times.every((i) => i < 0)) {
      return null;
    }
    const validTimes = times.filter((i) => i > 0);
    if (times.length > 3 && validTimes.length < 1) {
      return null;
    }
    const lossRate = 1 - validTimes.length / times.length;
    if (times.length > 3 && lossRate > 0.8) {
      return null;
    }
    const mean = validTimes.length
      ? validTimes.reduce((acc, val) => acc + val, 0) /
        validTimes.length
      : 0;
    if (args.t === probeType.Enum.ping && mean > 200) {
      return null;
    }
    const sumsq = validTimes.reduce(
      (acc, val) => acc + Math.pow(val - mean, 2),
      0,
    );
    const std = validTimes.length ? Math.sqrt(sumsq / validTimes.length) : 0;
    return {
      host,
      totalPings: times.length,
      successfulPings: validTimes.length,
      averageTime: mean,
      standardDeviation: std,
      lossRate,
      colo: colo[0],
    };
  });

  return compact(list);
}
