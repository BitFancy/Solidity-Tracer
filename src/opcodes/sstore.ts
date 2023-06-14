import { InterpreterStep } from "@nomicfoundation/ethereumjs-evm";

import { Item } from "../types";
import { colorKey, colorLabel, colorValue, parseBytes32 } from "../utils";

export interface SSTORE {
  key: string;
  value: string;
}

function parse(step: InterpreterStep): Item<SSTORE> {
  return {
    opcode: "SSTORE",
    params: {
      key: parseBytes32(step.stack[step.stack.length - 1].toString(16)),
      value: parseBytes32(step.stack[step.stack.length - 2].toString(16)),
    },
    format(): string {
      return format(this);
    },
  };
}

function format(item: Item<SSTORE>): string {
  return `${colorLabel("[SSTORE]")} ${colorKey(item.params.key)} ← ${colorValue(
    item.params.value
  )}`;
}

export default { parse, format };
