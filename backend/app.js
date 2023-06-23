const Koa = require("koa");
const Router = require("@koa/router");
const bodyParser = require("koa-bodyparser");
const cors = require("@koa/cors");
const {
  isReady,
  PrivateKey,
  Field,
  Signature,
  CircuitString,
  Poseidon,
} = require("snarkyjs");
const { CreditReport } = require("./Square.js");

const PORT = process.env.PORT || 3001;

const app = new Koa();
const router = new Router();
const dataStore = {};

app.use(cors());
app.use(bodyParser());

async function getSignedCreditScore(creditParam, public_key) {
  await isReady;
  let isEligibleForLoan = false;
  const privateKey = PrivateKey.fromBase58(
    process.env.PRIVATE_KEY ??
      "EKF65JKw9Q1XWLDZyZNGysBbYG21QbJf3a4xnEoZPZ28LKYGMw53"
  );

  const knownCreditScore = (creditParam) => parseInt(creditParam, 10);

  if (dataStore.hasOwnProperty(public_key)) {
    const data = dataStore[public_key];
    const minimumRequiredScore = knownCreditScore(creditParam);
    const creditScore = data.CREDIT_SCORE;
    if (creditScore >= minimumRequiredScore) {
      isEligibleForLoan = true;
    }
  }

  const publicKey = privateKey.toPublicKey();
  console.log(publicKey);

  const id = Field(creditParam);

  const creditScore = Field(knownCreditScore(creditParam));

  const signature = Signature.create(privateKey, [id, creditScore]);

  const recreatedObj = await recreateObject(public_key);
  const hashValue = hashDetails(recreatedObj);

  return {
    data: {
      creditScore: creditScore,
      hashValue: hashValue,
      isEligibleForLoan: isEligibleForLoan,
    },
    signature: signature,
    publicKey: publicKey,
  };
}

async function recreateObject(publicKey) {
  if (dataStore.hasOwnProperty(publicKey)) {
    const data = dataStore[publicKey];
    return {
      SSN_ID: new Field(data.SSN_ID),
      USER_NAME: CircuitString.fromString(data.USER_NAME),
      CREDIT_SCORE: new Field(data.CREDIT_SCORE),
      PUBLIC_ADDRESS: CircuitString.fromString(data.PUBLIC_ADDRESS),
    };
  } else {
    throw new Error(`Data not found for publicKey: ${publicKey}`);
  }
}

function hashDetails(cReport) {
  return Poseidon.hash(CreditReport.toFields(cReport));
}

router.get("/creditscore/:public_key/:min_credit_score", async (ctx) => {
  ctx.body = await getSignedCreditScore(
    ctx.params.min_credit_score,
    ctx.params.public_key
  );
});

/*
app.use(async (ctx) => {
  if (ctx.method === 'POST' && ctx.url === 'https://api.waev.com/deployments/fc26ab54-e593-492c-8fb6-b8c182eac303/records') {
    const bearerToken = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijk4ODY2MjhlLTYwYjQtNGI4ZC04NzY4LTJiNGRkY2QyM2I0OSIsImlhdCI6MTY4MjgwMDk1OX0.Jr_VwNB_qx7NdJrm780WGMLdsA7Fghf515EWvWXq5ds';
    const authHeader = ctx.headers['authorization'];

    if (authHeader && authHeader === bearerToken) {
      ctx.status = 200;
      ctx.body = {
        success: true,
        message: 'POST request successful.',
        data: ctx.request.body,
      };
    } else {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Unauthorized access.',
      };
    }
  }
});
*/

router.post("/store-data", async (ctx) => {
  const { SSN_ID, USER_NAME, CREDIT_SCORE, PUBLIC_ADDRESS } = ctx.request.body;
  dataStore[PUBLIC_ADDRESS] = {
    SSN_ID,
    USER_NAME,
    CREDIT_SCORE,
    PUBLIC_ADDRESS,
  };

  ctx.body = {
    message: "Data stored successfully",
  };
  console.log(dataStore);
});

app.use(router.routes()).use(router.allowedMethods());

app.listen(PORT);
