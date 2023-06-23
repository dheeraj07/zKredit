import {
  Mina,
  isReady,
  PublicKey,
  fetchAccount,
  PrivateKey,
  Field,
  Bool,
} from "snarkyjs";

type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

// ---------------------------------------------------------------------------------------

import type { Square } from "../../../contracts/build/src/Square";

const state = {
  Square: null as null | typeof Square,
  zkapp: null as null | Square,
  zkAppAddress: null as null | PublicKey,
  zkAppPrivateKey: null as null | PrivateKey,
  txHash: null as null | string,
  transaction: null as null | Transaction,
};

// ---------------------------------------------------------------------------------------

const functions = {
  loadSnarkyJS: async (args: {}) => {
    await isReady;
  },
  setActiveInstanceToBerkeley: async (args: {}) => {
    const Berkeley = Mina.Network(
      "https://proxy.berkeley.minaexplorer.com/graphql"
    );
    Mina.setActiveInstance(Berkeley);
  },
  loadContract: async (args: {}) => {
    const { Square } = await import("../../../contracts/build/src/Square.js");
    state.Square = Square;
  },
  compileContract: async (args: {}) => {
    await state.Square!.compile();
  },
  fetchAccount: async (args: { publicKey58: string }) => {
    const publicKey = PublicKey.fromBase58(args.publicKey58);
    return await fetchAccount({ publicKey });
  },
  initZkappInstance: async (args: {}) => {
    // state.zkAppPrivateKey = PrivateKey.random();
    // state.zkAppAddress = state.zkAppPrivateKey.toPublicKey();

    // state.zkAppPrivateKey = PrivateKey.fromBase58(
    //   "EKFdNqsrvchDc3UXWp9cULMDw4BhoDFCaYmPq1Kg2nCzKycVggp"
    // );

    //console.log("zkAppPrivateKey", state.zkAppPrivateKey.toJSON());
    const publicKey58 =
      "B62qpG9EQYABwQhSJ2fUG4qy3rxSsPWtx7TErZgQMrc8Gj1f2c2bqLD";
    console.log("Public key", publicKey58);
    state.zkAppAddress = PublicKey.fromBase58(publicKey58);
    state.zkapp = new state.Square!(state.zkAppAddress);
  },
  deployZkappInstance: async (args: {}) => {
    const deployTxn = await Mina.transaction(() => {
      state.zkapp!.deploy();
    });
    const tx = await deployTxn.sign([state.zkAppPrivateKey!]).send();
    state.txHash = tx.hash()!;
    console.log("txHash", state.txHash);
    console.log("zkAppAddress", state.zkAppAddress!.toBase58());
    console.log("zkAppPrivateKey", state.zkAppPrivateKey!.toJSON());
  },

  updateCreditData: async (args: { creditDataHash: Field }) => {
    const transaction = await Mina.transaction(() => {
      state.zkapp!.updateCreditData(args.creditDataHash);
    });
    await transaction.prove();
    return transaction.toJSON();
  },

  getReportHash: async (args: {}) => {
    return await state.zkapp!.reportHash.get();
  },

  verifyCreditData: async (args: {
    creditScore: Field;
    dataHashValue: Field;
    isEligibleForLoan: Bool;
  }) => {
    console.log(args);
    const txn = await Mina.transaction(() => {
      state.zkapp!.verifyCreditData(
        args.creditScore,
        args.dataHashValue,
        args.isEligibleForLoan
      );
    });
    await txn.prove();
    return txn.toJSON();
  },

  proveUpdateTransaction: async (args: {}) => {
    await state.transaction!.prove();
  },
  getTransactionJSON: async (args: {}) => {
    return state.transaction!.toJSON();
  },
};

// ---------------------------------------------------------------------------------------

export type WorkerFunctions = keyof typeof functions;

export type ZkappWorkerRequest = {
  id: number;
  fn: WorkerFunctions;
  args: any;
};

export type ZkappWorkerReponse = {
  id: number;
  data: any;
};
if (process.browser) {
  addEventListener(
    "message",
    async (event: MessageEvent<ZkappWorkerRequest>) => {
      const returnData = await functions[event.data.fn](event.data.args);

      const message: ZkappWorkerReponse = {
        id: event.data.id,
        data: returnData,
      };
      postMessage(message);
    }
  );
}
