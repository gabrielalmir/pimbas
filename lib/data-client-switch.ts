import type { DataClient } from "./data-client";
import { httpDataClient } from "./http-data-client";

export const dataClient: DataClient = httpDataClient;
