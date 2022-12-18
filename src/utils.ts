import {
  arrayify,
  hexStripZeros,
  hexZeroPad,
  Interface,
} from "ethers/lib/utils";
import { BigNumber, ethers } from "ethers";
import { VM } from "@nomicfoundation/ethereumjs-vm";
import { InterpreterStep } from "@nomicfoundation/ethereumjs-evm";
import {
  Artifacts,
  ConfigurableTaskDefinition,
  HardhatRuntimeEnvironment,
} from "hardhat/types";
import { Address } from "@nomicfoundation/ethereumjs-util";
import {
  ContractInfo,
  ProviderLike,
  StateOverrides,
  StructLog,
  TracerDependencies,
  TracerDependenciesExtended,
  TracerEnv,
  TracerEnvUser,
} from "./types";

import {
  getOpcodesForHF,
  Opcode,
} from "@nomicfoundation/ethereumjs-evm/dist/opcodes";
import { CALL } from "./trace/opcodes/call";

export function addCliParams(task: ConfigurableTaskDefinition) {
  return (
    task
      // verbosity flags
      .addFlag("v", "set verbosity to 1, prints calls for only failed txs")
      .addFlag(
        "vv",
        "set verbosity to 2, prints calls and storage for only failed txs"
      )
      .addFlag("vvv", "set verbosity to 3, prints calls for all txs")
      .addFlag(
        "vvvv",
        "set verbosity to 4, prints calls and storage for all txs"
      )
      .addFlag("gascost", "display gas cost")
      .addFlag(
        "disabletracer",
        "do not enable tracer at the start (for inline enabling tracer)"
      )

      // params
      .addOptionalParam("opcodes", "specify more opcodes to print")

      // alias
      .addFlag("trace", "enable tracer with verbosity 3")
      .addFlag("fulltrace", "enable tracer with verbosity 4")
  );
}

export const DEFAULT_VERBOSITY = 1;

export function applyCliArgsToTracer(
  args: any,
  hre: HardhatRuntimeEnvironment
) {
  // enabled by default
  hre.tracer.enabled = true;

  // for not enabling tracer from the start
  if (args.disabletracer) {
    hre.tracer.enabled = false;
  }

  // always active opcodes
  const opcodesToActivate = ["RETURN", "REVERT"];

  const logOpcodes = ["LOG0", "LOG1", "LOG2", "LOG3", "LOG4"];
  const storageOpcodes = ["SLOAD", "SSTORE"];

  // setting verbosity
  if (args.vvvv || args.fulltrace) {
    hre.tracer.verbosity = 4;
    opcodesToActivate.push(...logOpcodes, ...storageOpcodes);
  } else if (args.vvv || args.trace) {
    hre.tracer.verbosity = 3;
    opcodesToActivate.push(...logOpcodes);
  } else if (args.vv) {
    hre.tracer.verbosity = 2;
    opcodesToActivate.push(...logOpcodes, ...storageOpcodes);
  } else if (args.v) {
    opcodesToActivate.push(...logOpcodes);
    hre.tracer.verbosity = 1;
  }

  for (const opcode of opcodesToActivate) {
    hre.tracer.opcodes.set(opcode, true);
  }

  if (args.opcodes) {
    // hre.tracer.opcodes = [hre.tracer.opcodes, ...args.opcodes.split(",")];
    for (const opcode of args.opcodes.split(",")) {
      hre.tracer.opcodes.set(opcode, true);
    }

    // if recorder was already created, then check opcodes, else it will be checked later
    if (hre.tracer.recorder !== undefined) {
      checkIfOpcodesAreValid(hre.tracer.opcodes, hre.tracer.recorder.vm);
    }
  }

  if (args.gascost) {
    hre.tracer.gasCost = true;
  }
}

// TODO remove
export function isOnlyLogs(env: TracerEnv): boolean {
  return env.verbosity === 1;
}

export function getFromNameTags(
  address: string,
  dependencies: TracerDependencies
): string | undefined {
  return (
    dependencies.tracerEnv.nameTags[address] ||
    dependencies.tracerEnv.nameTags[address.toLowerCase()] ||
    dependencies.tracerEnv.nameTags[address.toUpperCase()] ||
    dependencies.tracerEnv.nameTags[ethers.utils.getAddress(address)]
  );
}

function replaceIfExists(
  key: string,
  value: string,
  dependencies: TracerDependenciesExtended
) {
  if (
    dependencies.nameTags[key] &&
    !dependencies.nameTags[key].split(" / ").includes(value)
  ) {
    dependencies.nameTags[key] = `${value} / ${dependencies.nameTags[key]}`;
    return true;
  } else {
    return false;
  }
}

export function findNextStructLogInDepth(
  structLogs: StructLog[],
  depth: number,
  startIndex: number
): [StructLog, StructLog] {
  for (let i = startIndex; i < structLogs.length; i++) {
    if (structLogs[i].depth === depth) {
      return [structLogs[i], structLogs[i + 1]];
    }
  }
  throw new Error("C[hardhat-tracer]: ould not find next StructLog in depth");
}

export function parseHex(str: string) {
  return !str.startsWith("0x") ? "0x" + str : str;
}

export function parseNumber(str: string) {
  return parseUint(str).toNumber();
}

export function parseUint(str: string) {
  return BigNumber.from(parseHex(str));
}

export function parseAddress(str: string) {
  return hexZeroPad(hexStripZeros(parseHex(str)), 20);
}

export function parseMemory(strArr: string[]) {
  return arrayify(parseHex(strArr.join("")));
}

export function shallowCopyStack(stack: string[]): string[] {
  return [...stack];
}

export function shallowCopyStack2(stack: bigint[]): string[] {
  return [...stack].map((x) => BigNumber.from(x).toHexString());
}

export function compareBytecode(
  artifactBytecode: string,
  contractBytecode: string
): number {
  if (artifactBytecode.length <= 2 || contractBytecode.length <= 2) return 0;

  if (typeof artifactBytecode === "string")
    artifactBytecode = artifactBytecode
      .replace(/\_\_\$/g, "000")
      .replace(/\$\_\_/g, "000");

  let matchedBytes = 0;
  for (let i = 0; i < artifactBytecode.length; i++) {
    if (artifactBytecode[i] === contractBytecode[i]) matchedBytes++;
  }
  if (isNaN(matchedBytes / artifactBytecode.length))
    console.log(matchedBytes, artifactBytecode.length);

  return matchedBytes / artifactBytecode.length;
}

export function removeColor(str: string) {
  return str.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

/**
 * Ensures 0x prefix to a hex string which may or may not
 * @param str A hex string that may or may not have 0x prepended
 */
export function hexPrefix(str: string): string {
  if (!str.startsWith("0x")) str = "0x" + str;
  return str;
}

export function checkIfOpcodesAreValid(opcodes: Map<string, boolean>, vm: VM) {
  // fetch the opcodes which work on this VM
  let activeOpcodesMap = new Map<string, boolean>();
  for (const opcode of getOpcodesForHF(vm._common).opcodes.values()) {
    activeOpcodesMap.set(opcode.fullName, true);
  }

  // check if there are any opcodes specified in tracer which do not work
  for (const opcode of opcodes.keys()) {
    if (!activeOpcodesMap.get(opcode)) {
      throw new Error(
        `[hardhat-tracer]: The opcode "${opcode}" is not active on this VM. If the opcode name is misspelled in the config, please correct it.`
      );
    }
  }
}

export function isItem(item: any): item is Item<any> {
  return item && typeof item.opcode === "string";
}

async function setBytecode(
  contractInfo: ContractInfo,
  artifacts: Artifacts,
  addressThis: string,
  vm: VM
) {
  if (typeof contractInfo === "string") {
    if (ethers.utils.isHexString(contractInfo)) {
      // directly bytecode was given
      return contractInfo;
    } else {
      // name was given
      contractInfo = {
        name: contractInfo,
      };
    }
  }

  // its possible artifacts are not compiled here
  let artifact;
  try {
    artifact = artifacts.readArtifactSync(contractInfo.name);
  } catch {
    console.warn(
      `[hardhat-tracer]: Could not find artifact for ${contractInfo.name} specified in stateOverrides.`
    );
    return;
  }
  let bytecode = artifact.deployedBytecode;

  if (bytecode.startsWith("0x730000000000000000000000000000000000000000")) {
    // this is a library, so we need to replace the placeholder address
    bytecode = "0x73" + addressThis.slice(2) + bytecode.slice(44);
  }

  if (artifact.deployedLinkReferences) {
    const paths = Object.keys(artifact.deployedLinkReferences);
    for (const path of paths) {
      const libraryNames = Object.keys(artifact.deployedLinkReferences[path]);
      for (const libraryName of libraryNames) {
        const fullName = path + ":" + libraryName;

        let libraryInfo =
          contractInfo.libraries?.[libraryName] ??
          contractInfo.libraries?.[fullName];

        if (!libraryInfo) {
          // add guess for library, if it's available in the same repo
          libraryInfo = {
            name: fullName,
          };
          // throw new Error(
          //   `[hardhat-tracer]: Library ${libraryName} not found in libraries object for ${contractInfo.name}`
          // );
        }

        let addressToLink;

        if (
          typeof libraryInfo === "string" &&
          ethers.utils.isHexString(libraryInfo) &&
          libraryInfo.length === 42
        ) {
          // address was given for library
          addressToLink = libraryInfo;
        } else {
          // since we don't have an address for library, lets generate a random one
          addressToLink = ethers.utils.id(fullName).slice(0, 42);
          await setBytecode(libraryInfo, artifacts, addressToLink, vm);
        }

        // we have the address of library now, so let's link it
        bytecode = bytecode.replace(
          new RegExp(
            `__\\$${ethers.utils.id(fullName).slice(2, 36)}\\$__`,
            "g"
          ),
          addressToLink.replace(/^0x/, "").toLowerCase()
        );
      }
    }
  }

  if (!ethers.utils.isHexString(bytecode)) {
    throw new Error(
      `[hardhat-tracer]: Invalid bytecode specified in stateOverrides for ${contractInfo.name}: ${bytecode}`
    );
  }

  // set the bytecode
  await vm.stateManager.putContractCode(
    Address.fromString(addressThis),
    Buffer.from(bytecode.slice(2), "hex")
  );
}

export async function applyStateOverrides(
  stateOverrides: StateOverrides,
  vm: VM,
  artifacts: Artifacts
) {
  for (const [_address, overrides] of Object.entries(stateOverrides)) {
    if (!ethers.utils.isAddress(_address)) {
      throw new Error(
        `[hardhat-tracer]: Invalid address ${_address} in stateOverrides`
      );
    }

    const address = Address.fromString(_address);
    // for balance and nonce
    if (overrides.balance !== undefined || overrides.nonce !== undefined) {
      const account = await vm.stateManager.getAccount(address);
      if (overrides.nonce !== undefined) {
        account.nonce = BigNumber.from(overrides.nonce).toBigInt();
      }
      if (overrides.balance) {
        account.balance = BigNumber.from(overrides.balance).toBigInt();
      }
      await vm.stateManager.putAccount(address, account);
    }

    // for bytecode
    if (overrides.bytecode) {
      await setBytecode(overrides.bytecode, artifacts, _address, vm);
    }

    // for storage slots
    if (overrides.storage) {
      for (const [key, value] of Object.entries(overrides.storage)) {
        await vm.stateManager.putContractStorage(
          address,
          Buffer.from(
            hexZeroPad(BigNumber.from(key).toHexString(), 32).slice(2),
            "hex"
          ),
          Buffer.from(
            hexZeroPad(BigNumber.from(value).toHexString(), 32).slice(2),
            "hex"
          )
        );
      }
    }
  }
}

export async function fetchContractName(
  to: string,
  dependencies: TracerDependencies
) {
  const { cache } = dependencies.tracerEnv._internal;
  const cacheResult = cache.contractNames.get(to);
  if (cacheResult) {
    if (cacheResult === "unknown") {
      return undefined;
    }
    return cacheResult;
  }

  let name = await fetchContractNameFromMethodName(
    to,
    "symbol",
    dependencies.provider
  );
  if (!name) {
    name = await fetchContractNameFromMethodName(
      to,
      "name",
      dependencies.provider
    );
  }

  if (name) {
    // format the name a bit
    name = name.split(" ").join("");
  }
  // set the cache, so we don't do the request again
  cache.contractNames.set(to, name ?? "unknown");
  cache.save();
  return name;
}

export async function fetchContractNameFromMethodName(
  to: string,
  methodName: string,
  provider: ProviderLike
): Promise<string | undefined> {
  const iface1 = new Interface([
    `function ${methodName}() public view returns (string)`,
  ]);
  let result1;
  try {
    result1 = await provider.send("eth_call", [
      {
        to,
        data: iface1.encodeFunctionData(methodName, []),
      },
    ]);
    const d = iface1.decodeFunctionResult(methodName, result1);
    return d[0];
  } catch {
    try {
      const iface2 = new Interface([
        `function ${methodName}() public view returns (bytes32)`,
      ]);
      const d = iface2.decodeFunctionResult(methodName, result1);
      const bytes32 = d[0];
      return ethers.utils.toUtf8String(bytes32);
    } catch {}
  }
  return undefined;
}

export async function fetchContractDecimals(
  to: string,
  provider: ProviderLike
): Promise<number | undefined> {
  const iface1 = new Interface([
    `function decimals() public view returns (uint8)`,
  ]);
  let result1;
  try {
    result1 = await provider.send("eth_call", [
      {
        to,
        data: iface1.encodeFunctionData("decimals", []),
      },
    ]);
    const d = iface1.decodeFunctionResult("decimals", result1);
    return d[0];
  } catch {}
  return undefined;
}

export async function fetchContractNameUsingArtifacts(
  address: string,
  dependencies: TracerDependencies
): Promise<string | undefined> {
  const toBytecode = await dependencies.provider.send("eth_getCode", [address]);
  const names = await dependencies.artifacts.getAllFullyQualifiedNames();
  for (const name of names) {
    const _artifact = await dependencies.artifacts.readArtifact(name);

    // try to find the contract name
    if (
      compareBytecode(_artifact.deployedBytecode, toBytecode) > 0.5 ||
      (address === ethers.constants.AddressZero && toBytecode.length <= 2)
    ) {
      // if bytecode of "to" is the same as the deployed bytecode
      // we can use the artifact name
      return _artifact.contractName;
    }
  }
}

export async function getBetterContractName(
  address: string,
  dependencies: TracerDependencies
): Promise<string | undefined> {
  // 1. See if nameTag exists already
  const nameTag = getFromNameTags(address, dependencies);
  if (nameTag) {
    return nameTag;
  }

  // 2. See if there is a name() method that gives string or bytes32
  dependencies.tracerEnv.enabled = false; // disable tracer to avoid tracing these calls
  const contractNameFromNameMethod = await fetchContractName(
    address,
    dependencies
  );
  dependencies.tracerEnv.enabled = true; // enable tracer back

  if (contractNameFromNameMethod) {
    dependencies.tracerEnv.nameTags[address] = contractNameFromNameMethod;
    return contractNameFromNameMethod;
  }

  // 3. Match bytecode
  const contractNameFromArtifacts = await fetchContractNameUsingArtifacts(
    address,
    dependencies
  );
  if (contractNameFromArtifacts) {
    dependencies.tracerEnv.nameTags[address] = contractNameFromArtifacts;
    return contractNameFromArtifacts;
  }
}

export interface Item<Params> {
  opcode: string;
  params: Params;
  parent?: Item<Params>;
  children?: Item<Params>[];
  format?: () => string;
}

export type AwaitedItem<T> = {
  isAwaitedItem: true;
  next: number;
  parse: (step: InterpreterStep, currentAddress?: string) => Item<T>;
};

export interface CallItem extends Item<CALL> {
  opcode: CALL_OPCODES;
  children: Item<any>[];
}

export const callOpcodes = [
  "CALL",
  "STATICCALL",
  "DELEGATECALL",
  "CALLCODE",
  "CREATE",
  "CREATE2",
] as const;

export type CALL_OPCODES =
  | "CALL"
  | "STATICCALL"
  | "DELEGATECALL"
  | "CALLCODE"
  | "CREATE"
  | "CREATE2";

export function isCallItem(item: Item<any>): item is CallItem {
  return callOpcodes.includes(item.opcode as CALL_OPCODES);
}
