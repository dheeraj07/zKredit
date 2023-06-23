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

export default function GenerateCreditProof() {
  const [fullName, setFullName] = useState("");
  const [ssn, setSSN] = useState("");
  const [minaAddress, setMinaAddress] = useState("");
  const [creditScore, setCreditScore] = useState(0);

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
    reportHash: null as null | Field,
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
          Generate Credit Proof
        </Heading>
        <Button
          colorScheme={state.accountExists ? "red" : "green"}
          onClick={connectWallet}
        >
          {state.accountExists ? "Connected" : "Connect Wallet"}
        </Button>
      </Flex>
      <Stack
        mt={6}
        bg="gray.100"
        as="form"
        direction="column"
        spacing={6}
        p={6}
        rounded="2xl"
        onSubmit={handleFormSubmit}
      >
        <FormControl isRequired>
          <FormLabel>Full Name</FormLabel>
          <Input
            autoComplete="off"
            variant="outline"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </FormControl>
        <FormControl isRequired>
          <FormLabel>SSN</FormLabel>
          <Input
            autoComplete="off"
            variant="outline"
            colorScheme="green"
            type="password"
            placeholder="123-45-6789"
            value={ssn}
            onChange={(e) => setSSN(e.target.value)}
          />
        </FormControl>
        <FormControl isDisabled>
          <FormLabel>Mina Address</FormLabel>
          <Input variant="outline" value={minaAddress} />
        </FormControl>
        <Button type="submit" colorScheme="green" alignSelf="center" px={8}>
          Generate Credit Report
        </Button>
      </Stack>
      {creditScore > 0 && (
        <Stack bg="gray.100" spacing={6} p={6} rounded="2xl" mt={6}>
          <Heading as="h2" fontSize="xl" fontWeight={500}>
            Generated Credit Report
          </Heading>
          <Text fontSize="lg" fontWeight={400}>
            Your Credit Score is: {creditScore}
          </Text>
          <Button
            colorScheme="primary"
            onClick={generateZKCreditProof}
            alignSelf="center"
            px={8}
          >
            Generate ZK Credit Proof
          </Button>
          {state.hash && (
            <Text fontSize="lg" fontWeight={400}>
              See your transaction on the Mina Explorer:{" "}
              <a
                href={`https://berkeley.minaexplorer.com/transaction/${state.hash}`}
                target="_blank"
                rel="noreferrer"
              >
                {state.hash}
              </a>
            </Text>
          )}
        </Stack>
      )}
    </Container>
  );

  async function generateZKCreditProof() {
    console.log("Generating ZK Credit Proof");
    const creditRawData = {
      SSN_ID: ssn,
      USER_NAME: fullName,
      CREDIT_SCORE: creditScore,
      PUBLIC_ADDRESS: minaAddress,
    };

    const creditData = {
      SSN_ID: new Field(ssn),
      USER_NAME: CircuitString.fromString(fullName),
      CREDIT_SCORE: new Field(creditScore),
      PUBLIC_ADDRESS: CircuitString.fromString(minaAddress),
    };
    const creditDataHash = Poseidon.hash(CreditReport.toFields(creditData));

    await state.zkAppWorkerClient?.loadContract();
    console.log("Loaded Contract");
    await state.zkAppWorkerClient?.compileContract();
    console.log("Compiled Contract");
    await state.zkAppWorkerClient?.initZkappInstance();
    console.log("Initialized Zkapp Instance");
    const transactionJSON = await state.zkAppWorkerClient?.updateCreditData(
      creditDataHash
    );

    console.log("Transaction JSON: ", transactionJSON);

    const { hash } = await (window as any).mina.sendTransaction({
      transaction: transactionJSON,
      feePayer: {
        fee: 0.1,
        memo: "",
      },
    });
    console.log("Transaction Hash: ", hash);
    const reportHash =
      (await state.zkAppWorkerClient?.getReportHash()) as Field;
    console.log("Report Hash: ", reportHash);
    setState({
      ...state,
      hash,
      reportHash,
    });
    toast({
      title: "Transaction Sent",
      description: `The ZK Proof of the Credit Score for address: ${minaAddress} has been stored on the blockchain.`,
      status: "success",
      duration: 5000,
      isClosable: true,
    });

    fetch("http://localhost:3001/store-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(creditRawData),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        return response.json();
      })
      .then((result) => {
        console.log(result);
        toast({
          title: "Data Stored on Waev",
          description: `The Credit Score for address: ${minaAddress} has been stored on Waev.`,
          status: "info",
          duration: 5000,
          isClosable: true,
        });
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  }

  async function handleFormSubmit(e: any) {
    e.preventDefault();
    console.log("Full Name: ", fullName);
    console.log("SSN: ", ssn);
    console.log("Mina Address: ", minaAddress);
    //Generate Random credit score between 750 and 850
    setCreditScore(Math.floor(Math.random() * (850 - 750 + 1) + 750));
  }
}
