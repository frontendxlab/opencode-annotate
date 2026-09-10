export const pkg: string
export const v1pkg: string
export const detect: () => { v1: string | null; v2: string | null; gui: string | null; browser: string | null }
export const patch: (text: string, keys: string[], spec?: string) => { text: string; changes: unknown[] }
export const smoke: (file: string | null) => Promise<{ ok: boolean; message: string }>
export const main: (args?: string[]) => Promise<void>
