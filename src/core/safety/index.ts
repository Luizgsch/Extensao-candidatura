import type { FieldDescriptor } from "../../shared/types";
export function canConsiderField(
  field: FieldDescriptor,
  preserveExisting = true,
): boolean {
  return (
    field.visible &&
    field.editable &&
    (!preserveExisting || field.empty) &&
    !["password", "file", "hidden", "submit", "button", "reset"].includes(
      field.controlType,
    )
  );
}
