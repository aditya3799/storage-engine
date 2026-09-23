/* tslint:disable */
/* eslint-disable */

export class HydraEngine {
    free(): void;
    [Symbol.dispose](): void;
    compact(): string;
    flush(): string;
    get_event_log(): string;
    get_state(): string;
    constructor(memtable_threshold: number);
    read(key: string): string;
    simulate_crash(): string;
    tick(): string;
    write(key: string, value: string): string;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_hydraengine_free: (a: number, b: number) => void;
    readonly hydraengine_compact: (a: number) => [number, number];
    readonly hydraengine_flush: (a: number) => [number, number];
    readonly hydraengine_get_event_log: (a: number) => [number, number];
    readonly hydraengine_get_state: (a: number) => [number, number];
    readonly hydraengine_new: (a: number) => number;
    readonly hydraengine_read: (a: number, b: number, c: number) => [number, number];
    readonly hydraengine_simulate_crash: (a: number) => [number, number];
    readonly hydraengine_tick: (a: number) => [number, number];
    readonly hydraengine_write: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
