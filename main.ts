import { format } from "@std/datetime/format";
import { join } from "@std/path/join";
import os from "node:os";
import ms from "npm:ms";
import { table } from "npm:table";
import { getCloudflareIps, testHosts } from "./services/ip.ts";
import { getBestIps, readTodayData } from "./utils/file.ts";

import { parseArgs } from "@std/cli/parse-args";
import { spinner } from "./utils/spinner.ts";

interface Args {
  // 强制重新测试
  f?: boolean;
  // 展示最佳 ip 数量
  n?: number;
  // 并发测试 ip 数量
  c?: any;
}

export const args = parseArgs<Args>(Deno.args);

const tempDir = os.tmpdir();
const today = format(new Date(), "yyyy-MM-dd");

export const dbFilePath = join(tempDir, `ping-${today}.txt`);

async function main() {
  const startTime = performance.now();
  spinner.start();

  const previousData = args.f ? [] : await readTodayData(dbFilePath);

  const testResults = await getCloudflareIps(previousData).then(testHosts);
  testResults.push(...previousData);

  const [tableData] = await Promise.all([
    getBestIps(testResults, args.n),
    Deno.writeTextFile(dbFilePath, JSON.stringify(testResults)),
  ]);
  console.log(table(tableData));

  spinner.succeed(`Finished in ${ms(performance.now() - startTime)}`);
}

main().catch(console.error);
