import { InterpreterStep } from "@nomicfoundation/ethereumjs-evm";

import { Item } from "../types";
import {
  colorLabel,
  colorMstore,
  colorValue,
  parseBytes32,
  shallowCopyStack2,
} from "../utils";

export interface MSTORE {
  offset: string;
  value: string;
}

function parse(step: InterpreterStep): Item<MSTORE> {
  const stack = shallowCopyStack2(step.stack);
  if (stack.length < 2) {
    throw new Error("[hardhat-tracer]: Faulty MSTORE");
  }

  const offset = parseBytes32(stack.pop()!);
  const value = parseBytes32(stack.pop()!);

  return {
    opcode: "MSTORE",
    params: {
      offset,
      value,
    },
  };
}

function format(item: Item<MSTORE>): string {
  return `${colorLabel("[MSTORE]")} ${colorMstore(
    item.params.offset
  )} ← ${colorValue(item.params.value)}`;
}

export default { parse, format };
