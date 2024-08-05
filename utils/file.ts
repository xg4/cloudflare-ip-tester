import { orderBy } from "../deps.ts";
import { calculateBestIps, HostStats, PingResult } from "../services/ping.ts";

export async function readTodayData(dbFilePath: string): Promise<PingResult[]> {
  try {
    const savedData = await Deno.readTextFile(dbFilePath).then(JSON.parse);
    return savedData;
  } catch {
    return [];
  }
}

export function getBestIps(data: PingResult[]) {
  const list = calculateBestIps(data);
  const bestIps: HostStats[] = orderBy(list, [
    "packetLossRate",
    "time",
    "std",
  ]).slice(0, 10);
  return [
    ["服务器", "延迟", "丢包率"],
    ...bestIps.map((i) => [
      i.host,
      `${i.averageTime}ms σ=${i.standardDeviation}`,
      `${
        (i.lossRate * 100).toFixed(1)
      }% (${i.successfulPings}/${i.totalPings})`,
    ]),
  ];
}
