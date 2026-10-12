declare module "mammoth" {
  export interface ExtractRawTextResult {
    value: string;
    messages: unknown[];
  }
  export function extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<ExtractRawTextResult>;
}
