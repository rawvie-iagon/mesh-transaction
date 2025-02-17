// src/mesh-tx-builder/index.ts
import { CSLSerializer } from "@meshsdk/core-csl";

// src/mesh-tx-builder/tx-builder-core.ts
import JSONBig from "json-bigint";
import {
  DEFAULT_PROTOCOL_PARAMETERS,
  DEFAULT_REDEEMER_BUDGET,
  emptyTxBuilderBody,
  UtxoSelection
} from "@meshsdk/common";
var MeshTxBuilderCore = class {
  txEvaluationMultiplier = 1.1;
  txOutput;
  addingPlutusScriptInput = false;
  plutusSpendingScriptVersion;
  addingPlutusMint = false;
  plutusMintingScriptVersion;
  addingPlutusWithdrawal = false;
  plutusWithdrawalScriptVersion;
  _protocolParams = DEFAULT_PROTOCOL_PARAMETERS;
  mintItem;
  txInQueueItem;
  withdrawalItem;
  collateralQueueItem;
  refScriptTxInQueueItem;
  meshTxBuilderBody;
  constructor() {
    this.meshTxBuilderBody = emptyTxBuilderBody();
  }
  /**
   * Set the input for transaction
   * @param txHash The transaction hash of the input UTxO
   * @param txIndex The transaction index of the input UTxO
   * @param amount The asset amount of index of the input UTxO
   * @param address The address of the input UTxO
   * @returns The MeshTxBuilder instance
   */
  txIn = (txHash, txIndex, amount, address) => {
    if (this.txInQueueItem) {
      this.queueInput();
    }
    if (!this.addingPlutusScriptInput) {
      this.txInQueueItem = {
        type: "PubKey",
        txIn: {
          txHash,
          txIndex,
          amount,
          address
        }
      };
    } else {
      this.txInQueueItem = {
        type: "Script",
        txIn: {
          txHash,
          txIndex,
          amount,
          address
        },
        scriptTxIn: {}
      };
    }
    this.addingPlutusScriptInput = false;
    return this;
  };
  /**
   * Set the script for transaction input
   * @param {string} scriptCbor The CborHex of the script
   * @param version Optional - The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  txInScript = (scriptCbor) => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey") {
      this.txInQueueItem = {
        type: "SimpleScript",
        txIn: this.txInQueueItem.txIn,
        simpleScriptTxIn: {
          scriptSource: {
            type: "Provided",
            script: scriptCbor
          }
        }
      };
    }
    if (this.txInQueueItem.type === "Script") {
      this.txInQueueItem.scriptTxIn.scriptSource = {
        type: "Provided",
        script: {
          code: scriptCbor,
          version: this.plutusSpendingScriptVersion || "V2"
        }
      };
    }
    return this;
  };
  /**
   * Set the input datum for transaction input
   * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  txInDatumValue = (datum, type = "Mesh") => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey")
      throw Error("Datum value attempted to be called a non script input");
    if (this.txInQueueItem.type === "SimpleScript")
      throw Error(
        "Datum value attempted to be called on a simple script input"
      );
    let content = datum;
    if (type === "JSON") {
      content = this.castRawDataToJsonString(datum);
    }
    if (type === "Mesh") {
      this.txInQueueItem.scriptTxIn.datumSource = {
        type: "Provided",
        data: {
          type,
          content: datum
        }
      };
      return this;
    }
    this.txInQueueItem.scriptTxIn.datumSource = {
      type: "Provided",
      data: {
        type,
        content
      }
    };
    return this;
  };
  /**
   * Tell the transaction builder that the input UTxO has inlined datum
   * @returns The MeshTxBuilder instance
   */
  txInInlineDatumPresent = () => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey")
      throw Error(
        "Inline datum present attempted to be called a non script input"
      );
    if (this.txInQueueItem.type === "SimpleScript")
      throw Error(
        "Inline datum present attempted to be called on a simple script input"
      );
    const { txHash, txIndex } = this.txInQueueItem.txIn;
    if (txHash && txIndex.toString()) {
      this.txInQueueItem.scriptTxIn.datumSource = {
        type: "Inline",
        txHash,
        txIndex
      };
    }
    return this;
  };
  // /**
  //  * Native script - Set the reference input where it would also be spent in the transaction
  //  * @param txHash The transaction hash of the reference UTxO
  //  * @param txIndex The transaction index of the reference UTxO
  //  * @param spendingScriptHash The script hash of the spending script
  //  * @returns The MeshTxBuilder instance
  //  */
  // simpleScriptTxInReference = (
  //   txHash: string,
  //   txIndex: number,
  //   spendingScriptHash?: string
  // ) => {
  //   if (!this.txInQueueItem) throw Error('Undefined input');
  //   if (this.txInQueueItem.type === 'PubKey')
  //     throw Error(
  //       'Spending tx in reference attempted to be called a non script input'
  //     );
  //   this.txInQueueItem.scriptTxIn.scriptSource = {
  //     type: 'Inline',
  //     txInInfo: {
  //       txHash,
  //       txIndex,
  //       spendingScriptHash,
  //     },
  //   };
  //   return this;
  // };
  /**
   * Set the redeemer for the reference input to be spent in same transaction
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  txInRedeemerValue = (redeemer, type = "Mesh", exUnits = { ...DEFAULT_REDEEMER_BUDGET }) => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey")
      throw Error(
        "Spending tx in reference redeemer attempted to be called a non script input"
      );
    if (this.txInQueueItem.type === "SimpleScript")
      throw Error(
        "Spending tx in reference redeemer attempted to be called on a simple script input"
      );
    this.txInQueueItem.scriptTxIn.redeemer = this.castBuilderDataToRedeemer(
      redeemer,
      type,
      exUnits
    );
    return this;
  };
  /**
   * Set the output for transaction
   * @param {string} address The recipient of the output
   * @param {Asset[]} amount The amount of other native assets attached with UTxO
   * @returns The MeshTxBuilder instance
   */
  txOut = (address, amount) => {
    if (this.txOutput) {
      this.meshTxBuilderBody.outputs.push(this.txOutput);
      this.txOutput = void 0;
    }
    this.txOutput = {
      address,
      amount
    };
    return this;
  };
  /**
   * Set the output datum hash for transaction
   * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  txOutDatumHashValue = (datum, type = "Mesh") => {
    let content = datum;
    if (this.txOutput) {
      if (type === "Mesh") {
        this.txOutput.datum = {
          type: "Hash",
          data: {
            type,
            content
          }
        };
        return this;
      }
      if (type === "JSON") {
        content = this.castRawDataToJsonString(datum);
      }
      this.txOutput.datum = {
        type: "Hash",
        data: {
          type,
          content
        }
      };
    }
    return this;
  };
  /**
   * Set the output inline datum for transaction
   * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  txOutInlineDatumValue = (datum, type = "Mesh") => {
    let content = datum;
    if (this.txOutput) {
      if (type === "Mesh") {
        this.txOutput.datum = {
          type: "Inline",
          data: {
            type,
            content
          }
        };
        return this;
      }
      if (type === "JSON") {
        content = this.castRawDataToJsonString(datum);
      }
      this.txOutput.datum = {
        type: "Inline",
        data: {
          type,
          content
        }
      };
    }
    return this;
  };
  /**
   * Set the output embed datum for transaction
   * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @returns The MeshTxBuilder instance
   */
  txOutDatumEmbedValue = (datum, type = "Mesh") => {
    let content = datum;
    if (this.txOutput) {
      if (type === "Mesh") {
        this.txOutput.datum = {
          type: "Embedded",
          data: {
            type,
            content
          }
        };
        return this;
      }
      if (type === "JSON") {
        content = this.castRawDataToJsonString(datum);
      }
      this.txOutput.datum = {
        type: "Embedded",
        data: {
          type,
          content
        }
      };
    }
    return this;
  };
  /**
   * Set the reference script to be attached with the output
   * @param scriptCbor The CBOR hex of the script to be attached to UTxO as reference script
   * @param version Optional - The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  txOutReferenceScript = (scriptCbor, version = "V2") => {
    if (this.txOutput) {
      this.txOutput.referenceScript = { code: scriptCbor, version };
    }
    return this;
  };
  /**
   * Set the instruction that it is currently using V1 Plutus spending scripts
   * @returns The MeshTxBuilder instance
   */
  spendingPlutusScriptV1 = () => {
    this.addingPlutusScriptInput = true;
    this.plutusSpendingScriptVersion = "V1";
    return this;
  };
  /**
   * Set the instruction that it is currently using V2 Plutus spending scripts
   * @returns The MeshTxBuilder instance
   */
  spendingPlutusScriptV2 = () => {
    this.addingPlutusScriptInput = true;
    this.plutusSpendingScriptVersion = "V2";
    return this;
  };
  /**
   * Set the instruction that it is currently using V3 Plutus spending scripts
   * @returns The MeshTxBuilder instance
   */
  spendingPlutusScriptV3 = () => {
    this.addingPlutusScriptInput = true;
    this.plutusSpendingScriptVersion = "V3";
    return this;
  };
  /**
   * Set the reference input where it would also be spent in the transaction
   * @param txHash The transaction hash of the reference UTxO
   * @param txIndex The transaction index of the reference UTxO
   * @param scriptSize The script size in bytes of the spending script (can be obtained by script hex length / 2)
   * @param scriptHash The script hash of the spending script
   * @returns The MeshTxBuilder instance
   */
  spendingTxInReference = (txHash, txIndex, scriptSize, scriptHash) => {
    if (!this.txInQueueItem) throw Error("Undefined input");
    if (this.txInQueueItem.type === "PubKey")
      throw Error(
        "Spending tx in reference attempted to be called a non script input"
      );
    if (this.txInQueueItem.type === "SimpleScript")
      throw Error(
        "Spending tx in reference attempted to be called on a simple script input"
      );
    this.txInQueueItem.scriptTxIn.scriptSource = {
      type: "Inline",
      txHash,
      txIndex,
      scriptHash,
      version: this.plutusSpendingScriptVersion || "V2",
      scriptSize
    };
    return this;
  };
  /**
   * [Alias of txInInlineDatumPresent] Set the instruction that the reference input has inline datum
   * @returns The MeshTxBuilder instance
   */
  // Unsure how this is different from the --tx-in-inline-datum-present flag
  // It seems to just be different based on if the script is a reference input
  spendingReferenceTxInInlineDatumPresent = () => {
    this.txInInlineDatumPresent();
    return this;
  };
  /**
   * [Alias of txInRedeemerValue] Set the redeemer for the reference input to be spent in same transaction
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  spendingReferenceTxInRedeemerValue = (redeemer, type = "Mesh", exUnits = { ...DEFAULT_REDEEMER_BUDGET }) => {
    this.txInRedeemerValue(redeemer, type, exUnits);
    return this;
  };
  /**
   * Specify a read only reference input. This reference input is not witnessing anything it is simply provided in the plutus script context.
   * @param txHash The transaction hash of the reference UTxO
   * @param txIndex The transaction index of the reference UTxO
   * @returns The MeshTxBuilder instance
   */
  readOnlyTxInReference = (txHash, txIndex) => {
    this.meshTxBuilderBody.referenceInputs.push({ txHash, txIndex });
    return this;
  };
  /**
   * Set the instruction that it is currently using V1 Plutus minting scripts
   * @returns The MeshTxBuilder instance
   */
  mintPlutusScriptV1 = () => {
    this.addingPlutusMint = true;
    this.plutusMintingScriptVersion = "V1";
    return this;
  };
  /**
   * Set the instruction that it is currently using V2 Plutus minting scripts
   * @returns The MeshTxBuilder instance
   */
  mintPlutusScriptV2 = () => {
    this.addingPlutusMint = true;
    this.plutusMintingScriptVersion = "V2";
    return this;
  };
  /**
   * Set the instruction that it is currently using V3 Plutus minting scripts
   * @returns The MeshTxBuilder instance
   */
  mintPlutusScriptV3 = () => {
    this.addingPlutusMint = true;
    this.plutusMintingScriptVersion = "V3";
    return this;
  };
  /**
   * Set the minting value of transaction
   * @param quantity The quantity of asset to be minted
   * @param policy The policy id of the asset to be minted
   * @param name The hex of token name of the asset to be minted
   * @returns The MeshTxBuilder instance
   */
  mint = (quantity, policy, name) => {
    if (this.mintItem) {
      this.queueMint();
    }
    this.mintItem = {
      type: this.addingPlutusMint ? "Plutus" : "Native",
      policyId: policy,
      assetName: name,
      amount: quantity
    };
    this.addingPlutusMint = false;
    return this;
  };
  /**
   * Set the minting script of current mint
   * @param scriptCBOR The CBOR hex of the minting policy script
   * @param version Optional - The Plutus script version
   * @returns The MeshTxBuilder instance
   */
  mintingScript = (scriptCBOR) => {
    if (!this.mintItem) throw Error("Undefined mint");
    if (!this.mintItem.type) throw Error("Mint information missing");
    if (this.mintItem.type === "Native") {
      this.mintItem.scriptSource = {
        type: "Provided",
        scriptCode: scriptCBOR
      };
    }
    if (this.mintItem.type === "Plutus") {
      this.mintItem.scriptSource = {
        type: "Provided",
        script: {
          code: scriptCBOR,
          version: this.plutusMintingScriptVersion || "V2"
        }
      };
    }
    return this;
  };
  /**
   * Use reference script for minting
   * @param txHash The transaction hash of the UTxO
   * @param txIndex The transaction index of the UTxO
   * @param scriptSize The script size in bytes of the script (can be obtained by script hex length / 2)
   * @param scriptHash The script hash of the script
   * @returns The MeshTxBuilder instance
   */
  mintTxInReference = (txHash, txIndex, scriptSize, scriptHash) => {
    if (!this.mintItem) throw Error("Undefined mint");
    if (!this.mintItem.type) throw Error("Mint information missing");
    if (this.mintItem.type == "Native") {
      throw Error(
        "Mint tx in reference can only be used on plutus script tokens"
      );
    }
    if (!this.mintItem.policyId)
      throw Error("PolicyId information missing from mint asset");
    this.mintItem.scriptSource = {
      type: "Inline",
      txHash,
      txIndex,
      version: this.plutusMintingScriptVersion,
      scriptSize,
      scriptHash
    };
    return this;
  };
  /**
   * Set the redeemer for minting
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  mintReferenceTxInRedeemerValue = (redeemer, type = "Mesh", exUnits = { ...DEFAULT_REDEEMER_BUDGET }) => {
    if (!this.mintItem) throw Error("Undefined mint");
    if (this.mintItem.type == "Native") {
      throw Error(
        "Mint tx in reference can only be used on plutus script tokens"
      );
    } else if (this.mintItem.type == "Plutus") {
      if (!this.mintItem.policyId)
        throw Error("PolicyId information missing from mint asset");
    }
    this.mintItem.redeemer = this.castBuilderDataToRedeemer(
      redeemer,
      type,
      exUnits
    );
    return this;
  };
  /**
   * Set the redeemer for the reference input to be spent in same transaction
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  mintRedeemerValue = (redeemer, type = "Mesh", exUnits = { ...DEFAULT_REDEEMER_BUDGET }) => {
    this.mintReferenceTxInRedeemerValue(redeemer, type, exUnits);
    return this;
  };
  /**
   * Set the required signer of the transaction
   * @param pubKeyHash The PubKeyHash of the required signer
   * @returns The MeshTxBuilder instance
   */
  requiredSignerHash = (pubKeyHash) => {
    this.meshTxBuilderBody.requiredSignatures.push(pubKeyHash);
    return this;
  };
  /**
   * Set the collateral UTxO for the transaction
   * @param txHash The transaction hash of the collateral UTxO
   * @param txIndex The transaction index of the collateral UTxO
   * @param amount The asset amount of index of the collateral UTxO
   * @param address The address of the collateral UTxO
   * @returns The MeshTxBuilder instance
   */
  txInCollateral = (txHash, txIndex, amount, address) => {
    if (this.collateralQueueItem) {
      this.meshTxBuilderBody.collaterals.push(this.collateralQueueItem);
    }
    this.collateralQueueItem = {
      type: "PubKey",
      txIn: {
        txHash,
        txIndex,
        amount,
        address
      }
    };
    return this;
  };
  /**
   * Set the instruction that it is currently using V1 Plutus withdrawal scripts
   * @returns The MeshTxBuilder instance
   */
  withdrawalPlutusScriptV1 = () => {
    this.addingPlutusWithdrawal = true;
    this.plutusWithdrawalScriptVersion = "V1";
    return this;
  };
  /**
   * Set the instruction that it is currently using V2 Plutus withdrawal scripts
   * @returns The MeshTxBuilder instance
   */
  withdrawalPlutusScriptV2 = () => {
    this.addingPlutusWithdrawal = true;
    this.plutusWithdrawalScriptVersion = "V2";
    return this;
  };
  /**
   * Set the instruction that it is currently using V3 Plutus withdrawal scripts
   * @returns The MeshTxBuilder instance
   */
  withdrawalPlutusScriptV3 = () => {
    this.addingPlutusWithdrawal = true;
    this.plutusWithdrawalScriptVersion = "V3";
    return this;
  };
  /**
   * Withdraw stake rewards in the MeshTxBuilder instance
   * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
   * @param coin The amount of lovelaces in the withdrawal
   * @returns The MeshTxBuilder instance
   */
  withdrawal = (rewardAddress, coin) => {
    if (this.withdrawalItem) {
      this.queueWithdrawal();
    }
    if (this.addingPlutusWithdrawal) {
      const withdrawal2 = {
        type: "ScriptWithdrawal",
        address: rewardAddress,
        coin
      };
      this.withdrawalItem = withdrawal2;
      return this;
    }
    const withdrawal = {
      type: "PubKeyWithdrawal",
      address: rewardAddress,
      coin
    };
    this.withdrawalItem = withdrawal;
    return this;
  };
  /**
   * Add a withdrawal script to the MeshTxBuilder instance
   * @param scriptCbor The script in CBOR format
   * @returns The MeshTxBuilder instance
   */
  withdrawalScript = (scriptCbor) => {
    if (!this.withdrawalItem)
      throw Error("withdrawalScript: Undefined withdrawal");
    if (this.withdrawalItem.type === "PubKeyWithdrawal") {
      this.withdrawalItem = {
        type: "SimpleScriptWithdrawal",
        address: this.withdrawalItem.address,
        coin: this.withdrawalItem.coin,
        scriptSource: {
          type: "Provided",
          scriptCode: scriptCbor
        }
      };
    } else {
      this.withdrawalItem.scriptSource = {
        type: "Provided",
        script: {
          code: scriptCbor,
          version: this.plutusWithdrawalScriptVersion || "V2"
        }
      };
    }
    return this;
  };
  /**
   * Add a withdrawal reference to the MeshTxBuilder instance
   * @param txHash The transaction hash of reference UTxO
   * @param txIndex The transaction index of reference UTxO
   * @param scriptSize The script size in bytes of the withdrawal script (can be obtained by script hex length / 2)
   * @param scriptHash The script hash of the withdrawal script
   * @returns The MeshTxBuilder instance
   */
  withdrawalTxInReference = (txHash, txIndex, scriptSize, scriptHash) => {
    if (!this.withdrawalItem)
      throw Error("withdrawalTxInReference: Undefined withdrawal");
    if (this.withdrawalItem.type === "PubKeyWithdrawal")
      throw Error(
        "withdrawalTxInReference: Adding script reference to pub key withdrawal"
      );
    this.withdrawalItem.scriptSource = {
      type: "Inline",
      txHash,
      txIndex,
      scriptHash,
      version: this.plutusWithdrawalScriptVersion || "V2",
      scriptSize
    };
    return this;
  };
  /**
   * Set the transaction withdrawal redeemer value in the MeshTxBuilder instance
   * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
   * @param exUnits The execution units budget for the redeemer
   * @returns The MeshTxBuilder instance
   */
  withdrawalRedeemerValue = (redeemer, type = "Mesh", exUnits = { ...DEFAULT_REDEEMER_BUDGET }) => {
    if (!this.withdrawalItem)
      throw Error("withdrawalRedeemerValue: Undefined withdrawal");
    if (!(this.withdrawalItem.type === "ScriptWithdrawal"))
      throw Error(
        "withdrawalRedeemerValue: Adding redeemer to non plutus withdrawal"
      );
    this.withdrawalItem.redeemer = this.castBuilderDataToRedeemer(
      redeemer,
      type,
      exUnits
    );
    return this;
  };
  /**
   * Creates a pool registration certificate, and adds it to the transaction
   * @param poolParams Parameters for pool registration
   * @returns The MeshTxBuilder instance
   */
  registerPoolCertificate = (poolParams) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "RegisterPool",
        poolParams
      }
    });
    return this;
  };
  /**
   * Creates a stake registration certificate, and adds it to the transaction
   * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
   * @returns The MeshTxBuilder instance
   */
  registerStakeCertificate = (rewardAddress) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "RegisterStake",
        stakeKeyAddress: rewardAddress
      }
    });
    return this;
  };
  /**
   * Creates a stake delegation certificate, and adds it to the transaction
   * This will delegate stake from the corresponding stake address to the pool
   * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
   * @param poolId poolId can be in either bech32 or hex form
   * @returns The MeshTxBuilder instance
   */
  delegateStakeCertificate = (rewardAddress, poolId) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "DelegateStake",
        stakeKeyAddress: rewardAddress,
        poolId
      }
    });
    return this;
  };
  /**
   * Creates a stake deregister certificate, and adds it to the transaction
   * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
   * @returns The MeshTxBuilder instance
   */
  deregisterStakeCertificate = (rewardAddress) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "DeregisterStake",
        stakeKeyAddress: rewardAddress
      }
    });
    return this;
  };
  /**
   * Creates a pool retire certificate, and adds it to the transaction
   * @param poolId poolId can be in either bech32 or hex form
   * @param epoch The intended epoch to retire the pool
   * @returns The MeshTxBuilder instance
   */
  retirePoolCertificate = (poolId, epoch) => {
    this.meshTxBuilderBody.certificates.push({
      type: "BasicCertificate",
      certType: {
        type: "RetirePool",
        poolId,
        epoch
      }
    });
    return this;
  };
  /**
   * Adds a script witness to the certificate
   * @param scriptCbor The CborHex of the script
   * @param version Optional - The plutus version of the script, null version implies Native Script
   */
  certificateScript = (scriptCbor, version) => {
    const currentCert = this.meshTxBuilderBody.certificates.pop();
    if (!currentCert) {
      throw Error(
        "Certificate script attempted to be defined, but no certificate was found"
      );
    }
    if (!version) {
      this.meshTxBuilderBody.certificates.push({
        type: "SimpleScriptCertificate",
        certType: currentCert.certType,
        simpleScriptSource: {
          type: "Provided",
          scriptCode: scriptCbor
        }
      });
    } else {
      this.meshTxBuilderBody.certificates.push({
        type: "ScriptCertificate",
        certType: currentCert.certType,
        scriptSource: {
          type: "Provided",
          script: {
            code: scriptCbor,
            version
          }
        },
        redeemer: currentCert.type === "ScriptCertificate" ? currentCert.redeemer : void 0
      });
    }
    return this;
  };
  /**
   * Adds a script witness to the certificate
   * @param txHash The transaction hash of the reference UTxO
   * @param txIndex The transaction index of the reference UTxO
   * @param scriptSize The size of the plutus script in bytes referenced (can be obtained by script hex length / 2)
   * @param scriptHash The script hash of the spending script
   * @param version The plutus version of the script, null version implies Native Script
   */
  certificateTxInReference = (txHash, txIndex, scriptSize, scriptHash, version) => {
    const currentCert = this.meshTxBuilderBody.certificates.pop();
    if (!currentCert) {
      throw Error(
        "Certificate script reference attempted to be defined, but no certificate was found"
      );
    }
    if (!version) {
      this.meshTxBuilderBody.certificates.push({
        type: "SimpleScriptCertificate",
        certType: currentCert.certType,
        simpleScriptSource: {
          type: "Inline",
          txHash,
          txIndex,
          simpleScriptHash: scriptHash
        }
      });
    } else {
      this.meshTxBuilderBody.certificates.push({
        type: "ScriptCertificate",
        certType: currentCert.certType,
        scriptSource: {
          type: "Inline",
          txHash,
          txIndex,
          scriptHash,
          scriptSize
        },
        redeemer: currentCert.type === "ScriptCertificate" ? currentCert.redeemer : void 0
      });
    }
    return this;
  };
  certificateRedeemerValue = (redeemer, type = "Mesh", exUnits = { ...DEFAULT_REDEEMER_BUDGET }) => {
    const currentCert = this.meshTxBuilderBody.certificates.pop();
    if (!currentCert) {
      throw Error(
        "Certificate redeemer value attempted to be defined, but no certificate was found"
      );
    }
    if (currentCert.type === "ScriptCertificate") {
      currentCert.redeemer = this.castBuilderDataToRedeemer(
        redeemer,
        type,
        exUnits
      );
    } else {
      throw Error(
        "Redeemer value attempted to be defined, but certificate has no script defined, or no script version was defined"
      );
    }
    this.meshTxBuilderBody.certificates.push(currentCert);
    return this;
  };
  /**
   * Configure the address to accept change UTxO
   * @param addr The address to accept change UTxO
   * @returns The MeshTxBuilder instance
   */
  changeAddress = (addr) => {
    this.meshTxBuilderBody.changeAddress = addr;
    return this;
  };
  /**
   * Set the transaction valid interval to be valid only after the slot
   * @param slot The transaction is valid only after this slot
   * @returns The MeshTxBuilder instance
   */
  invalidBefore = (slot) => {
    this.meshTxBuilderBody.validityRange.invalidBefore = slot;
    return this;
  };
  /**
   * Set the transaction valid interval to be valid only before the slot
   * @param slot The transaction is valid only before this slot
   * @returns The MeshTxBuilder instance
   */
  invalidHereafter = (slot) => {
    this.meshTxBuilderBody.validityRange.invalidHereafter = slot;
    return this;
  };
  /**
   * Add metadata to the transaction
   * @param tag The tag of the metadata
   * @param metadata The metadata in any format
   * @returns The MeshTxBuilder instance
   */
  metadataValue = (tag, metadata) => {
    const metadataString = JSONBig.stringify(metadata);
    this.meshTxBuilderBody.metadata.push({ tag, metadata: metadataString });
    return this;
  };
  /**
   * Sign the transaction with the private key
   * @param skeyHex The private key in cborHex (with or without 5820 prefix, i.e. the format when generated from cardano-cli)
   * @returns
   */
  signingKey = (skeyHex) => {
    this.meshTxBuilderBody.signingKey.push(skeyHex);
    return this;
  };
  /**
   * Selects utxos to fill output value and puts them into inputs
   * @param extraInputs The inputs already placed into the object will remain, these extra inputs will be used to fill the remaining  value needed
   * @param strategy The strategy to be used in utxo selection
   * @param threshold Extra value needed to be selected for, usually for paying fees and min UTxO value of change output
   */
  selectUtxosFrom = (extraInputs, strategy = "experimental", threshold = "5000000", includeTxFees = true) => {
    this.meshTxBuilderBody.extraInputs = extraInputs;
    const newConfig = {
      threshold,
      strategy,
      includeTxFees
    };
    this.meshTxBuilderBody.selectionConfig = {
      ...this.meshTxBuilderBody.selectionConfig,
      ...newConfig
    };
    return this;
  };
  /**
   * Set the protocol parameters to be used for the transaction other than the default one
   * @param params (Part of) the protocol parameters to be used for the transaction
   * @returns The MeshTxBuilder instance
   */
  protocolParams = (params) => {
    const updatedParams = { ...DEFAULT_PROTOCOL_PARAMETERS, ...params };
    this._protocolParams = updatedParams;
    return this;
  };
  /**
   * Sets the network to use, this is mainly to know the cost models to be used to calculate script integrity hash
   * @param network The specific network this transaction is being built for ("testnet" | "preview" | "preprod" | "mainnet")
   * @returns The MeshTxBuilder instance
   */
  setNetwork = (network) => {
    this.meshTxBuilderBody.network = network;
    return this;
  };
  queueAllLastItem = () => {
    if (this.txOutput) {
      this.meshTxBuilderBody.outputs.push(this.txOutput);
      this.txOutput = void 0;
    }
    if (this.txInQueueItem) {
      this.queueInput();
    }
    if (this.collateralQueueItem) {
      this.meshTxBuilderBody.collaterals.push(this.collateralQueueItem);
      this.collateralQueueItem = void 0;
    }
    if (this.mintItem) {
      this.queueMint();
    }
    if (this.withdrawalItem) {
      this.queueWithdrawal();
    }
  };
  queueInput = () => {
    if (!this.txInQueueItem) throw Error("queueInput: Undefined input");
    if (this.txInQueueItem.type === "Script") {
      if (!this.txInQueueItem.scriptTxIn) {
        throw Error(
          "queueInput: Script input does not contain script, datum, or redeemer information"
        );
      } else {
        if (!this.txInQueueItem.scriptTxIn.datumSource)
          throw Error(
            "queueInput: Script input does not contain datum information"
          );
        if (!this.txInQueueItem.scriptTxIn.redeemer)
          throw Error(
            "queueInput: Script input does not contain redeemer information"
          );
        if (!this.txInQueueItem.scriptTxIn.scriptSource)
          throw Error(
            "queueInput: Script input does not contain script information"
          );
      }
    }
    this.meshTxBuilderBody.inputs.push(this.txInQueueItem);
    this.txInQueueItem = void 0;
  };
  queueMint = () => {
    if (!this.mintItem) throw Error("queueMint: Undefined mint");
    if (!this.mintItem.scriptSource)
      throw Error("queueMint: Missing mint script information");
    this.meshTxBuilderBody.mints.push(this.mintItem);
    this.mintItem = void 0;
  };
  queueWithdrawal = () => {
    if (!this.withdrawalItem)
      throw Error("queueWithdrawal: Undefined withdrawal");
    if (this.withdrawalItem.type === "ScriptWithdrawal") {
      if (!this.withdrawalItem.scriptSource) {
        throw Error("queueWithdrawal: Missing withdrawal script information");
      }
      if (!this.withdrawalItem.redeemer) {
        throw Error("queueWithdrawal: Missing withdrawal redeemer information");
      }
    } else if (this.withdrawalItem.type === "SimpleScriptWithdrawal") {
      if (!this.withdrawalItem.scriptSource) {
        throw Error("queueWithdrawal: Missing withdrawal script information");
      }
    }
    this.meshTxBuilderBody.withdrawals.push(this.withdrawalItem);
    this.withdrawalItem = void 0;
  };
  castRawDataToJsonString = (rawData) => {
    if (typeof rawData === "object") {
      return JSONBig.stringify(rawData);
    } else {
      return rawData;
    }
  };
  castBuilderDataToRedeemer = (redeemer, type = "Mesh", exUnits = { ...DEFAULT_REDEEMER_BUDGET }) => {
    let red;
    let content = redeemer;
    if (type === "Mesh") {
      red = {
        data: {
          type,
          content
        },
        exUnits
      };
      return red;
    }
    if (type === "JSON") {
      content = this.castRawDataToJsonString(redeemer);
    }
    red = {
      data: {
        type,
        content
      },
      exUnits
    };
    return red;
  };
  updateRedeemer = (meshTxBuilderBody, txEvaluation) => {
    txEvaluation.forEach((redeemerEvaluation) => {
      switch (redeemerEvaluation.tag) {
        case "SPEND": {
          const input = meshTxBuilderBody.inputs[redeemerEvaluation.index];
          if (input.type == "Script" && input.scriptTxIn.redeemer) {
            input.scriptTxIn.redeemer.exUnits.mem = Math.floor(
              redeemerEvaluation.budget.mem * this.txEvaluationMultiplier
            );
            input.scriptTxIn.redeemer.exUnits.steps = Math.floor(
              redeemerEvaluation.budget.steps * this.txEvaluationMultiplier
            );
          }
          break;
        }
        case "MINT": {
          const mint = meshTxBuilderBody.mints[redeemerEvaluation.index];
          if (mint.type == "Plutus" && mint.redeemer) {
            let newExUnits = {
              mem: Math.floor(
                redeemerEvaluation.budget.mem * this.txEvaluationMultiplier
              ),
              steps: Math.floor(
                redeemerEvaluation.budget.steps * this.txEvaluationMultiplier
              )
            };
            for (let i = redeemerEvaluation.index; i < meshTxBuilderBody.mints.length; i++) {
              if (meshTxBuilderBody.mints[i].policyId === mint.policyId) {
                meshTxBuilderBody.mints[i].redeemer.exUnits = newExUnits;
              }
            }
          }
          break;
        }
        case "CERT":
          const cert = meshTxBuilderBody.certificates[redeemerEvaluation.index];
          if (cert.type === "ScriptCertificate" && cert.redeemer) {
            cert.redeemer.exUnits.mem = Math.floor(
              redeemerEvaluation.budget.mem * this.txEvaluationMultiplier
            );
            cert.redeemer.exUnits.steps = Math.floor(
              redeemerEvaluation.budget.steps * this.txEvaluationMultiplier
            );
          }
          break;
        case "REWARD":
          const withdrawal = meshTxBuilderBody.withdrawals[redeemerEvaluation.index];
          if (withdrawal.type === "ScriptWithdrawal" && withdrawal.redeemer) {
            withdrawal.redeemer.exUnits.mem = Math.floor(
              redeemerEvaluation.budget.mem * this.txEvaluationMultiplier
            );
            withdrawal.redeemer.exUnits.steps = Math.floor(
              redeemerEvaluation.budget.steps * this.txEvaluationMultiplier
            );
          }
          break;
      }
    });
  };
  addUtxosFromSelection = () => {
    const requiredAssets = this.meshTxBuilderBody.outputs.reduce(
      (map, output) => {
        const outputAmount = output.amount;
        outputAmount.forEach((asset) => {
          const { unit, quantity } = asset;
          const existingQuantity = Number(map.get(unit)) || 0;
          map.set(unit, String(existingQuantity + Number(quantity)));
        });
        return map;
      },
      /* @__PURE__ */ new Map()
    );
    this.meshTxBuilderBody.inputs.reduce((map, input) => {
      const inputAmount = input.txIn.amount;
      inputAmount?.forEach((asset) => {
        const { unit, quantity } = asset;
        const existingQuantity = Number(map.get(unit)) || 0;
        map.set(unit, String(existingQuantity - Number(quantity)));
      });
      return map;
    }, requiredAssets);
    this.meshTxBuilderBody.mints.reduce((map, mint) => {
      const mintAmount = {
        unit: mint.policyId + mint.assetName,
        quantity: String(mint.amount)
      };
      const existingQuantity = Number(map.get(mintAmount.unit)) || 0;
      map.set(
        mintAmount.unit,
        String(existingQuantity - Number(mintAmount.quantity))
      );
      return map;
    }, requiredAssets);
    const selectionConfig = this.meshTxBuilderBody.selectionConfig;
    const utxoSelection = new UtxoSelection(
      selectionConfig.threshold,
      selectionConfig.includeTxFees
    );
    let selectedInputs = [];
    switch (selectionConfig.strategy) {
      case "keepRelevant":
        selectedInputs = utxoSelection.keepRelevant(
          requiredAssets,
          this.meshTxBuilderBody.extraInputs
        );
      case "largestFirst":
        selectedInputs = utxoSelection.largestFirst(
          requiredAssets,
          this.meshTxBuilderBody.extraInputs
        );
        break;
      case "largestFirstMultiAsset":
        selectedInputs = utxoSelection.largestFirstMultiAsset(
          requiredAssets,
          this.meshTxBuilderBody.extraInputs
        );
        break;
      default:
        selectedInputs = utxoSelection.experimental(
          requiredAssets,
          this.meshTxBuilderBody.extraInputs
        );
        break;
    }
    selectedInputs.forEach((input) => {
      const pubKeyTxIn = {
        type: "PubKey",
        txIn: {
          txHash: input.input.txHash,
          txIndex: input.input.outputIndex,
          amount: input.output.amount,
          address: input.output.address
        }
      };
      this.meshTxBuilderBody.inputs.push(pubKeyTxIn);
    });
  };
  removeDuplicateInputs = () => {
    const { inputs } = this.meshTxBuilderBody;
    const getTxInId = (txIn) => `${txIn.txHash}#${txIn.txIndex}`;
    const currentTxInIds = [];
    const addedInputs = [];
    for (let i = 0; i < inputs.length; i += 1) {
      const currentInput = inputs[i];
      const currentTxInId = getTxInId(currentInput.txIn);
      if (currentTxInIds.includes(currentTxInId)) {
        inputs.splice(i, 1);
        i -= 1;
      } else {
        addedInputs.push(currentInput);
      }
    }
    this.meshTxBuilderBody.inputs = addedInputs;
  };
  emptyTxBuilderBody = () => {
    this.meshTxBuilderBody = emptyTxBuilderBody();
    return emptyTxBuilderBody;
  };
  reset = () => {
    this.meshTxBuilderBody = emptyTxBuilderBody();
    this.txEvaluationMultiplier = 1.1;
    this.txOutput = void 0;
    this.addingPlutusScriptInput = false;
    this.plutusSpendingScriptVersion = void 0;
    this.addingPlutusMint = false;
    this.plutusMintingScriptVersion = void 0;
    this.addingPlutusWithdrawal = false;
    this.plutusWithdrawalScriptVersion = void 0;
    this._protocolParams = DEFAULT_PROTOCOL_PARAMETERS;
    this.mintItem = void 0;
    this.txInQueueItem = void 0;
    this.withdrawalItem = void 0;
    this.collateralQueueItem = void 0;
    this.refScriptTxInQueueItem = void 0;
  };
};

// src/mesh-tx-builder/utils.ts
var utxoToTxIn = (utxo) => {
  return [
    utxo.input.txHash,
    utxo.input.outputIndex,
    utxo.output.amount,
    utxo.output.address
  ];
};

// src/mesh-tx-builder/index.ts
var MeshTxBuilder = class extends MeshTxBuilderCore {
  serializer;
  fetcher;
  submitter;
  evaluator;
  txHex = "";
  queriedTxHashes = /* @__PURE__ */ new Set();
  queriedUTxOs = {};
  constructor({
    serializer,
    fetcher,
    submitter,
    evaluator,
    params,
    isHydra = false,
    verbose = false
  } = {}) {
    super();
    if (serializer) {
      this.serializer = serializer;
    } else {
      this.serializer = new CSLSerializer();
    }
    this.serializer.verbose = verbose;
    if (fetcher) this.fetcher = fetcher;
    if (submitter) this.submitter = submitter;
    if (evaluator) this.evaluator = evaluator;
    if (params) this.protocolParams(params);
    if (isHydra)
      this.protocolParams({
        minFeeA: 0,
        minFeeB: 0,
        priceMem: 0,
        priceStep: 0,
        collateralPercent: 0,
        coinsPerUtxoSize: 0
      });
  }
  /**
   * It builds the transaction and query the blockchain for missing information
   * @param customizedTx The optional customized transaction body
   * @returns The signed transaction in hex ready to submit / signed by client
   */
  complete = async (customizedTx) => {
    if (customizedTx) {
      this.meshTxBuilderBody = { ...this.meshTxBuilderBody, ...customizedTx };
    } else {
      this.queueAllLastItem();
    }
    this.removeDuplicateInputs();
    const { inputs, collaterals, mints } = this.meshTxBuilderBody;
    const incompleteTxIns = [...inputs, ...collaterals].filter(
      (txIn) => !this.isInputComplete(txIn)
    );
    const incompleteMints = mints.filter((mint) => !this.isMintComplete(mint));
    await this.queryAllTxInfo(incompleteTxIns, incompleteMints);
    incompleteTxIns.forEach((txIn) => {
      this.completeTxInformation(txIn);
    });
    incompleteMints.forEach((mint) => {
      if (mint.type === "Plutus") {
        const scriptSource = mint.scriptSource;
        this.completeScriptInfo(scriptSource);
      }
      if (mint.type === "Native") {
        const scriptSource = mint.scriptSource;
        this.completeSimpleScriptInfo(scriptSource);
      }
    });
    this.addUtxosFromSelection();
    let txHex = this.serializer.serializeTxBody(
      this.meshTxBuilderBody,
      this._protocolParams
    );
    if (this.evaluator) {
      const txEvaluation = await this.evaluator.evaluateTx(txHex).catch((error) => {
        throw Error(`Tx evaluation failed: ${error} 
 For txHex: ${txHex}`);
      });
      this.updateRedeemer(this.meshTxBuilderBody, txEvaluation);
      txHex = this.serializer.serializeTxBody(
        this.meshTxBuilderBody,
        this._protocolParams
      );
    }
    this.txHex = txHex;
    return txHex;
  };
  /**
   * It builds the transaction without dependencies
   * @param customizedTx The optional customized transaction body
   * @returns The signed transaction in hex ready to submit / signed by client
   */
  completeSync = (customizedTx) => {
    if (customizedTx) {
      this.meshTxBuilderBody = customizedTx;
    } else {
      this.queueAllLastItem();
    }
    this.addUtxosFromSelection();
    return this.serializer.serializeTxBody(
      this.meshTxBuilderBody,
      this._protocolParams
    );
  };
  /**
   * Complete the signing process
   * @returns The signed transaction in hex
   */
  completeSigning = () => {
    const signedTxHex = this.serializer.addSigningKeys(
      this.txHex,
      this.meshTxBuilderBody.signingKey
    );
    this.txHex = signedTxHex;
    return signedTxHex;
  };
  /**
   * Submit transactions to the blockchain using the fetcher instance
   * @param txHex The signed transaction in hex
   * @returns
   */
  submitTx = async (txHex) => {
    const txHash = await this.submitter?.submitTx(txHex);
    return txHash;
  };
  /**
   * Get the UTxO information from the blockchain
   * @param txHash The TxIn object that contains the txHash and txIndex, while missing amount and address information
   */
  getUTxOInfo = async (txHash) => {
    let utxos = [];
    if (!this.queriedTxHashes.has(txHash)) {
      this.queriedTxHashes.add(txHash);
      utxos = await this.fetcher?.fetchUTxOs(txHash) || [];
      this.queriedUTxOs[txHash] = utxos;
    }
  };
  queryAllTxInfo = (incompleteTxIns, incompleteMints) => {
    const queryUTxOPromises = [];
    if ((incompleteTxIns.length > 0 || incompleteMints.length > 0) && !this.fetcher)
      throw Error(
        "Transaction information is incomplete while no fetcher instance is provided"
      );
    for (let i = 0; i < incompleteTxIns.length; i++) {
      const currentTxIn = incompleteTxIns[i];
      if (!this.isInputInfoComplete(currentTxIn)) {
        queryUTxOPromises.push(this.getUTxOInfo(currentTxIn.txIn.txHash));
      }
      if (currentTxIn.type === "Script" && currentTxIn.scriptTxIn.scriptSource?.type === "Inline" && !this.isRefScriptInfoComplete(currentTxIn.scriptTxIn.scriptSource)) {
        queryUTxOPromises.push(
          this.getUTxOInfo(currentTxIn.scriptTxIn.scriptSource.txHash)
        );
      }
    }
    for (let i = 0; i < incompleteMints.length; i++) {
      const currentMint = incompleteMints[i];
      if (currentMint.type === "Plutus") {
        const scriptSource = currentMint.scriptSource;
        if (scriptSource.type === "Inline") {
          if (!this.isRefScriptInfoComplete(scriptSource)) {
            queryUTxOPromises.push(this.getUTxOInfo(scriptSource.txHash));
          }
        }
      }
    }
    return Promise.all(queryUTxOPromises);
  };
  completeTxInformation = (input) => {
    if (!this.isInputInfoComplete(input)) {
      this.completeInputInfo(input);
    }
    if (input.type === "Script" && !this.isRefScriptInfoComplete(input.scriptTxIn.scriptSource)) {
      const scriptSource = input.scriptTxIn.scriptSource;
      this.completeScriptInfo(scriptSource);
    }
  };
  completeInputInfo = (input) => {
    const utxos = this.queriedUTxOs[input.txIn.txHash];
    const utxo = utxos?.find(
      (utxo2) => utxo2.input.outputIndex === input.txIn.txIndex
    );
    const amount = utxo?.output.amount;
    const address = utxo?.output.address;
    if (!amount || amount.length === 0)
      throw Error(
        `Couldn't find value information for ${input.txIn.txHash}#${input.txIn.txIndex}`
      );
    input.txIn.amount = amount;
    if (input.type === "PubKey") {
      if (!address || address === "")
        throw Error(
          `Couldn't find address information for ${input.txIn.txHash}#${input.txIn.txIndex}`
        );
      input.txIn.address = address;
    }
  };
  completeScriptInfo = (scriptSource) => {
    if (scriptSource?.type != "Inline") return;
    const refUtxos = this.queriedUTxOs[scriptSource.txHash];
    const scriptRefUtxo = refUtxos.find(
      (utxo) => utxo.input.outputIndex === scriptSource.txIndex
    );
    if (!scriptRefUtxo)
      throw Error(
        `Couldn't find script reference utxo for ${scriptSource.txHash}#${scriptSource.txIndex}`
      );
    scriptSource.scriptHash = scriptRefUtxo?.output.scriptHash;
    scriptSource.scriptSize = (scriptRefUtxo?.output.scriptRef.length / 2).toString();
  };
  completeSimpleScriptInfo = (simpleScript) => {
    if (simpleScript.type !== "Inline") return;
    const refUtxos = this.queriedUTxOs[simpleScript.txHash];
    const scriptRefUtxo = refUtxos.find(
      (utxo) => utxo.input.outputIndex === simpleScript.txIndex
    );
    if (!scriptRefUtxo)
      throw Error(
        `Couldn't find script reference utxo for ${simpleScript.txHash}#${simpleScript.txIndex}`
      );
    simpleScript.simpleScriptHash = scriptRefUtxo?.output.scriptHash;
  };
  isInputComplete = (txIn) => {
    if (txIn.type === "PubKey") return this.isInputInfoComplete(txIn);
    if (txIn.type === "Script") {
      const { scriptSource } = txIn.scriptTxIn;
      return this.isInputInfoComplete(txIn) && this.isRefScriptInfoComplete(scriptSource);
    }
    return true;
  };
  isInputInfoComplete = (txIn) => {
    const { amount, address } = txIn.txIn;
    if (!amount || !address) return false;
    return true;
  };
  isMintComplete = (mint) => {
    if (mint.type === "Plutus") {
      const scriptSource = mint.scriptSource;
      return this.isRefScriptInfoComplete(scriptSource);
    }
    if (mint.type === "Native") {
      const scriptSource = mint.scriptSource;
      if (scriptSource.type === "Inline") {
        if (!scriptSource?.simpleScriptHash) return false;
      }
    }
    return true;
  };
  isRefScriptInfoComplete = (scriptSource) => {
    if (scriptSource?.type === "Inline") {
      if (!scriptSource?.scriptHash || !scriptSource?.scriptSize) return false;
    }
    return true;
  };
};

// src/scripts/forge.script.ts
import {
  buildScriptPubkey,
  deserializeEd25519KeyHash,
  toNativeScript,
  resolvePaymentKeyHash
} from "@meshsdk/core-cst";
var ForgeScript = class {
  static withOneSignature(address) {
    const keyHash = deserializeEd25519KeyHash(resolvePaymentKeyHash(address));
    return buildScriptPubkey(keyHash).toCbor();
  }
  // static withAtLeastNSignatures(
  //   addresses: string[], minimumRequired: number,
  // ): string {
  //   const nativeScripts = csl.NativeScripts.new();
  //   addresses.forEach((address) => {
  //     const keyHash = deserializeEd25519KeyHash(
  //       resolvePaymentKeyHash(address),
  //     );
  //     nativeScripts.add(buildScriptPubkey(keyHash));
  //   });
  //   const scriptNOfK = csl.ScriptNOfK.new(minimumRequired, nativeScripts);
  //   return csl.NativeScript.new_script_any(scriptNOfK).to_hex();
  // }
  // static withAnySignature(addresses: string[]): string {
  //   const nativeScripts = csl.NativeScripts.new();
  //   addresses.forEach((address) => {
  //     const keyHash = deserializeEd25519KeyHash(
  //       resolvePaymentKeyHash(address),
  //     );
  //     nativeScripts.add(buildScriptPubkey(keyHash));
  //   });
  //   const scriptAny = csl.ScriptAny.new(nativeScripts);
  //   return csl.NativeScript.new_script_any(scriptAny).to_hex();
  // }
  // static withAllSignatures(addresses: string[]): string {
  //   const nativeScripts = csl.NativeScripts.new();
  //   addresses.forEach((address) => {
  //     const keyHash = deserializeEd25519KeyHash(
  //       resolvePaymentKeyHash(address),
  //     );
  //     nativeScripts.add(buildScriptPubkey(keyHash));
  //   });
  //   const scriptAll = csl.ScriptAll.new(nativeScripts);
  //   return csl.NativeScript.new_script_any(scriptAll).to_hex();
  // }
  static fromNativeScript(script) {
    return toNativeScript(script).toCbor();
  }
};

// src/transaction/index.ts
import {
  CIP68_100,
  CIP68_222,
  DEFAULT_REDEEMER_BUDGET as DEFAULT_REDEEMER_BUDGET2,
  hexToString,
  metadataToCip68,
  POLICY_ID_LENGTH,
  stringToHex,
  SUPPORTED_TOKENS
} from "@meshsdk/common";
import {
  deserializeNativeScript,
  deserializePlutusScript,
  fromScriptRef
} from "@meshsdk/core-cst";
var Transaction = class {
  txBuilder;
  initiator;
  isCollateralNeeded = false;
  constructor(options) {
    this.txBuilder = new MeshTxBuilder(options);
    this.initiator = options.initiator;
  }
  /**
   * Adds an output to the transaction.
   *
   * @param recipient The recipient of the output.
   * @param assets The assets to send. Provide string for lovelace and Asset[] for tokens and/or lovelace.
   * @returns The transaction builder.
   * @see {@link https://meshjs.dev/apis/transaction#sendAssets}
   */
  sendAssets(recipient, assets) {
    if (typeof assets === "string") {
      assets = [
        {
          unit: "lovelace",
          quantity: assets
        }
      ];
    }
    if (typeof recipient === "string") {
      this.txBuilder.txOut(recipient, assets);
    }
    if (typeof recipient === "object") {
      this.txBuilder.txOut(recipient.address, assets);
      if (recipient.datum) {
        if (recipient.datum.inline) {
          this.txBuilder.txOutInlineDatumValue(recipient.datum.value);
        } else {
          this.txBuilder.txOutDatumHashValue(recipient.datum.value);
        }
      }
    }
    return this;
  }
  /**
   * Suggest deprecated - Adds a transaction output to the transaction.
   * Use sendAssets instead:
   * ```ts
   * this.sendAssets(recipient, lovelace);
   * ```
   *
   * Deprecation reason - Unnecessary implementation which might cause confusion.
   *
   * @param {Recipient} recipient The recipient of the transaction.
   * @param {string} lovelace The amount of lovelace to send.
   * @returns {Transaction} The Transaction object.
   * @see {@link https://meshjs.dev/apis/transaction#sendAda}
   */
  sendLovelace(recipient, lovelace) {
    return this.sendAssets(recipient, lovelace);
  }
  /**
   * Suggest deprecated - Adds stable coins transaction output to the transaction.
   * Please use sendAssets with helper function to obtain token unit instead:
   * ```ts
   * const assets = [{ unit: SUPPORTED_TOKENS.GIMBAL, quantity: "100" }]
   * transaction.sendAssets(recipient, assets)
   * ```
   *
   * Deprecation reason - Required maintenance on tokens.
   *
   * @param {Recipient} recipient The recipient of the transaction.
   * @param {Token} ticker The ticker of the token to send.
   * @param {string} amount The amount of the token to send.
   * @returns {Transaction} The Transaction object.
   * @see {@link https://meshjs.dev/apis/transaction#sendToken}
   */
  sendToken(recipient, ticker, amount) {
    const assets = [{ unit: SUPPORTED_TOKENS[ticker], quantity: amount }];
    return this.sendAssets(recipient, assets);
  }
  /**
   * Adds an output to the transaction.
   * Suggest deprecated - use sendAssets instead:
   *
   * ```ts
   * const assets = value.output.amount;
   * this.sendAssets(recipient, assets);
   * ```
   * Deprecation reason - Unnecessary implementation which might cause confusion.
   *
   * @param {Recipient} recipient The recipient of the output.
   * @param {UTxO} value The UTxO value of the output.
   * @returns {Transaction} The Transaction object.
   */
  sendValue(recipient, value) {
    const assets = value.output.amount;
    return this.sendAssets(recipient, assets);
  }
  /**
   * Sets the inputs for the transaction.
   *
   * @param {UTxO[]} inputs The inputs to set.
   * @returns {Transaction} The transaction.
   */
  setTxInputs(inputs) {
    inputs.forEach((input) => {
      this.txBuilder.txIn(
        input.input.txHash,
        input.input.outputIndex,
        input.output.amount,
        input.output.address
      );
    });
    return this;
  }
  /**
   * Sets the reference inputs for the transaction.
   *
   * @param {UTxO[]} inputs The reference inputs to set.
   * @returns {Transaction} The transaction.
   */
  setTxRefInputs(inputs) {
    inputs.forEach((input) => {
      this.txBuilder.readOnlyTxInReference(
        input.input.txHash,
        input.input.outputIndex
      );
    });
    return this;
  }
  /**
   * Sets the native script for the transaction.
   * @param {NativeScript} script The native script to spend from.
   * @param {UTxO} utxo The UTxO attached to the script.
   * @returns {Transaction} The Transaction object.
   */
  setNativeScriptInput(script, utxo) {
    const { scriptCbor } = this.txBuilder.serializer.deserializer.script.deserializeNativeScript(
      script
    );
    this.txBuilder.txIn(
      utxo.input.txHash,
      utxo.input.outputIndex,
      utxo.output.amount,
      utxo.output.address
    ).txInScript(scriptCbor);
    return this;
  }
  // TODO: nuke this probably as the input type is too confusing
  redeemValue(options) {
    const { value, script, datum, redeemer } = options;
    const red = redeemer || {
      data: { alternative: 0, fields: ["mesh"] },
      budget: DEFAULT_REDEEMER_BUDGET2
    };
    if ("code" in script) {
      this.isCollateralNeeded = true;
      this.spendingPlutusScript(script).txIn(
        value.input.txHash,
        value.input.outputIndex,
        value.output.amount,
        value.output.address
      ).txInScript(script.code).txInRedeemerValue(red.data, "Mesh", red.budget);
    }
    if ("output" in script) {
      if (!script.output.scriptRef) {
        throw new Error("redeemValue: No script reference found in UTxO");
      }
      const scriptRef = fromScriptRef(script.output.scriptRef);
      if (!scriptRef || !("code" in scriptRef)) {
        throw new Error("redeemValue: Script reference not found");
      }
      this.isCollateralNeeded = true;
      this.spendingPlutusScript(scriptRef).txIn(
        value.input.txHash,
        value.input.outputIndex,
        value.output.amount,
        value.output.address
      ).spendingTxInReference(
        script.input.txHash,
        script.input.outputIndex,
        (script.output.scriptRef.length / 2).toString(),
        script.output.scriptHash
      ).txInRedeemerValue(red.data, "Mesh", red.budget);
    }
    if (datum) {
      this.txBuilder.txInDatumValue(datum);
    } else {
      this.txBuilder.txInInlineDatumPresent();
    }
    return this;
  }
  // TODO: nuke this probably as the input type is too confusing
  mintAsset(forgeScript, mint, redeemer) {
    const assetQuantity = mint.assetQuantity;
    let assetNameHex = stringToHex(mint.assetName);
    const referenceAssetNameHex = CIP68_100(assetNameHex);
    if (mint.cip68ScriptAddress) {
      assetNameHex = CIP68_222(assetNameHex);
    }
    let policyId = "";
    switch (typeof forgeScript) {
      case "string":
        policyId = deserializeNativeScript(forgeScript).hash().toString();
        this.txBuilder.mint(assetQuantity, policyId, assetNameHex).mintingScript(forgeScript);
        if (mint.cip68ScriptAddress) {
          this.txBuilder.mint(assetQuantity, policyId, referenceAssetNameHex).mintingScript(forgeScript);
        }
        break;
      case "object":
        if (!redeemer)
          throw new Error(
            "burnAsset: Redeemer data is required for Plutus minting"
          );
        if ("code" in forgeScript) {
          policyId = deserializePlutusScript(
            forgeScript.code,
            forgeScript.version
          ).hash().toString();
          this.isCollateralNeeded = true;
          this.mintPlutusScript(forgeScript).mint(assetQuantity, policyId, assetNameHex).mintingScript(forgeScript.code).mintRedeemerValue(redeemer.data, "Mesh", redeemer.budget);
          if (mint.cip68ScriptAddress) {
            this.mintPlutusScript(forgeScript).mint(assetQuantity, policyId, referenceAssetNameHex).mintingScript(forgeScript.code).mintRedeemerValue(redeemer.data, "Mesh", redeemer.budget);
          }
          break;
        }
        if ("output" in forgeScript) {
          if (!forgeScript.output.scriptRef) {
            throw new Error("mintAsset: No script reference found in UTxO");
          }
          const script = fromScriptRef(forgeScript.output.scriptRef);
          if (!script) {
            throw new Error("mintAsset: Script reference not found");
          }
          if ("code" in script) {
            policyId = deserializePlutusScript(script.code, script.version).hash().toString();
            this.isCollateralNeeded = true;
            this.mintPlutusScript(script).mint(assetQuantity, policyId, assetNameHex).mintTxInReference(
              forgeScript.input.txHash,
              forgeScript.input.outputIndex,
              (forgeScript.output.scriptRef.length / 2).toString(),
              forgeScript.output.scriptHash
            ).mintRedeemerValue(redeemer.data, "Mesh", redeemer.budget);
            if (mint.cip68ScriptAddress) {
              this.mintPlutusScript(script).mint(assetQuantity, policyId, referenceAssetNameHex).mintTxInReference(
                forgeScript.input.txHash,
                forgeScript.input.outputIndex,
                (forgeScript.output.scriptRef.length / 2).toString(),
                forgeScript.output.scriptHash
              ).mintRedeemerValue(redeemer.data, "Mesh", redeemer.budget);
              break;
            }
            break;
          } else {
            throw new Error(
              "mintAsset: Reference script minting not implemented"
            );
          }
        }
        break;
    }
    if (mint.recipient) {
      this.sendAssets(mint.recipient, [
        { unit: policyId + assetNameHex, quantity: mint.assetQuantity }
      ]);
    }
    if (mint.cip68ScriptAddress) {
      this.sendAssets(
        {
          address: mint.cip68ScriptAddress,
          datum: { inline: true, value: metadataToCip68(mint.metadata) }
        },
        [
          {
            unit: policyId + referenceAssetNameHex,
            quantity: mint.assetQuantity
          }
        ]
      );
    }
    if (!mint.cip68ScriptAddress && mint.metadata && mint.label) {
      if (mint.label === "721" || mint.label === "20") {
        this.setMetadata(Number(mint.label), {
          [policyId]: { [mint.assetName]: mint.metadata }
        });
      } else {
        this.setMetadata(Number(mint.label), mint.metadata);
      }
    }
    return this;
  }
  // TODO: nuke this probably as the input type is too confusing
  // TO be deprecated as it doesnt support reference script minting native assets
  burnAsset(forgeScript, asset, redeemer) {
    const assetQuantity = "-" + asset.quantity;
    const mint = {
      assetName: hexToString(asset.unit.slice(POLICY_ID_LENGTH)),
      assetQuantity
    };
    try {
      this.mintAsset(forgeScript, mint, redeemer);
    } catch (error) {
      throw new Error("burnAsset: " + error);
    }
    return this;
  }
  /**
   * Sets the change address for the transaction.
   *
   * @param {string} changeAddress The change address.
   * @returns {Transaction} The Transaction object.
   */
  setChangeAddress(changeAddress) {
    this.txBuilder.changeAddress(changeAddress);
    return this;
  }
  /**
   * Sets the collateral for the transaction.
   *
   * @param {UTxO[]} collateral - Set the UTxO for collateral.
   * @returns {Transaction} The Transaction object.
   */
  setCollateral(collateral) {
    collateral.forEach((collateralUtxo) => {
      this.txBuilder.txInCollateral(
        collateralUtxo.input.txHash,
        collateralUtxo.input.outputIndex,
        collateralUtxo.output.amount,
        collateralUtxo.output.address
      );
    });
    return this;
  }
  /**
   * Sets the network to use, this is mainly to know the cost models to be used to calculate script integrity hash
   * @param network The specific network this transaction is being built for ("testnet" | "preview" | "preprod" | "mainnet")
   * @returns The Transaction object.
   */
  setNetwork = (network) => {
    this.txBuilder.setNetwork(network);
    return this;
  };
  /**
   * Sets the required signers for the transaction.
   *
   * @param {string[]} addresses The addresses of the required signers.
   * @returns {Transaction} The Transaction object.
   */
  setRequiredSigners(addresses) {
    addresses.forEach((address) => {
      const { pubKeyHash } = this.txBuilder.serializer.deserializer.key.deserializeAddress(address);
      this.txBuilder.requiredSignerHash(pubKeyHash);
    });
    return this;
  }
  /**
   * Set the time to live for the transaction.
   *
   * @param {string} slot The slot number to expire the transaction at.
   * @returns {Transaction} The Transaction object.
   * @see {@link https://meshjs.dev/apis/transaction#setTimeLimit}
   */
  setTimeToExpire(slot) {
    this.txBuilder.invalidHereafter(Number(slot));
    return this;
  }
  /**
   * Sets the start slot for the transaction.
   *
   * @param {string} slot The start slot for the transaction.
   * @returns {Transaction} The Transaction object.
   * @see {@link https://meshjs.dev/apis/transaction#setTimeLimit}
   */
  setTimeToStart(slot) {
    this.txBuilder.invalidBefore(Number(slot));
    return this;
  }
  /**
   * Add a JSON metadata entry to the transaction.
   *
   * @param {number} key The key to use for the metadata entry.
   * @param {unknown} value The value to use for the metadata entry.
   * @returns {Transaction} The Transaction object.
   * @see {@link https://meshjs.dev/apis/transaction#setMetadata}
   */
  setMetadata(key, value) {
    this.txBuilder.metadataValue(key.toString(), value);
    return this;
  }
  withdrawRewards(rewardAddress, lovelace) {
    this.txBuilder.withdrawal(rewardAddress, lovelace);
    return this;
  }
  delegateStake(rewardAddress, poolId) {
    this.txBuilder.delegateStakeCertificate(
      rewardAddress,
      this.txBuilder.serializer.resolver.keys.resolveEd25519KeyHash(poolId)
    );
    return this;
  }
  deregisterStake(rewardAddress) {
    this.txBuilder.deregisterStakeCertificate(rewardAddress);
    return this;
  }
  registerStake(rewardAddress) {
    this.txBuilder.registerStakeCertificate(rewardAddress);
    return this;
  }
  // TODO: test
  registerPool(params) {
    this.txBuilder.registerPoolCertificate(params);
    return this;
  }
  // TODO: test
  retirePool(poolId, epochNo) {
    this.txBuilder.retirePoolCertificate(poolId, epochNo);
    return this;
  }
  async build() {
    try {
      await this.addCollateralIfNeeded();
      await this.addTxInputsAsNeeded();
      await this.addChangeAddress();
      return this.txBuilder.complete();
    } catch (error) {
      throw new Error(
        `[Transaction] An error occurred during build: ${error}.`
      );
    }
  }
  mintPlutusScript(script) {
    switch (script.version) {
      case "V1":
        this.txBuilder.mintPlutusScriptV1();
        break;
      case "V2":
        this.txBuilder.mintPlutusScriptV2();
        break;
      case "V3":
        this.txBuilder.mintPlutusScriptV3();
        break;
    }
    return this.txBuilder;
  }
  spendingPlutusScript(script) {
    switch (script.version) {
      case "V1":
        this.txBuilder.spendingPlutusScriptV1();
        break;
      case "V2":
        this.txBuilder.spendingPlutusScriptV2();
        break;
      case "V3":
        this.txBuilder.spendingPlutusScriptV3();
        break;
    }
    return this.txBuilder;
  }
  async addCollateralIfNeeded() {
    if (this.isCollateralNeeded) {
      const collaterals = await this.initiator.getCollateral();
      if (collaterals.length > 0) {
        this.setCollateral(collaterals);
        return;
      }
      const utxos = await this.initiator.getUtxos();
      const pureLovelaceUtxos = utxos.filter(
        (utxo) => utxo.output.amount.length === 1
      );
      pureLovelaceUtxos.sort((a, b) => {
        return Number(a.output.amount[0]?.quantity) - Number(a.output.amount[0]?.quantity);
      });
      for (const utxo of pureLovelaceUtxos) {
        if (Number(utxo.output.amount[0]?.quantity) >= 5e6) {
          return [utxo];
        }
      }
      if (pureLovelaceUtxos.length === 0) {
        throw new Error("No pure lovelace utxos found for collateral");
      }
      this.setCollateral([pureLovelaceUtxos[0]]);
    }
  }
  async addTxInputsAsNeeded() {
    const utxos = await this.initiator.getUtxos();
    this.txBuilder.selectUtxosFrom(utxos);
  }
  async addChangeAddress() {
    if (this.txBuilder.meshTxBuilderBody.changeAddress === "") {
      const changeAddress = await this.initiator.getChangeAddress();
      this.setChangeAddress(changeAddress);
    }
  }
};
export {
  ForgeScript,
  MeshTxBuilder,
  Transaction,
  utxoToTxIn
};
