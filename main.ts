import { parseArgs } from "@std/cli/parse-args";
import { format } from "@std/datetime/format";
import { join } from "@std/path/join";
import os from "node:os";
import ms from "npm:ms";
import { table } from "npm:table";
import { z } from "npm:zod";
import { getCloudflareIps, testHosts } from "./services/ip.ts";
import { ProbeType } from "./services/ping.ts";
import { getBestIps, readTodayData } from "./utils/file.ts";
import { spinner } from "./utils/spinner.ts";

const ArgsSchema = z.object({
  f: z.coerce.boolean().catch(false),
  n: z.coerce.number().min(0).max(100).catch(10),
  c: z.coerce.number().min(0).max(500).catch(200),
  k: z.coerce.string().optional(),
  t: z.string().catch(ProbeType[0]),
});

export const args = ArgsSchema.parse(parseArgs(Deno.args));

const tempDir = os.tmpdir();
const today = format(new Date(), "yyyy-MM-dd");

export const dbFilePath = join(tempDir, `${args.t}-${today}`);

async function main() {
  console.log(dbFilePath);
  const startTime = performance.now();
  spinner.start();

  const previousData = args.f ? [] : await readTodayData(dbFilePath);

  const testResults = await getCloudflareIps(previousData).then(testHosts);
  testResults.push(...previousData);

  const [tableData] = await Promise.all([
    getBestIps(testResults, args.n, args.k),
    Deno.writeTextFile(dbFilePath, JSON.stringify(testResults)),
  ]);
  console.log(table(tableData));

  spinner.succeed(`Finished in ${ms(performance.now() - startTime)}`);
}

main().catch(console.error);
