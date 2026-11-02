declare module 'pdfjs-dist/build/pdf.mjs' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: any): { promise: Promise<any> };
}

declare module 'pdfjs-dist/legacy/build/pdf.mjs' {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(src: any): { promise: Promise<any> };
}

declare module 'mammoth' {
  export function extractRawText(input: { buffer?: Buffer; path?: string; arrayBuffer?: ArrayBuffer }): Promise<{ value: string; messages: any[] }>;
}

