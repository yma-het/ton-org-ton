import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, InternalMessage, SendMode } from "ton-core";
import { Maybe } from "../utils/maybe";
import { createWalletTransferV3 } from "./signing/createWalletTransfer";

export class WalletContractV3R1 implements Contract {

    static create(args: { workchain: number, publicKey: Buffer, walletId?: Maybe<number> }) {
        return new WalletContractV3R1(args.workchain, args.publicKey, args.walletId);
    }

    readonly workchain: number;
    readonly publicKey: Buffer;
    readonly address: Address;
    readonly walletId: number;
    readonly init: { data: Cell, code: Cell };

    private constructor(workchain: number, publicKey: Buffer, walletId?: Maybe<number>) {

        // Resolve parameters
        this.workchain = workchain;
        this.publicKey = publicKey;
        if (walletId !== null && walletId !== undefined) {
            this.walletId = walletId;
        } else {
            this.walletId = 698983191 + workchain;
        }

        // Build initial code and data
        let code = Cell.fromBoc(Buffer.from('te6cckEBAQEAYgAAwP8AIN0gggFMl7qXMO1E0NcLH+Ck8mCDCNcYINMf0x/TH/gjE7vyY+1E0NMf0x/T/9FRMrryoVFEuvKiBPkBVBBV+RDyo/gAkyDXSpbTB9QC+wDo0QGkyMsfyx/L/8ntVD++buA=', 'base64'))[0];
        let data = beginCell()
            .storeUint(0, 32) // Seqno
            .storeUint(this.walletId, 32)
            .storeBuffer(publicKey)
            .endCell();
        this.init = { code, data };
        this.address = contractAddress(workchain, { code, data });
    }

    async getSeqno(executor: ContractProvider) {
        let state = await executor.getState();
        if (state.state.type === 'active') {
            let res = await executor.callGetMethod('seqno', []);
            return res.stack.readNumber();
        } else {
            return 0;
        }
    }

    async getBalance(executor: ContractProvider) {
        let state = await executor.getState();
        return state.balance;
    }

    async send(executor: ContractProvider, message: Cell) {
        await executor.send(message);
    }

    createTransfer(args: {
        seqno: number,
        secretKey: Buffer,
        messages: InternalMessage[],
        sendMode?: Maybe<SendMode>,
        timeout?: Maybe<number>
    }) {
        let sendMode = SendMode.PAY_GAS_SEPARATLY;
        if (args.sendMode !== null && args.sendMode !== undefined) {
            sendMode = args.sendMode;
        }
        return createWalletTransferV3({
            seqno: args.seqno,
            sendMode,
            secretKey: args.secretKey,
            messages: args.messages,
            timeout: args.timeout,
            walletId: this.walletId
        });
    }
}