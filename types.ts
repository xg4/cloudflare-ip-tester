import { z } from "npm:zod";

export const probeType = z.enum(["ping", "fetch"]);

export interface PingResult {
    host: string;
    time: number;
    colo?: string;
}

export interface HostStats {
    host: string;
    averageTime: number;
    standardDeviation: number;
    totalPings: number;
    successfulPings: number;
    lossRate: number;
    colo?: string;
}
