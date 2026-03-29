import { randomBytes } from "node:crypto";

export function newAdId(): string {
    return `ad_${randomBytes(8).toString("hex")}`;
}
