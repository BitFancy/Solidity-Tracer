import chalk from "chalk";
import { DEPTH_INDENTATION } from "../../constants";
import { StructLog, TracerDependenciesExtended } from "../../types";
import {
  parseHex,
  parseMemory,
  parseNumber,
  shallowCopyStack,
} from "../../utils";
import { formatParam } from "../format/param";
import { printGasCost } from "../print-gas-cost";

export async function printSload(
  structLog: StructLog,
  dependencies: TracerDependenciesExtended
) {
  const stack = shallowCopyStack(structLog.stack);
  if (stack.length <= 2) {
    console.log("Faulty SLOAD");
    return;
  }
  const key = parseHex(stack.pop()!);
  const value = parseHex(stack.pop()!);

  const str = `${chalk.blueBright(key)} => (${formatParam(
    value,
    dependencies
  )})`;
  console.log(
    DEPTH_INDENTATION.repeat(structLog.depth) +
      "SLOAD " +
      str +
      printGasCost(structLog, null, dependencies)
  );
}