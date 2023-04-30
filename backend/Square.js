const { Field, SmartContract, state, State, method, Struct, Poseidon, CircuitString } = require('snarkyjs');

class CreditReport extends Struct({
    SSN_ID: Field,
    USER_NAME: CircuitString,
    CREDIT_SCORE: Field,
    PUBLIC_ADDRESS: CircuitString
}) {
}

module.exports = { CreditReport };