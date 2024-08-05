import { format } from "@std/datetime/format";
import { join } from "@std/path/join";
import { ms, ora, os, table } from "./deps.ts";
import { getCloudflareIps, testHosts } from "./services/ip.ts";
import { getBestIps, readTodayData } from "./utils/file.ts";

const tempDir = os.tmpdir();
const today = format(new Date(), "yyyy-MM-dd");

export const dbFilePath = join(tempDir, `ping-${today}.txt`);

async function main() {
  const startTime = performance.now();
  const spinner = ora({
    text: `Running`,
    discardStdin: false,
    suffixText: "\n",
  }).start();
  const previousData = await readTodayData(dbFilePath);

  const testResults = await getCloudflareIps(previousData).then(testHosts);
  testResults.push(...previousData);

  const [tableData] = await Promise.all([
    getBestIps(testResults),
    Deno.writeTextFile(dbFilePath, JSON.stringify(testResults)),
  ]);
  console.log(table(tableData));

  spinner.succeed(`Finished ${ms(performance.now() - startTime)}`);
}

main().catch(console.error);
