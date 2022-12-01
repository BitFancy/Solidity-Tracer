import { Artifacts } from "hardhat/types";
import { TraceRecorder } from "./trace/recorder";
import { Decoder } from "./decoder";
import { BigNumberish, PopulatedTransaction } from "ethers";
import { TracerCache } from "./cache";
import { TransactionTrace } from "./trace/transaction";

export interface NameTags {
  [address: string]: string;
}

export interface TracerEnvUser {
  enabled?: boolean;
  defaultVerbosity?: number;
  showAddresses?: boolean;
  gasCost?: boolean;
  opcodes?: string[];
  nameTags?: NameTags;
  stateOverrides?: StateOverrides;
}

export interface TracerEnv {
  enabled: boolean;
  ignoreNext: boolean;
  printNext: boolean;
  verbosity: number;
  showAddresses: boolean;
  gasCost: boolean;
  opcodes: Map<string, boolean>; // string[]; // TODO have a map of opcode to boolean
  nameTags: NameTags;
  // todo remove internal
  _internal: {
    cache: TracerCache;
    printNameTagTip:
      | undefined // meaning "no need to print"
      | "print it"
      | "already printed";
  };
  recorder?: TraceRecorder;
  lastTrace: () => TransactionTrace | undefined;
  decoder?: Decoder;
  stateOverrides?: StateOverrides;
}

export interface TracerDependencies {
  artifacts: Artifacts;
  tracerEnv: TracerEnv;
  provider: ProviderLike;
}

export interface TracerDependenciesExtended extends TracerDependencies {
  nameTags: NameTags;
}

export interface ProviderLike {
  send(method: string, params?: any[] | undefined): Promise<any>;
}

export interface StructLog {
  depth: number;
  error: string;
  gas: number;
  gasCost: number;
  memory: string[];
  op: string;
  pc: number;
  stack: string[];
  storage: {};
}

export interface StateOverrides {
  [address: string]: {
    storage?: {
      [slot: string | number]: BigNumberish;
    };
    bytecode?: ContractInfo;
    balance?: BigNumberish;
    nonce?: BigNumberish;
  };
}

export type ContractInfo =
  | string // bytecode in hex or name of the contract
  | {
      name: string;
      libraries?: {
        [libraryName: string]: ContractInfo;
      };
    };

export interface ChaiMessageCallOptions {
  isStaticCall?: boolean;
  isDelegateCall?: boolean;
  isSuccess?: boolean;
  returnData?: string;
}

declare global {
  export namespace Chai {
    interface Assertion {
      messageCall(
        tx: PopulatedTransaction,
        options?: ChaiMessageCallOptions
      ): Assertion;
    }
  }
}
