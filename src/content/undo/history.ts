import {
  canWrite,
  setNativeValue,
  type NativeTextControl,
} from "../controls/native";
import type { UndoReport } from "../../shared/filling";
export interface UndoEntry {
  element: NativeTextControl;
  before: string;
  applied: string;
}
let entries: UndoEntry[] = [];
export function hasUndo(): boolean {
  return entries.length > 0;
}
export function remember(batch: UndoEntry[]): void {
  if (batch.length) entries = batch;
}
export async function undoLast(): Promise<UndoReport> {
  const batch = entries;
  entries = [];
  const report: UndoReport = { restored: 0, conflicts: 0, failed: 0 };
  for (const item of batch) {
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
