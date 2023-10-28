import { InterpreterStep } from "@nomicfoundation/ethereumjs-evm";

import { AwaitedItem, Item } from "../types";
import {
  colorKey,
  colorLabel,
  colorValue,
  parseBytes32,
  parseNumber,
} from "../utils";

export interface SHA3 {
  offset: number;
  size: number;
  data: string;
  hash: string;
}

function parse(step: InterpreterStep): AwaitedItem<SHA3> {
  const offset = parseNumber(step.stack[step.stack.length - 1].toString(16));
  const size = parseNumber(step.stack[step.stack.length - 2].toString(16));
  const data = step.memory.slice(offset, offset + size).toString("hex");

  const next = 1; // get stack just after this opcode
  return {
    isAwaitedItem: true,
    next,
    parse: (stepNext: InterpreterStep) => ({
      opcode: "SHA3",
      params: {
        offset,
        size,
        data,
        hash: parseBytes32(stepNext.stack[step.stack.length - 1].toString(16)),
      },
      format(): string {
        return format(this);
      },
    }),
  };
}

function format(item: Item<SHA3>): string {
  return `${colorLabel("[SHA3]")} ${colorKey(item.params.data)} → ${colorValue(
    item.params.hash
  )}`;
}

export default { parse, format };
