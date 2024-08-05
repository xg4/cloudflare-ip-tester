import { ms, ora, pLimit } from "../deps.ts";
import { getSubnetIps } from "../utils/network.ts";
import { calculateBestIps, pingHost, PingResult } from "./ping.ts";

const limit = pLimit(500);

export async function getCloudflareIps(previousData: PingResult[]) {
  const list = calculateBestIps(previousData);
  if (list.length) {
    return list.map((i) => i.host);
  }

  console.time("fetching");
  const response = await fetch("https://www.cloudflare.com/ips-v4");
  const data = await response.text();
  const ipRanges = data.trim().split("\n");
  const hosts = ipRanges
    .map(getSubnetIps)
    .flat()
    .filter((ip) => ip.endsWith(".0"));
  console.timeEnd("fetching");
  return hosts;
}

export async function testHosts(hosts: string[]) {
  let index = 0;
  const spinner = ora({
    text: `Testing ${index++}/${hosts.length}`,
    discardStdin: false,
  }).start();
  const now = performance.now();
  const results = await Promise.all(
    hosts.map((host) =>
      limit(async () => {
        const result = await pingHost(host);
        spinner.text = `Testing ${index++}/${hosts.length}`;
        return result;
      })
    ),
  );
  spinner.succeed(
    `Tested ${hosts.length} hosts in ${ms(performance.now() - now)}`,
  );
  return results;
}
