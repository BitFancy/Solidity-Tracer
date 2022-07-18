import { hexlify } from "ethers/lib/utils";

import { colorLabel } from "../colors";
import { DEPTH_INDENTATION } from "../constants";
import { StructLog, TracerDependenciesExtended } from "../types";
import {
  findNextStructLogInDepth,
  parseAddress,
  parseMemory,
  parseNumber,
  parseUint,
  shallowCopyStack,
} from "../utils";
import { formatCall } from "../format/call";
import { formatGasCost } from "../format/gas-cost";

export async function printDelegateCall(
  structLog: StructLog,
  index: number,
  structLogs: StructLog[],
  dependencies: TracerDependenciesExtended
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length < 6) {
    console.log("Faulty DELEGATECALL");
    return;
  }

  const gas = parseUint(stack.pop()!);
  const to = parseAddress(stack.pop()!);
  // hardhat console.log address
  if (to === "0x000000000000000000636f6e736f6c652e6c6f67") {
    return;
  }
  const argsOffset = parseNumber(stack.pop()!);
  const argsSize = parseNumber(stack.pop()!);
  const retOffset = parseNumber(stack.pop()!);
  const retSize = parseNumber(stack.pop()!);

  const memory = parseMemory(structLog.memory);
  const input = hexlify(memory.slice(argsOffset, argsOffset + argsSize));

  // return data
  const [structLogNext, structLogNextNext] = findNextStructLogInDepth(
    structLogs,
    structLog.depth,
    index + 1 // find next structLog in the same depth
  );
  const ret = hexlify(
    parseMemory(structLogNext.memory).slice(retOffset, retOffset + retSize)
  );

  const str = await formatCall(to, input, ret, 0, gas, dependencies);
  console.log(
    DEPTH_INDENTATION.repeat(structLog.depth) +
      colorLabel("DELEGATECALL") +
      " " +
      str +
      formatGasCost(
        structLog,
        structLog.gas - structLogNextNext.gas,
        dependencies
      )
  );
}
