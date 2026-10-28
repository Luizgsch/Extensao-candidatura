import type { FieldDescriptor } from "../shared/types";
export interface PlatformAdapter {
  id: string;
  supports(url: URL): boolean;
  enrich(field: FieldDescriptor): FieldDescriptor;
}
export const genericAdapter: PlatformAdapter = {
  id: "generic",
  supports: () => true,
  enrich: (field) => field,
};
