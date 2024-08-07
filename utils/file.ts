import { orderBy } from "npm:lodash-es";
import {
  calculateBestIps,
  type HostStats,
  type PingResult,
} from "../services/ping.ts";

export async function readTodayData(dbFilePath: string): Promise<PingResult[]> {
  try {
    const savedData = await Deno.readTextFile(dbFilePath).then(JSON.parse);
    return savedData;
  } catch {
    return [];
  }
}

export function getBestIps(data: PingResult[], maxNum = 10, keyword?: string) {
  const list = calculateBestIps(data);
  const bestIps: HostStats[] = orderBy(list, [
    "lossRate",
    "averageTime",
    "standardDeviation",
  ]).filter((i: HostStats) => keyword ? i.host.includes(keyword) : true).slice(
    0,
    maxNum,
  );
  if (bestIps.some((i) => i.colo)) {
    return [
      ["服务器", "延迟", "丢包率", "服务器地址"],
      ...bestIps.map((i) => [
        i.host,
        `${i.averageTime.toFixed(1)}ms σ=${i.standardDeviation.toFixed(1)}`,
        `${
          (i.lossRate * 100).toFixed(1)
        }% (${i.successfulPings}/${i.totalPings})`,
        i.colo,
      ]),
    ];
  }
  return [
    ["服务器", "延迟", "丢包率"],
    ...bestIps.map((i) => [
      i.host,
      `${i.averageTime.toFixed(1)}ms σ=${i.standardDeviation.toFixed(1)}`,
      `${
        (i.lossRate * 100).toFixed(1)
      }% (${i.successfulPings}/${i.totalPings})`,
    ]),
  ];
}
