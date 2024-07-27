import os from "node:os";
import path from "node:path";
import ip from "npm:ip";
import { compact, groupBy, map, orderBy } from "npm:lodash-es";
import ms from "npm:ms";
import ora from "npm:ora";
import pLimit from "npm:p-limit";
import ping from "npm:ping";

const limit = pLimit(500);
const [today] = new Date().toISOString().split("T");

const tempDir = os.tmpdir();
const dbFilename = path.join(tempDir, `ping-${today}.txt`);

const res = await fetch("https://www.cloudflare.com/ips-v4");
const data = await res.text();
const ips = data.trim().split("\n");

function getCidrSubnet(cidr: string): string[] {
  const subnet = ip.cidrSubnet(cidr);
  const start = ip.toLong(subnet.networkAddress);
  const end = ip.toLong(subnet.broadcastAddress);

  return Array.from(
    {
      length: end - start,
    },
    (_, i) => ip.fromLong(i + start)
  );
}

const hosts = ips
  .map(getCidrSubnet)
  .flat()
  .filter((ip) => ip.endsWith(".0"));

console.log(`find ${hosts.length} ips`);

async function tcpPing(host: string): Promise<Data> {
  try {
    const res = await ping.promise.probe(host);
    if (res.alive) {
      return { host, time: res.time };
    }
  } catch {}

  return {
    host,
    time: -1,
  };
}

let index = 0;
const spinner = ora({
  text: `Loading ${index++}/${hosts.length}`,
  discardStdin: false,
}).start();
const now = performance.now();
const result = await Promise.all(
  hosts.map((i) =>
    limit(async (host) => {
      const result = await tcpPing(host);
      spinner.text = `Loading ${index++}/${hosts.length}`;
      return result;
    }, i)
  )
);
// spinner.stop();
spinner.succeed(`Response in ${ms(performance.now() - now)}`);

interface Data {
  host: string;
  time: number;
}

interface Stat {
  host: string;
  time: string;
  std: string;
  packetLossRate: number;
}
try {
  const savedData = await Deno.readTextFile(dbFilename).then(JSON.parse);
  result.push(...savedData);
} catch {}

async function findBestIps(data: Data[]) {
  const grouped: Record<string, Stat[]> = groupBy(data, "host");

  const list = map(grouped, (items: Stat[], host: string) => {
    const times: number[] = map(items, "time");
    if (times.every((i) => i < 0)) {
      return null;
    }
    const validTimes = times.filter((i) => i > 0);
    if (validTimes.length < 1) {
      return null;
    }
    const packetLossRate = 1 - validTimes.length / times.length;
    if (packetLossRate > 0.8) {
      return null;
    }
    const mean =
      validTimes.reduce((acc, val) => acc + val, 0) / validTimes.length;
    if (mean > 200) {
      return null;
    }
    const sumsq = validTimes.reduce(
      (acc, val) => acc + Math.pow(val - mean, 2),
      0
    );
    const std = Math.sqrt(sumsq / validTimes.length);
    return {
      host,
      time: mean.toFixed(1),
      std: std.toFixed(1),
      packetLossRate,
    };
  });

  const bestIps: Stat[] = orderBy(compact(list), [
    "packetLossRate",
    "time",
    "std",
  ]).slice(0, 10);

  await Deno.writeTextFile(
    `best-ips-${today}.txt`,
    [
      ["服务器".padEnd(14, " "), "平均延迟".padEnd(7, " "), "丢包率"].join(""),
      ...bestIps.map((i) =>
        [
          i.host.padEnd(16, " "),
          (i.time + "ms").padEnd(10, " "),
          i.packetLossRate * 100 + "%",
        ].join("")
      ),
    ].join("\n")
  );
}

await Promise.all([
  Deno.writeTextFile(dbFilename, JSON.stringify(result)),
  findBestIps(result),
]);

console.log("finished");
