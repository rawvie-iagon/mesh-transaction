import { Protocol, MintItem, TxIn, Withdrawal, PubKeyTxIn, RefTxIn, MeshTxBuilderBody, Asset, BuilderData, LanguageVersion, PoolParams, UTxO, UtxoSelectionStrategy, Network, Redeemer, Action, IFetcher, ISubmitter, IEvaluator, IMeshTxSerializer, ScriptSource, SimpleScriptSourceInfo, NativeScript, IInitiator, Recipient, Token, PlutusScript, Budget, Data, Mint } from '@meshsdk/common';

declare class MeshTxBuilderCore {
    txEvaluationMultiplier: number;
    private txOutput?;
    private addingPlutusScriptInput;
    private plutusSpendingScriptVersion;
    private addingPlutusMint;
    private plutusMintingScriptVersion;
    private addingPlutusWithdrawal;
    private plutusWithdrawalScriptVersion;
    protected _protocolParams: Protocol;
    protected mintItem?: MintItem;
    protected txInQueueItem?: TxIn;
    protected withdrawalItem?: Withdrawal;
    protected collateralQueueItem?: PubKeyTxIn;
    protected refScriptTxInQueueItem?: RefTxIn;
    meshTxBuilderBody: MeshTxBuilderBody;
    constructor();
    /**
     * Set the input for transaction
     * @param txHash The transaction hash of the input UTxO
     * @param txIndex The transaction index of the input UTxO
     * @param amount The asset amount of index of the input UTxO
     * @param address The address of the input UTxO
     * @returns The MeshTxBuilder instance
     */
    txIn: (txHash: string, txIndex: number, amount?: Asset[], address?: string) => this;
    /**
     * Set the script for transaction input
     * @param {string} scriptCbor The CborHex of the script
     * @param version Optional - The Plutus script version
     * @returns The MeshTxBuilder instance
     */
    txInScript: (scriptCbor: string) => this;
    /**
     * Set the input datum for transaction input
     * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @returns The MeshTxBuilder instance
     */
    txInDatumValue: (datum: BuilderData["content"], type?: BuilderData["type"]) => this;
    /**
     * Tell the transaction builder that the input UTxO has inlined datum
     * @returns The MeshTxBuilder instance
     */
    txInInlineDatumPresent: () => this;
    /**
     * Set the redeemer for the reference input to be spent in same transaction
     * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param exUnits The execution units budget for the redeemer
     * @returns The MeshTxBuilder instance
     */
    txInRedeemerValue: (redeemer: BuilderData["content"], type?: BuilderData["type"], exUnits?: {
        mem: number;
        steps: number;
    }) => this;
    /**
     * Set the output for transaction
     * @param {string} address The recipient of the output
     * @param {Asset[]} amount The amount of other native assets attached with UTxO
     * @returns The MeshTxBuilder instance
     */
    txOut: (address: string, amount: Asset[]) => this;
    /**
     * Set the output datum hash for transaction
     * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @returns The MeshTxBuilder instance
     */
    txOutDatumHashValue: (datum: BuilderData["content"], type?: BuilderData["type"]) => this;
    /**
     * Set the output inline datum for transaction
     * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @returns The MeshTxBuilder instance
     */
    txOutInlineDatumValue: (datum: BuilderData["content"], type?: BuilderData["type"]) => this;
    /**
     * Set the output embed datum for transaction
     * @param datum The datum in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param type The datum type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @returns The MeshTxBuilder instance
     */
    txOutDatumEmbedValue: (datum: BuilderData["content"], type?: BuilderData["type"]) => this;
    /**
     * Set the reference script to be attached with the output
     * @param scriptCbor The CBOR hex of the script to be attached to UTxO as reference script
     * @param version Optional - The Plutus script version
     * @returns The MeshTxBuilder instance
     */
    txOutReferenceScript: (scriptCbor: string, version?: LanguageVersion) => this;
    /**
     * Set the instruction that it is currently using V1 Plutus spending scripts
     * @returns The MeshTxBuilder instance
     */
    spendingPlutusScriptV1: () => this;
    /**
     * Set the instruction that it is currently using V2 Plutus spending scripts
     * @returns The MeshTxBuilder instance
     */
    spendingPlutusScriptV2: () => this;
    /**
     * Set the instruction that it is currently using V3 Plutus spending scripts
     * @returns The MeshTxBuilder instance
     */
    spendingPlutusScriptV3: () => this;
    /**
     * Set the reference input where it would also be spent in the transaction
     * @param txHash The transaction hash of the reference UTxO
     * @param txIndex The transaction index of the reference UTxO
     * @param scriptSize The script size in bytes of the spending script (can be obtained by script hex length / 2)
     * @param scriptHash The script hash of the spending script
     * @returns The MeshTxBuilder instance
     */
    spendingTxInReference: (txHash: string, txIndex: number, scriptSize?: string, scriptHash?: string) => this;
    /**
     * [Alias of txInInlineDatumPresent] Set the instruction that the reference input has inline datum
     * @returns The MeshTxBuilder instance
     */
    spendingReferenceTxInInlineDatumPresent: () => this;
    /**
     * [Alias of txInRedeemerValue] Set the redeemer for the reference input to be spent in same transaction
     * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param exUnits The execution units budget for the redeemer
     * @returns The MeshTxBuilder instance
     */
    spendingReferenceTxInRedeemerValue: (redeemer: BuilderData["content"], type?: BuilderData["type"], exUnits?: {
        mem: number;
        steps: number;
    }) => this;
    /**
     * Specify a read only reference input. This reference input is not witnessing anything it is simply provided in the plutus script context.
     * @param txHash The transaction hash of the reference UTxO
     * @param txIndex The transaction index of the reference UTxO
     * @returns The MeshTxBuilder instance
     */
    readOnlyTxInReference: (txHash: string, txIndex: number) => this;
    /**
     * Set the instruction that it is currently using V1 Plutus minting scripts
     * @returns The MeshTxBuilder instance
     */
    mintPlutusScriptV1: () => this;
    /**
     * Set the instruction that it is currently using V2 Plutus minting scripts
     * @returns The MeshTxBuilder instance
     */
    mintPlutusScriptV2: () => this;
    /**
     * Set the instruction that it is currently using V3 Plutus minting scripts
     * @returns The MeshTxBuilder instance
     */
    mintPlutusScriptV3: () => this;
    /**
     * Set the minting value of transaction
     * @param quantity The quantity of asset to be minted
     * @param policy The policy id of the asset to be minted
     * @param name The hex of token name of the asset to be minted
     * @returns The MeshTxBuilder instance
     */
    mint: (quantity: string, policy: string, name: string) => this;
    /**
     * Set the minting script of current mint
     * @param scriptCBOR The CBOR hex of the minting policy script
     * @param version Optional - The Plutus script version
     * @returns The MeshTxBuilder instance
     */
    mintingScript: (scriptCBOR: string) => this;
    /**
     * Use reference script for minting
     * @param txHash The transaction hash of the UTxO
     * @param txIndex The transaction index of the UTxO
     * @param scriptSize The script size in bytes of the script (can be obtained by script hex length / 2)
     * @param scriptHash The script hash of the script
     * @returns The MeshTxBuilder instance
     */
    mintTxInReference: (txHash: string, txIndex: number, scriptSize?: string, scriptHash?: string) => this;
    /**
     * Set the redeemer for minting
     * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param exUnits The execution units budget for the redeemer
     * @returns The MeshTxBuilder instance
     */
    mintReferenceTxInRedeemerValue: (redeemer: BuilderData["content"], type?: BuilderData["type"], exUnits?: {
        mem: number;
        steps: number;
    }) => this;
    /**
     * Set the redeemer for the reference input to be spent in same transaction
     * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param exUnits The execution units budget for the redeemer
     * @returns The MeshTxBuilder instance
     */
    mintRedeemerValue: (redeemer: BuilderData["content"], type?: BuilderData["type"], exUnits?: {
        mem: number;
        steps: number;
    }) => this;
    /**
     * Set the required signer of the transaction
     * @param pubKeyHash The PubKeyHash of the required signer
     * @returns The MeshTxBuilder instance
     */
    requiredSignerHash: (pubKeyHash: string) => this;
    /**
     * Set the collateral UTxO for the transaction
     * @param txHash The transaction hash of the collateral UTxO
     * @param txIndex The transaction index of the collateral UTxO
     * @param amount The asset amount of index of the collateral UTxO
     * @param address The address of the collateral UTxO
     * @returns The MeshTxBuilder instance
     */
    txInCollateral: (txHash: string, txIndex: number, amount?: Asset[], address?: string) => this;
    /**
     * Set the instruction that it is currently using V1 Plutus withdrawal scripts
     * @returns The MeshTxBuilder instance
     */
    withdrawalPlutusScriptV1: () => this;
    /**
     * Set the instruction that it is currently using V2 Plutus withdrawal scripts
     * @returns The MeshTxBuilder instance
     */
    withdrawalPlutusScriptV2: () => this;
    /**
     * Set the instruction that it is currently using V3 Plutus withdrawal scripts
     * @returns The MeshTxBuilder instance
     */
    withdrawalPlutusScriptV3: () => this;
    /**
     * Withdraw stake rewards in the MeshTxBuilder instance
     * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
     * @param coin The amount of lovelaces in the withdrawal
     * @returns The MeshTxBuilder instance
     */
    withdrawal: (rewardAddress: string, coin: string) => this;
    /**
     * Add a withdrawal script to the MeshTxBuilder instance
     * @param scriptCbor The script in CBOR format
     * @returns The MeshTxBuilder instance
     */
    withdrawalScript: (scriptCbor: string) => this;
    /**
     * Add a withdrawal reference to the MeshTxBuilder instance
     * @param txHash The transaction hash of reference UTxO
     * @param txIndex The transaction index of reference UTxO
     * @param scriptSize The script size in bytes of the withdrawal script (can be obtained by script hex length / 2)
     * @param scriptHash The script hash of the withdrawal script
     * @returns The MeshTxBuilder instance
     */
    withdrawalTxInReference: (txHash: string, txIndex: number, scriptSize?: string, scriptHash?: string) => this;
    /**
     * Set the transaction withdrawal redeemer value in the MeshTxBuilder instance
     * @param redeemer The redeemer in Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param type The redeemer data type, either Mesh Data type, JSON in raw constructor like format, or CBOR hex string
     * @param exUnits The execution units budget for the redeemer
     * @returns The MeshTxBuilder instance
     */
    withdrawalRedeemerValue: (redeemer: BuilderData["content"], type?: BuilderData["type"], exUnits?: {
        mem: number;
        steps: number;
    }) => this;
    /**
     * Creates a pool registration certificate, and adds it to the transaction
     * @param poolParams Parameters for pool registration
     * @returns The MeshTxBuilder instance
     */
    registerPoolCertificate: (poolParams: PoolParams) => this;
    /**
     * Creates a stake registration certificate, and adds it to the transaction
     * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
     * @returns The MeshTxBuilder instance
     */
    registerStakeCertificate: (rewardAddress: string) => this;
    /**
     * Creates a stake delegation certificate, and adds it to the transaction
     * This will delegate stake from the corresponding stake address to the pool
     * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
     * @param poolId poolId can be in either bech32 or hex form
     * @returns The MeshTxBuilder instance
     */
    delegateStakeCertificate: (rewardAddress: string, poolId: string) => this;
    /**
     * Creates a stake deregister certificate, and adds it to the transaction
     * @param rewardAddress The bech32 reward address (i.e. start with `stake_xxxxx`)
     * @returns The MeshTxBuilder instance
     */
    deregisterStakeCertificate: (rewardAddress: string) => this;
    /**
     * Creates a pool retire certificate, and adds it to the transaction
     * @param poolId poolId can be in either bech32 or hex form
     * @param epoch The intended epoch to retire the pool
     * @returns The MeshTxBuilder instance
     */
    retirePoolCertificate: (poolId: string, epoch: number) => this;
    /**
     * Adds a script witness to the certificate
     * @param scriptCbor The CborHex of the script
     * @param version Optional - The plutus version of the script, null version implies Native Script
     */
    certificateScript: (scriptCbor: string, version?: LanguageVersion) => this;
    /**
     * Adds a script witness to the certificate
     * @param txHash The transaction hash of the reference UTxO
     * @param txIndex The transaction index of the reference UTxO
     * @param scriptSize The size of the plutus script in bytes referenced (can be obtained by script hex length / 2)
     * @param scriptHash The script hash of the spending script
     * @param version The plutus version of the script, null version implies Native Script
     */
    certificateTxInReference: (txHash: string, txIndex: number, scriptSize?: string, scriptHash?: string, version?: LanguageVersion) => this;
    certificateRedeemerValue: (redeemer: BuilderData["content"], type?: BuilderData["type"], exUnits?: {
        mem: number;
        steps: number;
    }) => this;
    /**
     * Configure the address to accept change UTxO
     * @param addr The address to accept change UTxO
     * @returns The MeshTxBuilder instance
     */
    changeAddress: (addr: string) => this;
    /**
     * Set the transaction valid interval to be valid only after the slot
     * @param slot The transaction is valid only after this slot
     * @returns The MeshTxBuilder instance
     */
    invalidBefore: (slot: number) => this;
    /**
     * Set the transaction valid interval to be valid only before the slot
     * @param slot The transaction is valid only before this slot
     * @returns The MeshTxBuilder instance
     */
    invalidHereafter: (slot: number) => this;
    /**
     * Add metadata to the transaction
     * @param tag The tag of the metadata
     * @param metadata The metadata in any format
     * @returns The MeshTxBuilder instance
     */
    metadataValue: (tag: string, metadata: any) => this;
    /**
     * Sign the transaction with the private key
     * @param skeyHex The private key in cborHex (with or without 5820 prefix, i.e. the format when generated from cardano-cli)
     * @returns
     */
    signingKey: (skeyHex: string) => this;
    /**
     * Selects utxos to fill output value and puts them into inputs
     * @param extraInputs The inputs already placed into the object will remain, these extra inputs will be used to fill the remaining  value needed
     * @param strategy The strategy to be used in utxo selection
     * @param threshold Extra value needed to be selected for, usually for paying fees and min UTxO value of change output
     */
    selectUtxosFrom: (extraInputs: UTxO[], strategy?: UtxoSelectionStrategy, threshold?: string, includeTxFees?: boolean) => this;
    /**
     * Set the protocol parameters to be used for the transaction other than the default one
     * @param params (Part of) the protocol parameters to be used for the transaction
     * @returns The MeshTxBuilder instance
     */
    protocolParams: (params: Partial<Protocol>) => this;
    /**
     * Sets the network to use, this is mainly to know the cost models to be used to calculate script integrity hash
     * @param network The specific network this transaction is being built for ("testnet" | "preview" | "preprod" | "mainnet")
     * @returns The MeshTxBuilder instance
     */
    setNetwork: (network: Network) => this;
    protected queueAllLastItem: () => void;
    private queueInput;
    private queueMint;
    private queueWithdrawal;
    protected castRawDataToJsonString: (rawData: object | string) => string;
    protected castBuilderDataToRedeemer: (redeemer: BuilderData["content"], type?: BuilderData["type"], exUnits?: {
        mem: number;
        steps: number;
    }) => Redeemer;
    protected updateRedeemer: (meshTxBuilderBody: MeshTxBuilderBody, txEvaluation: Omit<Action, "data">[]) => void;
    addUtxosFromSelection: () => void;
    removeDuplicateInputs: () => void;
    emptyTxBuilderBody: () => () => MeshTxBuilderBody;
    reset: () => void;
}

/**
 * Convert UTxO to TxIn parameters in array for MeshTxBuilder
 * @param utxo UTxO
 * @returns [txHash, outputIndex, amount, address]
 */
declare const utxoToTxIn: (utxo: UTxO) => [string, number, Asset[], string];

interface MeshTxBuilderOptions {
    fetcher?: IFetcher;
    submitter?: ISubmitter;
    evaluator?: IEvaluator;
    serializer?: IMeshTxSerializer;
    isHydra?: boolean;
    params?: Partial<Protocol>;
    verbose?: boolean;
}
declare class MeshTxBuilder extends MeshTxBuilderCore {
    serializer: IMeshTxSerializer;
    fetcher?: IFetcher;
    submitter?: ISubmitter;
    evaluator?: IEvaluator;
    txHex: string;
    protected queriedTxHashes: Set<string>;
    protected queriedUTxOs: {
        [x: string]: UTxO[];
    };
    constructor({ serializer, fetcher, submitter, evaluator, params, isHydra, verbose, }?: MeshTxBuilderOptions);
    /**
     * It builds the transaction and query the blockchain for missing information
     * @param customizedTx The optional customized transaction body
     * @returns The signed transaction in hex ready to submit / signed by client
     */
    complete: (customizedTx?: Partial<MeshTxBuilderBody>) => Promise<string>;
    /**
     * It builds the transaction without dependencies
     * @param customizedTx The optional customized transaction body
     * @returns The signed transaction in hex ready to submit / signed by client
     */
    completeSync: (customizedTx?: MeshTxBuilderBody) => string;
    /**
     * Complete the signing process
     * @returns The signed transaction in hex
     */
    completeSigning: () => string;
    /**
     * Submit transactions to the blockchain using the fetcher instance
     * @param txHex The signed transaction in hex
     * @returns
     */
    submitTx: (txHex: string) => Promise<string | undefined>;
    /**
     * Get the UTxO information from the blockchain
     * @param txHash The TxIn object that contains the txHash and txIndex, while missing amount and address information
     */
    protected getUTxOInfo: (txHash: string) => Promise<void>;
    protected queryAllTxInfo: (incompleteTxIns: TxIn[], incompleteMints: MintItem[]) => Promise<void[]>;
    protected completeTxInformation: (input: TxIn) => void;
    protected completeInputInfo: (input: TxIn) => void;
    protected completeScriptInfo: (scriptSource: ScriptSource) => void;
    protected completeSimpleScriptInfo: (simpleScript: SimpleScriptSourceInfo) => void;
    protected isInputComplete: (txIn: TxIn) => boolean;
    protected isInputInfoComplete: (txIn: TxIn) => boolean;
    protected isMintComplete: (mint: MintItem) => boolean;
    protected isRefScriptInfoComplete: (scriptSource: ScriptSource) => boolean;
}

declare class ForgeScript {
    static withOneSignature(address: string): string;
    static fromNativeScript(script: NativeScript): string;
}

interface TransactionOptions extends MeshTxBuilderOptions {
    initiator: IInitiator;
}
declare class Transaction {
    txBuilder: MeshTxBuilder;
    initiator: IInitiator;
    isCollateralNeeded: boolean;
    constructor(options: TransactionOptions);
    /**
     * Adds an output to the transaction.
     *
     * @param recipient The recipient of the output.
     * @param assets The assets to send. Provide string for lovelace and Asset[] for tokens and/or lovelace.
     * @returns The transaction builder.
     * @see {@link https://meshjs.dev/apis/transaction#sendAssets}
     */
    sendAssets(recipient: Recipient, assets: Asset[] | string): Transaction;
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
    sendLovelace(recipient: Recipient, lovelace: string): Transaction;
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
    sendToken(recipient: Recipient, ticker: Token, amount: string): Transaction;
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
    sendValue(recipient: Recipient, value: UTxO): Transaction;
    /**
     * Sets the inputs for the transaction.
     *
     * @param {UTxO[]} inputs The inputs to set.
     * @returns {Transaction} The transaction.
     */
    setTxInputs(inputs: UTxO[]): Transaction;
    /**
     * Sets the reference inputs for the transaction.
     *
     * @param {UTxO[]} inputs The reference inputs to set.
     * @returns {Transaction} The transaction.
     */
    setTxRefInputs(inputs: UTxO[]): Transaction;
    /**
     * Sets the native script for the transaction.
     * @param {NativeScript} script The native script to spend from.
     * @param {UTxO} utxo The UTxO attached to the script.
     * @returns {Transaction} The Transaction object.
     */
    setNativeScriptInput(script: NativeScript, utxo: UTxO): Transaction;
    redeemValue(options: {
        value: UTxO;
        script: PlutusScript | UTxO;
        redeemer?: Pick<Action, "data"> & {
            budget?: Budget;
        };
        datum?: Data | UTxO;
    }): Transaction;
    mintAsset(forgeScript: string | PlutusScript | UTxO, mint: Mint, redeemer?: Pick<Action, "data"> & {
        budget?: Budget;
    }): Transaction;
    burnAsset(forgeScript: string | PlutusScript | UTxO, asset: Asset, redeemer?: Pick<Action, "data"> & {
        budget?: Budget;
    }): Transaction;
    /**
     * Sets the change address for the transaction.
     *
     * @param {string} changeAddress The change address.
     * @returns {Transaction} The Transaction object.
     */
    setChangeAddress(changeAddress: string): Transaction;
    /**
     * Sets the collateral for the transaction.
     *
     * @param {UTxO[]} collateral - Set the UTxO for collateral.
     * @returns {Transaction} The Transaction object.
     */
    setCollateral(collateral: UTxO[]): Transaction;
    /**
     * Sets the network to use, this is mainly to know the cost models to be used to calculate script integrity hash
     * @param network The specific network this transaction is being built for ("testnet" | "preview" | "preprod" | "mainnet")
     * @returns The Transaction object.
     */
    setNetwork: (network: Network) => this;
    /**
     * Sets the required signers for the transaction.
     *
     * @param {string[]} addresses The addresses of the required signers.
     * @returns {Transaction} The Transaction object.
     */
    setRequiredSigners(addresses: string[]): Transaction;
    /**
     * Set the time to live for the transaction.
     *
     * @param {string} slot The slot number to expire the transaction at.
     * @returns {Transaction} The Transaction object.
     * @see {@link https://meshjs.dev/apis/transaction#setTimeLimit}
     */
    setTimeToExpire(slot: string): Transaction;
    /**
     * Sets the start slot for the transaction.
     *
     * @param {string} slot The start slot for the transaction.
     * @returns {Transaction} The Transaction object.
     * @see {@link https://meshjs.dev/apis/transaction#setTimeLimit}
     */
    setTimeToStart(slot: string): Transaction;
    /**
     * Add a JSON metadata entry to the transaction.
     *
     * @param {number} key The key to use for the metadata entry.
     * @param {unknown} value The value to use for the metadata entry.
     * @returns {Transaction} The Transaction object.
     * @see {@link https://meshjs.dev/apis/transaction#setMetadata}
     */
    setMetadata(key: number, value: unknown): Transaction;
    withdrawRewards(rewardAddress: string, lovelace: string): Transaction;
    delegateStake(rewardAddress: string, poolId: string): Transaction;
    deregisterStake(rewardAddress: string): Transaction;
    registerStake(rewardAddress: string): Transaction;
    registerPool(params: PoolParams): Transaction;
    retirePool(poolId: string, epochNo: number): Transaction;
    build(): Promise<string>;
    protected mintPlutusScript(script: PlutusScript): MeshTxBuilder;
    protected spendingPlutusScript(script: PlutusScript): MeshTxBuilder;
    private addCollateralIfNeeded;
    private addTxInputsAsNeeded;
    private addChangeAddress;
}

export { ForgeScript, MeshTxBuilder, type MeshTxBuilderOptions, Transaction, type TransactionOptions, utxoToTxIn };
