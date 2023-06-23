export { Poseidon, PoseidonLegacy };
declare const Poseidon: {
    initialState: () => bigint[];
    update: ([...state]: bigint[], input: bigint[]) => bigint[];
    hash: (input: bigint[]) => bigint;
};
declare const PoseidonLegacy: {
    initialState: () => bigint[];
    update: ([...state]: bigint[], input: bigint[]) => bigint[];
    hash: (input: bigint[]) => bigint;
};
