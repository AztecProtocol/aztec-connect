export declare class Crs {
    readonly numPoints: number;
    private data;
    private g2Data;
    constructor(numPoints: number);
    download(): Promise<void>;
    downloadG2Data(): Promise<void>;
    getData(): Uint8Array;
    getG2Data(): Uint8Array;
}
//# sourceMappingURL=index.d.ts.map