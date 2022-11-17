import { InterpreterStep } from "@nomicfoundation/ethereumjs-evm";
import { formatLog } from "../../format/log";
import { TracerDependencies } from "../../types";
import {
  hexPrefix,
  parseHex,
  parseNumber,
  shallowCopyStack2,
} from "../../utils";
import { Item } from "../transaction";
import { LOG } from "./log";

export interface LOG2 extends LOG {
  topics: [string, string];
}

function parse(step: InterpreterStep, currentAddress?: string): Item<LOG2> {
  if (!currentAddress) {
    throw new Error("currentAddress is required for log to be recorded");
  }

  const stack = shallowCopyStack2(step.stack);
  if (stack.length < 4) {
    throw new Error("Faulty LOG2");
  }

  const dataOffset = parseNumber(stack.pop()!);
  const dataSize = parseNumber(stack.pop()!);
  const topic0 = parseHex(stack.pop()!);
  const topic1 = parseHex(stack.pop()!);

  const data = hexPrefix(
    step.memory.slice(dataOffset, dataOffset + dataSize).toString("hex")
  );

  return {
    opcode: "LOG2",
    params: {
      data,
      topics: [topic0, topic1],
      address: currentAddress,
    },
    format(): string {
      throw new Error("Not implemented directly");
    },
  };
}

export default { parse };
