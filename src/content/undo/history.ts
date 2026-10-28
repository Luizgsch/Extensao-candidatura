import {
  canWrite,
  setNativeValue,
  type NativeTextControl,
} from "../controls/native";
import type { UndoReport } from "../../shared/filling";
interface TextUndoEntry {
  element: NativeTextControl;
  before: string;
  applied: string;
}
export type UndoEntry =
  | TextUndoEntry
  | { restore: () => Promise<"restored" | "conflict" | "failed"> };
let entries: UndoEntry[] = [];
let collecting: UndoEntry[] | undefined;
export function beginUndoOperation() {
  collecting = [];
}
export function endUndoOperation() {
  if (collecting?.length) entries = collecting;
  collecting = undefined;
}
export function hasUndo(): boolean {
  return entries.length > 0;
}
export function remember(batch: UndoEntry[]): void {
  if (collecting) {
    collecting.push(...batch);
    return;
  }
  if (batch.length) entries = batch;
}
export async function undoLast(): Promise<UndoReport> {
  const batch = entries;
  entries = [];
  const report: UndoReport = { restored: 0, conflicts: 0, failed: 0 };
  for (const item of batch) {
    if ("restore" in item) {
      try {
        const result = await item.restore();
        if (result === "conflict") report.conflicts++;
        else report[result]++;
      } catch {
        report.failed++;
      }
      continue;
    }
    if (!canWrite(item.element) || item.element.value !== item.applied) {
      report.conflicts++;
      continue;
    }
    try {
      setNativeValue(item.element, item.before);
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (item.element.value === item.before) report.restored++;
      else report.failed++;
    } catch {
      report.failed++;
    }
  }
  return report;
}
