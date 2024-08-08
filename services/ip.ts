import ms from "npm:ms";
import pLimit from "npm:p-limit";
import { args } from "../main.ts";
import { PingResult, probeType } from "../types.ts";
import { getSubnetIps } from "../utils/network.ts";
import { spinner } from "../utils/spinner.ts";
import { calculateBestIps, fetchHost, pingHost } from "./ping.ts";

export async function getCloudflareIps(previousData: PingResult[]) {
  const list = calculateBestIps(previousData);
  if (list.length) {
    return list.map((i) => i.host);
  }

  const response = await fetch("https://www.cloudflare.com/ips-v4");
  const data = await response.text();
  const ipRanges = data.trim().split("\n");
  const hosts = ipRanges
    .map(getSubnetIps)
    .flat()
    .filter((ip) => ip.endsWith(".0"));
  spinner.succeed("Fetched cloudflare ips");
  return hosts;
}

export async function testHosts(hosts: string[]) {
  const limit = pLimit(args.c);
  let index = 0;
  spinner.start(`Testing ${index++}/${hosts.length}`);
  const now = performance.now();
  const results = await Promise.all(
    hosts.map((host) =>
      limit(async () => {
        const result = await (args.t === probeType.Enum.ping
          ? pingHost(host)
          : fetchHost(host));
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
