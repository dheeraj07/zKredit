import {
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import {
  Mina,
  isReady,
  PublicKey,
  fetchAccount,
  Field,
  CircuitString,
  Bool,
  Poseidon,
  PrivateKey,
} from "snarkyjs";
import ZkAppWorkerClient from "@/utilities/zkAppWorkerClient";
import { useEffect, useState } from "react";
import { CreditReport } from "../../../contracts/build/src/Square.js";

export default function VerifyCreditEligibility() {
  const [minaAddress, setMinaAddress] = useState("");
  const [minRequiredCreditScore, setMinRequiredCreditScore] = useState("");

  const toast = useToast();

  //* Mina State
  let [state, setState] = useState({
    zkAppWorkerClient: null as null | ZkAppWorkerClient,
    hasWallet: null as null | boolean,
    hasBeenSetup: false,
    accountExists: false,
    currentNum: null as null | Field,
    publicKey: null as null | PublicKey,
    zkappPublicKey: null as null | PublicKey,
    creatingTransaction: false,
    hash: "",
  });

  const connectWallet = async () => {
    await isReady;
    if (!state.hasBeenSetup) {
      const zkAppWorkerClient = new ZkAppWorkerClient();
      await zkAppWorkerClient.loadSnarkyJS();
      console.log("Loaded SnarkyJS");

      await zkAppWorkerClient.setActiveInstanceToBerkeley();
      console.log("Set active instance to Berkeley");

      const mina = (window as any).mina;

      if (mina == null) {
        setState({
          ...state,
          hasWallet: false,
        });
        return;
      }

      const publicKeyBase58 = (await mina.requestAccounts())[0];
      const publicKey = PublicKey.fromBase58(publicKeyBase58);
      console.log("Public Key: ", publicKey);

      const res = await zkAppWorkerClient.fetchAccount({
        publicKey: publicKey!,
      });

      console.log("RES", res);
      const accountExists = res.error == null;
      setMinaAddress(publicKeyBase58);

      setState({
        ...state,
        zkAppWorkerClient,
        hasWallet: true,
        hasBeenSetup: true,
        accountExists,
        publicKey,
      });
    }
  };

  return (
    <Container maxW="container.lg" p={10} minHeight="90vh">
      <Flex direction="row" justify="space-between" alignItems="center">
        <Heading as="h1" fontSize="xl" fontWeight={500}>
          Verify Credit Eligibility
        </Heading>
        <Button
          colorScheme={state.accountExists ? "red" : "green"}
          onClick={connectWallet}
        >
          {state.accountExists ? "Connected" : "Connect Wallet"}
        </Button>
      </Flex>
      <Stack spacing={4} mt={8}>
        <FormControl isReadOnly>
          <FormLabel>Public Key</FormLabel>
          <Input type="text" variant="outline" value={minaAddress} />
        </FormControl>
        <FormControl>
          <FormLabel>Min Required Credit Score</FormLabel>
          <Input
            type="number"
            variant="outline"
            value={minRequiredCreditScore}
            onChange={(e) => setMinRequiredCreditScore(e.target.value)}
          />
        </FormControl>

        <Button
          colorScheme="primary"
          onClick={handleVerify}
          alignSelf="center"
          px={8}
        >
          Verify Credit Eligibility
        </Button>
      </Stack>
    </Container>
  );

  async function handleVerify() {
    const response = await fetch(
      `http://localhost:3001/creditscore/${minaAddress}/${minRequiredCreditScore}`
    );
    const data = await response.json();

    console.log("Data: ", data);
    const creditScore = Field(data.data.creditScore);
    const dataHashValue = Field(data.data.hashValue);
    const isEligibleForLoan = Bool(data.data.isEligibleForLoan);

    console.log("Credit Score: ", creditScore);
    console.log("Data Hash Value: ", dataHashValue);
    console.log("Is Eligible For Loan: ", isEligibleForLoan);

    await state.zkAppWorkerClient?.loadContract();
    console.log("Loaded Contract");
    await state.zkAppWorkerClient?.compileContract();
    console.log("Compiled Contract");
    await state.zkAppWorkerClient?.initZkappInstance();
    console.log("Initialized Zkapp Instance");

    console.log("Comparing the hashes of wave raw data and blockchain hash");

    try {
      const txnJSON = await state.zkAppWorkerClient?.verifyCreditData(
        creditScore,
        dataHashValue,
        isEligibleForLoan
      );

      const { hash } = await (window as any).mina.sendTransaction({
        transaction: txnJSON,
        feePayer: {
          fee: 0.1,
          memo: "",
        },
      });

      console.log(
        "Transaction successful, credit score is greater than minimum required credit score"
      );
      console.log("Transaction hash: ", hash);
      toast({
        title: "Transaction Successful",
        description: `Credit score is greater than minimum required credit score`,
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (e) {
      console.log(
        "Transaction failed, credit score is less than minimum required credit score"
      );
      toast({
        title: "Transaction Successful",
        description: `Credit score is less than minimum required credit score`,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }
}
